// Bob Research Companion - Desktop Main Process (v1.0.12)
// Bundles offline interface (renderer/index.html) so it NEVER opens to a blank screen.
const { app, BrowserWindow, shell, ipcMain } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const PORT = 54321
const TOKEN = process.env.BOB_BRIDGE_TOKEN || 'development-token'
const WEB_URL = process.env.BOB_WEB_URL || 'https://build-bob-research-application.vercel.app'

let win = null
let storePath = null
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
    res.setHeader('access-control-allow-headers', 'content-type, x-bob-token')
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      return res.end()
    }

    const send = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(obj))
    }

    if (req.headers['x-bob-token'] !== TOKEN) {
      return send(401, { error: 'Unauthorized bridge request' })
    }

    if (req.method === 'GET' && req.url === '/health') {
      return send(200, { ok: true, version: app.getVersion() })
    }

    if (req.method !== 'POST') return send(404, { error: 'Not found' })

    const body = await readBody(req)

    if (req.url === '/events/tab') {
      const key = String(body.tabId ?? body.url ?? id())
      store.tabs[key] = {
        title: String(body.title ?? ''),
        url: String(body.url ?? ''),
        favicon: body.favicon,
        at: Date.now(),
      }
    } else if (req.url === '/events/note' || req.url === '/events/ask') {
      store.captures.unshift({
        id: id(),
        kind: req.url.endsWith('ask') ? 'ask' : 'highlight',
        text: String(body.selectedText ?? '').slice(0, 20000),
        url: String(body.url ?? ''),
        at: Date.now(),
      })
      store.captures = store.captures.slice(0, 500)
    } else {
      return send(404, { error: 'Route not found' })
    }

    saveStore()
    notify()
    send(200, { ok: true })
  })

  server.on('error', (e) => log('Bridge error:', e.message))
  server.listen(PORT, '127.0.0.1', () => log('Bridge listening on port:', PORT))
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
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 650,
    title: 'Bob Research Companion',
    show: false,
    backgroundColor: '#0f1115',
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

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // ALWAYS load the bundled offline interface:
  const rendererPath = path.join(__dirname, 'renderer', 'index.html')
  win.loadFile(rendererPath)
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
    registerIpc()
    startBridge()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}