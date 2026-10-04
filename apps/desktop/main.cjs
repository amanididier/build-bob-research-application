// Bob Research Companion - Desktop Main Process
// Bundles modern React/Vite app with native auto-updates and real Bob mascot icon.
const { app, BrowserWindow, shell, ipcMain, session, dialog } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')

let autoUpdater = null
try {
  const updaterModule = require('electron-updater')
  autoUpdater = updaterModule.autoUpdater
} catch (e) {
  console.log('electron-updater not loaded:', e.message)
}

const PORT = 54321
const UPDATE_CHECK_DELAY_MS = 4000
const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 1000
const UPDATE_CHECK_FOCUS_THROTTLE_MS = 60 * 1000
const TOKEN = process.env.BOB_BRIDGE_TOKEN || 'development-token'
const WEB_URL = process.env.BOB_WEB_URL || 'https://build-bob-research-application.vercel.app'

let win = null
let storePath = null
let bridgeListening = false
let pendingPanelRequest = null
const PANEL_REQUEST_TTL_MS = 5 * 60 * 1000

// Per-desktop-install pairing secret. The extension exchanges the shared
// bootstrap token for this once, so a downloaded extension binds to *this*
// install. The bootstrap token is always still accepted, so pairing can never
// lock out an extension that has not paired yet.
let pairingToken = null
let updateState = {
  status: 'idle',
  version: app.getVersion(),
  message: 'Up to date'
}
let store = {
  projects: [{ id: 'default', name: 'AI research companion', color: 'violet' }],
  notes: [
    { id: '1', title: 'Transport booking friction', body: 'Users abandon booking when price or seat is not transparent.', url: 'research.example.com', at: Date.now() - 3600000 },
    { id: '2', title: 'Attention mechanisms', body: 'Sub-400MB RAM footprints enable responsive local LLMs on 4GB PCs.', url: 'arxiv.org/abs/1706.03762', at: Date.now() - 7200000 }
  ],
  sources: [
    { id: 's1', title: 'Transport booking research', url: 'research.example.com/transport-booking', at: Date.now() },
    { id: 's2', title: 'Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762', at: Date.now() }
  ],
  captures: [],
  tabs: {},
  messages: []
}

