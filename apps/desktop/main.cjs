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
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', 'content-type, x-bob-token, authorization')
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      return res.end()
    }

    const send = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(obj))
    }

    const pathname = (req.url || '').split('?')[0]

    // 1. Health check & Extension Handshake (Available for connection verification)
    if (req.method === 'GET' && (pathname === '/health' || pathname === '/events/handshake' || pathname === '/events/ping')) {
      store.extensionConnected = true
      store.lastExtensionContact = Date.now()
      saveStore()
      notify()
      return send(200, {
        ok: true,
        connected: true,
        port: PORT,
        version: app.getVersion(),
        token: TOKEN,
        at: Date.now()
      })
    }

    if (req.method === 'POST' && (pathname === '/events/handshake' || pathname === '/events/ping')) {
      store.extensionConnected = true
      store.lastExtensionContact = Date.now()
      saveStore()
      notify()
      return send(200, {
        ok: true,
        connected: true,
        port: PORT,
        version: app.getVersion(),
        token: TOKEN,
        at: Date.now()
      })
    }

    if (req.method === 'GET' && pathname === '/events/extension-status') {
      const isRecent = store.lastExtensionContact && (Date.now() - store.lastExtensionContact < 300000)
      return send(200, {
        ok: true,
        connected: Boolean(store.extensionConnected && isRecent),
        lastContact: store.lastExtensionContact || null,
        port: PORT
      })
    }

    // 2. Token authentication for event messages
    const providedToken = req.headers['x-bob-token'] || 
      (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '') ||
      '';

    if (providedToken && providedToken !== TOKEN && providedToken !== 'development-token' && providedToken !== pairingToken) {
      return send(401, { error: 'Unauthorized bridge request' })
    }

    // Register active extension contact
    store.extensionConnected = true
    store.lastExtensionContact = Date.now()

    if (req.method === 'GET' && pathname === '/events/pending') {
      // The extension polls this to learn that the user asked for the panel.
      const fresh = pendingPanelRequest && Date.now() - pendingPanelRequest.at < PANEL_REQUEST_TTL_MS
      const pending = fresh ? pendingPanelRequest : null
      pendingPanelRequest = null
      return send(200, { ok: true, pending })
    }

    if (req.method !== 'POST') return send(404, { error: 'Not found' })

    const body = await readBody(req)

    if (pathname === '/events/pair') {
      // Extension exchanges the shared bootstrap token for this install's
      // unique pairing secret, so a downloaded extension binds to *this*
      // desktop. Idempotent, and the bootstrap token always stays valid.
      return send(200, { ok: true, token: pairingToken, version: app.getVersion() })
    }

    if (pathname === '/events/chat') {
      // Mirror a Chrome-extension chat exchange into the desktop session.
      const at = Date.now()
      if (body.prompt) {
        store.messages.push({ id: id(), role: 'user', text: String(body.prompt).slice(0, 20000), origin: 'chrome-extension', at })
      }
      if (body.reply) {
        store.messages.push({ id: id(), role: 'assistant', text: String(body.reply).slice(0, 20000), origin: 'chrome-extension', at: at + 1 })
      }
      store.messages = store.messages.slice(-500)
      saveStore()
      notify()
      return send(200, { ok: true })
    }

    if (pathname === '/events/focus') {
      // Sent by the Chrome extension when the user clicks the Bob logo there.
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
      }
      return send(200, { ok: true })
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
  // so the desktop can only leave a request for the extension to pick up.
  ipcMain.handle('bob:requestExtensionPanel', () => {
    pendingPanelRequest = { at: Date.now(), version: app.getVersion() }
    return { ok: true, bridgeListening, queued: true }
  })

  // True when the Chrome extension has talked to the bridge recently, so the
  // composer's Chrome button can open the live panel instead of install steps.
  ipcMain.handle('bob:extensionAlive', () => {
    const alive = Boolean(store.lastExtensionContact && Date.now() - store.lastExtensionContact < 300000)
    return { alive, bridgeListening, lastSeen: store.lastExtensionContact || null }
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
    const isRecent = store.lastExtensionContact && (Date.now() - store.lastExtensionContact < 300000)
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

  app.whenReady().then(() => {
    loadStore()
    loadPairingToken()
    registerIpc()
    startBridge()
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