function log(...args) {
  try {
    const logPath = path.join(app.getPath('userData'), 'bob.log')
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${args.join(' ')}\n`)
  } catch {}
  console.log(...args)
}

function loadStore() {
  storePath = path.join(app.getPath('userData'), 'bob-workspace.json')
  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'))
      store = { ...store, ...data }
    }
    if (!store.geminiKey && (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)) {
      store.geminiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim()
    }
    if (!store.verifiedModel) store.verifiedModel = 'gemini-3.1-flash-lite'
    if (!store.settingsVersion) store.settingsVersion = 1
    if (typeof store.activeGoal !== 'string') store.activeGoal = ''
    if (!store.theme) store.theme = 'light'
  } catch (err) {
    log('Load store failed:', err.message)
  }
}

function saveStore() {
  try {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2))
  } catch (e) {
    log('Save store failed:', e.message)
  }
}

function notify() {
  if (win && !win.isDestroyed()) {
    win.webContents.send('bob:changed')
  }
}

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// Read (or first-run generate) the per-install pairing secret.
function loadPairingToken() {
  const file = path.join(app.getPath('userData'), 'bob-pairing.json')
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (parsed && typeof parsed.token === 'string' && parsed.token.length >= 16) {
        pairingToken = parsed.token
        return
      }
    }
  } catch (err) {
    log('Read pairing token failed:', err.message)
  }
  pairingToken = crypto.randomBytes(24).toString('hex')
  try {
    fs.writeFileSync(file, JSON.stringify({ token: pairingToken, createdAt: Date.now() }, null, 2))
  } catch (err) {
    log('Write pairing token failed:', err.message)
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 2e6) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'))
      } catch {
        resolve({})
      }
    })
  })
}

// Local bridge used by the Chrome browser extension.
function startBridge() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Private-Network', 'true')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Bob-Token, X-Bob-Client, Authorization, Access-Control-Request-Private-Network')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, X-Bob-Token, X-Bob-Client, Authorization, Access-Control-Request-Private-Network',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE'
      })
      return res.end()
    }

    const send = (code, obj) => {
      res.writeHead(code, {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Private-Network': 'true'
      })
      res.end(JSON.stringify(obj))
    }

    const pathname = (req.url || '').split('?')[0]
    const clientHeader = req.headers['x-bob-client'] || ''
    const isExtensionClient = clientHeader.includes('extension') || pathname === '/events/extension-ping'

    // Dedicated extension heartbeat ping
    if (pathname === '/events/extension-ping') {
      store.extensionConnected = true
      store.lastExtensionContact = Date.now()
      notify()
      return send(200, {
        ok: true,
        connected: true,
        timestamp: Date.now(),
        version: app.getVersion(),
        geminiKey: store.geminiKey || process.env.GEMINI_API_KEY || '',
        verifiedModel: store.verifiedModel || 'gemini-3.1-flash-lite',
        settingsVersion: store.settingsVersion || 1,
        activeGoal: store.activeGoal || '',
        theme: store.theme || 'light',
        updateState,
        updateStatus: updateState.status,
        updateVersion: updateState.version || null,
        readyToRestart: updateState.status === 'ready',
        isDownloading: updateState.status === 'downloading',
        isAvailable: updateState.status === 'available',
        updatePercent: updateState.percent || 0
      })
    }

    // Extension auto-sync folder
    if (pathname === '/events/extension-folder') {
      const extDir = path.join(app.getPath('userData'), 'chrome-extension')
      if (req.method === 'POST') {
        try {
          if (!fs.existsSync(extDir)) syncExtensionFilesToUserData()
          shell.openPath(extDir)
          return send(200, { ok: true, opened: true, path: extDir })
        } catch (e) {
          return send(500, { ok: false, error: e.message })
        }
      }
      return send(200, { ok: true, path: extDir })
    }

    // Settings sync (Extension <-> Desktop)
    if (pathname === '/events/settings') {
      if (req.method === 'POST') {
        if (body.geminiKey !== undefined) store.geminiKey = String(body.geminiKey || '').trim()
        if (body.verifiedModel) store.verifiedModel = String(body.verifiedModel).trim()
        if (body.activeGoal !== undefined) store.activeGoal = String(body.activeGoal || '').trim()
        if (body.theme) store.theme = String(body.theme).trim()
        store.settingsVersion = (store.settingsVersion || 1) + 1
        saveStore()
        notify()
      }
      return send(200, {
        ok: true,
        geminiKey: store.geminiKey || process.env.GEMINI_API_KEY || '',
        verifiedModel: store.verifiedModel || 'gemini-3.1-flash-lite',
        settingsVersion: store.settingsVersion || 1,
        activeGoal: store.activeGoal || '',
        theme: store.theme || 'light',
        desktopVersion: app.getVersion()
      })
    }

    // Remote Gemini Execution for Extension (Desktop is single source of truth for Key & Model)
    if (pathname === '/events/generate') {
      const key = (store.geminiKey || process.env.GEMINI_API_KEY || '').trim()
      if (!key) {
        return send(200, {
          ok: false,
          reason: 'no-key',
          message: 'No Gemini API key saved in Bob Desktop Settings.'
        })
      }

      const prompt = body.prompt || ''
      const systemInstruction = body.systemInstruction || ''
      const jsonMode = Boolean(body.jsonMode)
      const requestedModel = body.model || store.verifiedModel || 'gemini-3.1-flash-lite'

      let candidateModels = [
        requestedModel,
        store.verifiedModel,
        'gemini-2.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash'
      ].filter(Boolean)
      let uniqueModels = [...new Set(candidateModels)]

      let lastError = null
      let lastStatus = 500
      let lastErrorBody = ''
      let isNetworkError = false

      // Helper function to attempt generation with a given model
      const tryModel = async (model) => {
        try {
          const payload = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          }
          if (systemInstruction) {
            payload.systemInstruction = {
              parts: [{ text: typeof systemInstruction === 'string' ? systemInstruction : JSON.stringify(systemInstruction) }]
            }
          }
          if (jsonMode) {
            payload.generationConfig = { responseMimeType: 'application/json' }
          }

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-goog-api-key': key
            },
            body: JSON.stringify(payload)
          })

          lastStatus = res.status
          if (!res.ok) {
            const errRaw = await res.text().catch(() => '')
            lastErrorBody = errRaw.slice(0, 300)
            // Log raw HTTP status and error body safely without exposing API key
            console.log(`[Bob Gemini Request] Model: ${model} | HTTP Status: ${res.status} | Body: ${lastErrorBody}`)
            
            if (res.status === 404) {
              lastError = `model-${model}-not-found`
              return { success: false, notFound: true }
            }
            if (res.status === 400 || res.status === 401 || res.status === 403) {
              return {
                fatal: true,
                response: {
                  ok: false,
                  reason: 'bad-key',
                  status: res.status,
                  message: 'Gemini API key rejected or invalid. Please check your Gemini key in Bob Desktop Settings.'
                }
              }
            }
            if (res.status === 429) {
              return {
                fatal: true,
                response: {
                  ok: false,
                  reason: 'rate-limited',
                  status: 429,
                  retryAfter: 30,
                  message: 'Gemini API rate limit reached. Please wait a few seconds and try again.'
                }
              }
            }
            lastError = `http-${res.status}`
            return { success: false }
          }

          const data = await res.json()
          const parts = (((data.candidates || [])[0] || {}).content || {}).parts || []
          const reply = parts.map((p) => p.text || '').join('').trim()
          if (reply) {
            if (store.verifiedModel !== model) {
              store.verifiedModel = model
              store.settingsVersion = (store.settingsVersion || 1) + 1
              saveStore()
              notify()
            }
            return { success: true, reply, model }
          }
          lastError = 'empty-response'
          return { success: false }
        } catch (err) {
          isNetworkError = true
          lastError = (err && err.message) || 'network-error'
          console.log(`[Bob Gemini Request Network Error] Model: ${model} | Error: ${lastError}`)
          return { success: false, network: true }
        }
      }

      // Step 1: Try candidate models
      for (const model of uniqueModels) {
        const result = await tryModel(model)
        if (result.fatal) return send(200, result.response)
        if (result.success) return send(200, { ok: true, reply: result.reply, model: result.model, status: 200 })
      }

      // Step 2: If all models returned 404 (model not found) and not network error, query ListModels endpoint
      if (!isNetworkError) {
        try {
          const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
          if (listRes.ok) {
            const listData = await listRes.json()
            const availableModels = (listData.models || [])
              .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
              .map((m) => m.name.replace(/^models\//, ''))
              .filter((name) => name.toLowerCase().includes('flash'))

            const discoveredModels = availableModels.filter((m) => !uniqueModels.includes(m))
            for (const model of discoveredModels) {
              const result = await tryModel(model)
              if (result.fatal) return send(200, result.response)
              if (result.success) return send(200, { ok: true, reply: result.reply, model: result.model, status: 200 })
            }
            if (discoveredModels.length > 0) {
              uniqueModels = [...uniqueModels, ...discoveredModels]
            }
          }
        } catch {}
      }

      // If network error occurred
      if (isNetworkError) {
        return send(200, {
          ok: false,
          reason: 'network-error',
          status: 0,
          message: 'Network error connecting to Gemini API. Please check your internet connection.'
        })
      }

      return send(200, {
        ok: false,
        reason: 'model-unavailable',
        status: lastStatus,
        triedModels: uniqueModels,
        message: `Model unavailable – tried ${uniqueModels.join(', ')}. Please verify model access in Bob Desktop Settings.`,
        detail: `All candidate models failed (${uniqueModels.join(', ')}). HTTP status: ${lastStatus}`
      })
    }

    // Extension Handshake
    if (pathname === '/events/handshake') {
      store.extensionConnected = true
      store.lastExtensionContact = Date.now()
      saveStore()
      notify()
      return send(200, {
        ok: true,
        connected: true,
        port: PORT,
        version: app.getVersion(),
        token: pairingToken || TOKEN,
        extensionConnected: true,
        lastExtensionContact: store.lastExtensionContact,
        geminiKey: store.geminiKey || process.env.GEMINI_API_KEY || '',
        verifiedModel: store.verifiedModel || 'gemini-3.1-flash-lite',
        settingsVersion: store.settingsVersion || 1,
        activeGoal: store.activeGoal || '',
        theme: store.theme || 'light',
        updateStatus: updateState.status,
        updateVersion: updateState.version || null,
        readyToRestart: updateState.status === 'ready',
        isDownloading: updateState.status === 'downloading',
        isAvailable: updateState.status === 'available',
        updatePercent: updateState.percent || 0,
        at: Date.now()
      })
    }

    // Update status for extension & web app
    if (req.method === 'GET' && pathname === '/events/update-status') {
      return send(200, {
        ok: true,
        desktopVersion: app.getVersion(),
        extensionVersion: '1.2.5',
        updateState,
        readyToRestart: updateState.status === 'ready',
        isDownloading: updateState.status === 'downloading',
        isAvailable: updateState.status === 'available',
        percent: updateState.percent || 0
      })
    }

    // Health check & status verification (Used by Desktop Settings - does not fake extension contact)
    if (req.method === 'GET' && (pathname === '/health' || pathname === '/events/health' || pathname === '/status')) {
      const isRecent = Boolean(store.lastExtensionContact && (Date.now() - store.lastExtensionContact < 10000))
      return send(200, {
        ok: true,
        connected: isRecent,
        extensionConnected: isRecent,
        lastExtensionContact: store.lastExtensionContact || null,
        port: PORT,
        version: app.getVersion(),
        token: TOKEN,
        at: Date.now()
      })
    }

    if (req.method === 'GET' && pathname === '/events/extension-status') {
      const isRecent = Boolean(store.lastExtensionContact && (Date.now() - store.lastExtensionContact < 10000))
      return send(200, {
        ok: true,
        connected: isRecent,
        lastContact: store.lastExtensionContact || null,
        port: PORT
      })
    }

    // 2. Token authentication for event messages
    const providedToken = req.headers['x-bob-token'] || 
      (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '') ||
      '';

    if (providedToken && providedToken !== TOKEN && providedToken !== 'development-token' && providedToken !== pairingToken) {
      const isLoopback = req.socket.remoteAddress === '127.0.0.1' || req.socket.remoteAddress === '::1' || req.socket.remoteAddress === '::ffff:127.0.0.1'
      if (!isLoopback) {
        return send(401, { error: 'Unauthorized bridge request' })
      }
    }

    if (isExtensionClient) {
      store.extensionConnected = true
      store.lastExtensionContact = Date.now()
    }

    if (req.method === 'GET' && pathname === '/events/pending') {
      const fresh = pendingPanelRequest && Date.now() - pendingPanelRequest.at < PANEL_REQUEST_TTL_MS
      const pending = fresh ? pendingPanelRequest : null
      pendingPanelRequest = null
      return send(200, { ok: true, pending })
    }

    if (req.method === 'GET' && pathname === '/events/projects') {
      return send(200, { ok: true, projects: store.projects || [] })
    }

    if (req.method === 'GET' && pathname === '/events/messages') {
      const urlObj = new URL(req.url, 'http://127.0.0.1:54321')
      const proj = urlObj.searchParams.get('project')
      let msgs = store.messages || []
      if (proj) {
        msgs = msgs.filter((m) => m.projectId === proj)
      }
      msgs = [...msgs].sort((a, b) => (a.at || 0) - (b.at || 0))
      return send(200, { ok: true, messages: msgs })
    }

    if (req.method !== 'POST') return send(404, { error: 'Not found' })

    const body = await readBody(req)

    if (pathname === '/events/projects-sync') {
      if (Array.isArray(body.projects)) {
        store.projects = body.projects
        saveStore()
        notify()
      }
      return send(200, { ok: true, projects: store.projects })
    }

    if (pathname === '/events/messages-sync') {
      if (Array.isArray(body.messages)) {
        const existingIds = new Set((store.messages || []).map((m) => m.id))
        for (const m of body.messages) {
          if (!existingIds.has(m.id)) {
            store.messages.push(m)
            existingIds.add(m.id)
          }
        }
        store.messages = store.messages.slice(-500)
        saveStore()
        notify()
      }
      return send(200, { ok: true, count: store.messages.length })
    }

    if (pathname === '/events/pending') {
      pendingPanelRequest = { at: Date.now(), version: app.getVersion() }
      return send(200, { ok: true, queued: true })
    }

    if (pathname === '/events/projects') {
      const newProj = {
        id: body.id || id(),
        name: String(body.name || 'New Research').slice(0, 100),
        color: body.color || 'blue',
        createdAt: Date.now()
      }
      store.projects = [...(store.projects || []), newProj]
      saveStore()
      notify()
      return send(200, { ok: true, project: newProj, projects: store.projects })
    }

    if (pathname === '/events/pair' || pathname === '/events/handshake') {
      // Extension exchanges the shared bootstrap token for this install's
      // unique pairing secret, so a downloaded extension binds to *this*
      // desktop. Idempotent, and the bootstrap token always stays valid.
      return send(200, {
        ok: true,
        token: pairingToken,
        version: app.getVersion(),
        geminiKey: store.geminiKey || process.env.GEMINI_API_KEY || ''
      })
    }

    if (pathname === '/events/key') {
      if (body && typeof body.key === 'string') {
        store.geminiKey = body.key.trim()
        saveStore()
      }
      return send(200, { ok: true, key: store.geminiKey || process.env.GEMINI_API_KEY || '' })
    }

    if (pathname === '/events/desktop-update') {
      if (body && body.action === 'install') {
        if (autoUpdater) {
          setTimeout(() => autoUpdater.quitAndInstall(false, true), 300)
          return send(200, { ok: true, restarting: true })
        }
      }
      if (body && body.action === 'download') {
        if (autoUpdater && app.isPackaged) {
          autoUpdater.downloadUpdate().catch(() => {})
          return send(200, { ok: true, downloading: true })
        }
      }
      return send(200, { ok: true, updateState })
    }

    if (pathname === '/events/chat') {
      // Mirror a Chrome-extension chat exchange into the desktop session.
      const at = Date.now()
      if (body.prompt) {
        store.messages.push({
          id: body.promptId || id(),
          role: 'user',
          text: String(body.prompt).slice(0, 20000),
          origin: 'chrome-extension',
          projectId: body.projectId || null,
          at
        })
      }
      if (body.reply) {
        store.messages.push({
          id: body.replyId || id(),
          role: 'assistant',
          text: String(body.reply).slice(0, 20000),
          origin: 'chrome-extension',
          projectId: body.projectId || null,
          at: at + 1
        })
      }
      store.messages = store.messages.slice(-500)
      saveStore()
      notify()
      return send(200, { ok: true })
    }

    if (pathname === '/events/focus') {
      // Sent by the Chrome extension when the user clicks the Desktop button there.
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore()
        win.setAlwaysOnTop(true)
        win.show()
        win.focus()
        setTimeout(() => {
          if (win && !win.isDestroyed()) win.setAlwaysOnTop(false)
        }, 350)
      }
      return send(200, { ok: true, focused: true })
    }

    if (pathname === '/events/tab' || pathname === '/api/tabs') {
      const key = String(body.tabId ?? body.url ?? id())
      const tabItem = {
        id: key,
        title: String(body.title ?? ''),
        url: String(body.url ?? ''),
        favicon: body.favicon || body.favIconUrl,
        favIconUrl: body.favicon || body.favIconUrl,
        at: Date.now(),
      }
      store.tabs[key] = tabItem
      store.sources = store.sources || []
      if (body.url && !store.sources.some(s => s.url === body.url)) {
        store.sources.unshift({
          id: id(),
          title: String(body.title || body.url),
          url: String(body.url),
          at: Date.now()
        })
        store.sources = store.sources.slice(0, 500)
      }
    } else if (pathname === '/events/note' || pathname === '/events/ask' || pathname === '/api/notes') {
      const isAsk = pathname.endsWith('ask')
      const text = String(body.selectedText || body.text || '').slice(0, 20000)
      const url = String(body.url || body.sourceUrl || '')
      const title = String(body.title || body.pageTitle || body.sourceTitle || (isAsk ? 'Prompt from Extension' : 'Web Note'))

      const newNote = {
        id: id(),
        title: title,
        selectedText: text,
        body: text,
        sourceTitle: title,
        sourceUrl: url,
        url: url,
        at: Date.now(),
        createdAt: new Date().toISOString(),
        relevance: 95,
        color: body.color || 'emerald',
        kind: isAsk ? 'ask' : 'highlight'
      }

      store.captures.unshift(newNote)
      store.captures = store.captures.slice(0, 500)

      store.notes = store.notes || []
      store.notes.unshift(newNote)
      store.notes = store.notes.slice(0, 500)
    } else {
      return send(404, { error: 'Route not found' })
    }

    saveStore()
    notify()
    send(200, { ok: true, synced: true })
  })

  server.on('error', (e) => {
    bridgeListening = false
    log('Bridge error:', e.message)
  })
  server.on('close', () => {
    bridgeListening = false
  })
  server.listen(PORT, '127.0.0.1', () => {
    bridgeListening = true
    log('Bridge listening on port:', PORT)
  })
}

function setupAutoUpdater() {
  if (!autoUpdater) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const sendStatus = (statusObj) => {
    updateState = { ...updateState, ...statusObj }
    if (win && !win.isDestroyed()) {
      win.webContents.send('bob:updateStatus', updateState)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ status: 'checking', message: 'Checking for updates...' })
  })

  autoUpdater.on('update-available', (info) => {
    sendStatus({
      status: 'available',
      version: info.version,
      percent: 0,
      message: `Update v${info.version} available`
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    sendStatus({
      status: 'latest',
      version: app.getVersion(),
      message: `You are on the latest version (v${app.getVersion()})`
    })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent || 0)
    sendStatus({
      status: 'downloading',
      percent,
      message: `Downloading update: ${percent}%`
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    try {
      syncExtensionFilesToUserData()
    } catch (e) {
      log('Extension auto-sync on update failed:', e.message)
    }
    sendStatus({
      status: 'ready',
      version: info.version,
      message: `Version ${info.version} is ready! Restart to apply.`
    })
  })

  autoUpdater.on('error', (err) => {
    log('Auto-updater error:', err ? (err.message || String(err)) : '')
    sendStatus({
      status: 'error',
      message: err ? (err.message || String(err)) : 'Unable to check updates'
    })
  })

  // Check dynamically on startup if packaged
  if (app.isPackaged) {
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdates().catch((err) => {
          log('Auto-update check error:', err.message)
        })
      } catch (e) {
        log('Auto-updater startup exception:', e.message)
      }
    }, UPDATE_CHECK_DELAY_MS)
  }

  // Periodic re-check so a release published while the app is open is picked up
  setInterval(() => {
    if (app.isPackaged && autoUpdater) {
      autoUpdater.checkForUpdates().catch((err) => {
        log('Periodic update check error:', err.message)
      })
    }
  }, UPDATE_CHECK_INTERVAL_MS)

  // Re-check when the window regains focus so a freshly published release shows up
  // as soon as the user comes back to the app, without waiting for the interval.
  let lastFocusCheck = 0
  win.on('focus', () => {
    const now = Date.now()
    if (app.isPackaged && autoUpdater && now - lastFocusCheck > UPDATE_CHECK_FOCUS_THROTTLE_MS) {
      lastFocusCheck = now
      autoUpdater.checkForUpdates().catch((err) => {
        log('Focus update check error:', err.message)
      })
    }
  })
}

function registerIpc() {
  ipcMain.handle('bob:get', () => store)

  // The renderer keeps the user's Gemini key in localStorage; push it into the
  // persisted store so the local bridge can hand it to the Chrome extension.
  ipcMain.handle('bob:setGeminiKey', (_e, key) => {
    store.geminiKey = String(key || '').trim()
    store.settingsVersion = (store.settingsVersion || 1) + 1
    saveStore()
    notify()
    return { ok: true, hasKey: Boolean(store.geminiKey), settingsVersion: store.settingsVersion }
  })

  ipcMain.handle('bob:setVerifiedModel', (_e, model) => {
    store.verifiedModel = String(model || 'gemini-3.1-flash-lite').trim()
    store.settingsVersion = (store.settingsVersion || 1) + 1
    saveStore()
    notify()
    return { ok: true, verifiedModel: store.verifiedModel, settingsVersion: store.settingsVersion }
  })

  ipcMain.handle('bob:setActiveGoal', (_e, goal) => {
    store.activeGoal = String(goal || '').trim()
    store.settingsVersion = (store.settingsVersion || 1) + 1
    saveStore()
    notify()
    return { ok: true, activeGoal: store.activeGoal, settingsVersion: store.settingsVersion }
  })

  ipcMain.handle('bob:getSettings', () => ({
    geminiKey: store.geminiKey || '',
    verifiedModel: store.verifiedModel || 'gemini-3.1-flash-lite',
    settingsVersion: store.settingsVersion || 1,
    activeGoal: store.activeGoal || '',
    theme: store.theme || 'light',
    desktopVersion: app.getVersion()
  }))

  ipcMain.handle('bob:add', (_e, kind, item) => {
    if (!['notes', 'sources', 'projects', 'messages'].includes(kind)) return store
    store[kind].unshift({ id: id(), at: Date.now(), ...item })
    saveStore()
    return store
  })

  ipcMain.handle('bob:remove', (_e, kind, itemId) => {
    if (Array.isArray(store[kind])) {
      store[kind] = store[kind].filter((x) => x.id !== itemId)
    }
    saveStore()
    return store
  })

  ipcMain.handle('bob:openWeb', (_e, sub = '') => {
    shell.openExternal(WEB_URL + String(sub))
  })

  // Chrome only lets an extension open its side panel from a real user gesture,
  // so the desktop queues a request and activates/launches Chrome.
  ipcMain.handle('bob:requestExtensionPanel', () => {
    pendingPanelRequest = { at: Date.now(), version: app.getVersion() }
    try {
      const { exec } = require('child_process')
      if (process.platform === 'win32') {
        const psCmd = `$p = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1; if ($p) { (New-Object -ComObject WScript.Shell).AppActivate($p.Id) } else { Start-Process chrome.exe }`
        exec(`powershell -NoProfile -NonInteractive -Command "${psCmd}"`, (err) => {
          if (err) {
            exec('start chrome', () => {})
          }
        })
      } else if (process.platform === 'darwin') {
        exec('osascript -e \'tell application "Google Chrome" to activate\'', () => {})
      } else {
        exec('google-chrome || chromium-browser || xdg-open "about:blank"', () => {})
      }
    } catch (e) {
      log('Chrome activation error:', e)
    }
    return { ok: true, bridgeListening, queued: true }
  })

  // True when the Chrome extension has pinged the bridge within the last 10 seconds.
  ipcMain.handle('bob:extensionAlive', () => {
    const alive = Boolean(store.lastExtensionContact && (Date.now() - store.lastExtensionContact < 10000))
    return { alive, bridgeListening, lastSeen: store.lastExtensionContact || null }
  })

  ipcMain.handle('bob:syncProjects', (_e, projects) => {
    if (Array.isArray(projects)) {
      store.projects = projects
      saveStore()
      notify()
    }
    return store.projects || []
  })

  ipcMain.handle('bob:syncMessages', (_e, messages) => {
    if (Array.isArray(messages)) {
      const existingIds = new Set((store.messages || []).map((m) => m.id))
      for (const m of messages) {
        if (!existingIds.has(m.id)) {
          store.messages.push(m)
          existingIds.add(m.id)
        }
      }
      store.messages = store.messages.slice(-500)
      saveStore()
    }
    return store.messages || []
  })

  // The renderer is loaded from file://, where fetch() cannot read packaged
  // assets — so the extension archive is written out through a real save dialog.
  ipcMain.handle('bob:downloadExtension', async () => {
    const candidates = [
      path.join(__dirname, '../../dist/bob-chrome-extension.zip'),
      path.join(__dirname, 'dist', 'bob-chrome-extension.zip'),
      path.join(app.getAppPath(), 'dist', 'bob-chrome-extension.zip')
    ]

    const source = candidates.find((file) => {
      try {
        return fs.statSync(file).size > 1024
      } catch (e) {
        return false
      }
    })

    if (!source) {
      log('Extension archive missing from build output')
      return { ok: false, reason: 'missing-archive' }
    }

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save Bob Chrome Extension',
      defaultPath: path.join(app.getPath('downloads'), 'bob-chrome-extension.zip'),
      filters: [{ name: 'Zip archive', extensions: ['zip'] }]
    })

    if (canceled || !filePath) return { ok: false, reason: 'canceled' }

    try {
      fs.writeFileSync(filePath, fs.readFileSync(source))
      return { ok: true, path: filePath, bytes: fs.statSync(filePath).size }
    } catch (e) {
      log('Extension download error:', e.message)
      return { ok: false, reason: 'write-failed', detail: e.message }
    }
  })

  ipcMain.handle('bob:getMemory', () => {
    try {
      const memoryPath = path.join(app.getPath('userData'), 'keza_memory.json')
      if (fs.existsSync(memoryPath)) {
        return JSON.parse(fs.readFileSync(memoryPath, 'utf8'))
      }
    } catch (e) {
      log('Read keza_memory.json error:', e.message)
    }
    return null
  })

  ipcMain.handle('bob:saveMemory', (_e, memoryData) => {
    try {
      const memoryPath = path.join(app.getPath('userData'), 'keza_memory.json')
      fs.writeFileSync(memoryPath, JSON.stringify(memoryData, null, 2), 'utf8')
      return true
    } catch (e) {
      log('Write keza_memory.json error:', e.message)
      return false
    }
  })

  ipcMain.handle('bob:info', () => {
    const totalRamGb = Math.round(os.totalmem() / (1024 * 1024 * 1024))
    const cpuCores = os.cpus().length
    return {
      version: app.getVersion(),
      webUrl: WEB_URL,
      hardware: {
        totalRamGb,
        cpuCores,
        arch: os.arch(),
        platform: os.platform()
      }
    }
  })

  ipcMain.handle('bob:getUpdateState', () => updateState)

  ipcMain.handle('bob:checkExtensionConnection', () => {
    const isRecent = Boolean(store.lastExtensionContact && (Date.now() - store.lastExtensionContact < 10000))
    return {
      connected: Boolean(store.extensionConnected && isRecent),
      lastContact: store.lastExtensionContact || null,
      port: PORT,
      notesCount: (store.notes || []).length,
      tabsCount: Object.keys(store.tabs || {}).length,
    }
  })

  ipcMain.handle('bob:setOnboardingCompleted', (_e, val) => {
    store.onboardingCompleted = Boolean(val)
    saveStore()
    return true
  })

  ipcMain.handle('bob:getOnboardingCompleted', () => {
    return Boolean(store && store.onboardingCompleted)
  })

  ipcMain.handle('bob:checkUpdates', async () => {
    if (!app.isPackaged || !autoUpdater) {
      return {
        status: 'latest',
        version: app.getVersion(),
        message: `Running latest build (v${app.getVersion()})`
      }
    }
    try {
      await autoUpdater.checkForUpdates()
      return updateState
    } catch (err) {
      return { status: 'error', message: err.message || 'Check failed' }
    }
  })

  ipcMain.handle('bob:downloadUpdate', async () => {
    if (autoUpdater && app.isPackaged) {
      try {
        await autoUpdater.downloadUpdate()
        return { status: 'downloading' }
      } catch (err) {
        log('Download update failed:', err.message)
        return { status: 'error', message: err.message }
      }
    }
    return { status: 'idle' }
  })

  ipcMain.handle('bob:installUpdate', () => {
    if (autoUpdater) {
      autoUpdater.quitAndInstall(false, true)
    }
  })

  ipcMain.handle('bob:openExtensionFolder', () => {
    const extDir = path.join(app.getPath('userData'), 'chrome-extension')
    try {
      if (!fs.existsSync(extDir)) syncExtensionFilesToUserData()
      shell.openPath(extDir)
      return { ok: true, path: extDir }
    } catch (e) {
      log('openExtensionFolder failed:', e.message)
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('bob:getExtensionPath', () => {
    return path.join(app.getPath('userData'), 'chrome-extension')
  })

  // Window Controls
  ipcMain.handle('bob:minimize', () => {
    if (win) win.minimize()
  })

  ipcMain.handle('bob:maximize', () => {
    if (!win) return false
    if (win.isMaximized()) {
      win.unmaximize()
      return false
    } else {
      win.maximize()
      return true
    }
  })

  ipcMain.handle('bob:close', () => {
    if (win) win.close()
  })

  ipcMain.handle('bob:isMaximized', () => {
    return win ? win.isMaximized() : false
  })
}

function createWindow() {
  const iconCandidates = [
    path.join(__dirname, 'bob-logo.ico'),
    path.join(__dirname, 'bob-logo.png'),
    path.join(__dirname, 'renderer', 'bob-logo.png'),
    path.join(__dirname, 'dist', 'bob-logo.png'),
    path.join(__dirname, '../../dist', 'bob-logo.png'),
    path.join(__dirname, '../../public', 'bob-logo.png')
  ]
  let iconPath = iconCandidates.find((p) => fs.existsSync(p))
  if (process.platform === 'win32') {
    const icoCandidate = path.join(__dirname, 'bob-logo.ico')
    if (fs.existsSync(icoCandidate)) iconPath = icoCandidate
  }

  // Explicitly grant microphone permissions so speech-to-text / dictation streams cleanly
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'media') return true
    return true
  })
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') return callback(true)
    callback(true)
  })

  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 650,
    title: 'Bob',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    backgroundColor: '#0f1115',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
  })

  win.setMenu(null)
  win.once('ready-to-show', () => win.show())

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log('Load failed:', code, desc, url)
  })

  win.webContents.on('did-finish-load', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('bob:updateStatus', updateState)
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the compiled React/Vite web application
  const distCandidates = [
    path.join(__dirname, '../../dist/index.html'),
    path.join(__dirname, 'dist', 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html'),
    path.join(__dirname, 'renderer', 'index.html')
  ];

  let targetPath = path.join(__dirname, '../../dist/index.html');
  for (const candidate of distCandidates) {
    if (fs.existsSync(candidate)) {
      targetPath = candidate;
      log('Loading app from:', targetPath);
      break;
    }
  }
  win.loadFile(targetPath);
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

function syncExtensionFilesToUserData() {
  try {
    const targetDir = path.join(app.getPath('userData'), 'chrome-extension')
    const candidates = [
      path.join(__dirname, '../../chrome-extension'),
      path.join(app.getAppPath(), 'chrome-extension'),
      path.join(__dirname, '../../public/chrome-extension'),
      path.join(app.getAppPath(), 'public', 'chrome-extension'),
      path.join(__dirname, 'chrome-extension')
    ]
    const sourceDir = candidates.find((dir) => {
      try {
        return fs.existsSync(dir) && fs.existsSync(path.join(dir, 'manifest.json'))
      } catch {
        return false
      }
    })
    if (!sourceDir) {
      log('No source chrome-extension directory found to sync')
      return false
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    function copyDirRecursive(src, dest) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
      const entries = fs.readdirSync(src, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
          copyDirRecursive(srcPath, destPath)
        } else {
          try {
            const srcBuf = fs.readFileSync(srcPath)
            if (!fs.existsSync(destPath) || !fs.readFileSync(destPath).equals(srcBuf)) {
              fs.writeFileSync(destPath, srcBuf)
            }
          } catch (e) {
            fs.copyFileSync(srcPath, destPath)
          }
        }
      }
    }

    copyDirRecursive(sourceDir, targetDir)
    log('Synced extension files to userData:', targetDir)
    return true
  } catch (err) {
    log('syncExtensionFilesToUserData error:', err.message)
    return false
  }
}

  app.whenReady().then(() => {
    loadStore()
    loadPairingToken()
    registerIpc()
    startBridge()
    syncExtensionFilesToUserData()
    createWindow()
    setupAutoUpdater()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}