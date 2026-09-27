// Bob Research Companion - Desktop Main Process (v1.0.19)
// Bundles modern React/Vite app with native auto-updates and real Bob mascot icon.
const { app, BrowserWindow, shell, ipcMain, session } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

let autoUpdater = null
try {
  const updaterModule = require('electron-updater')
  autoUpdater = updaterModule.autoUpdater
} catch (e) {
  console.log('electron-updater not loaded:', e.message)
}

const PORT = 54321
const TOKEN = process.env.BOB_BRIDGE_TOKEN || 'development-token'
const WEB_URL = process.env.BOB_WEB_URL || 'https://build-bob-research-application.vercel.app'

let win = null
let storePath = null
let updateState = {
  status: 'idle',
  version: '1.0.19',
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

function setupAutoUpdater() {
  if (!autoUpdater) return

  autoUpdater.autoDownload = true
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
      message: `New version ${info.version} downloading automatically in background...`
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
    sendStatus({
      status: 'error',
      message: err ? (err.message || String(err)) : 'Unable to check updates'
    })
  })

  // Check silently on startup if packaged
  if (app.isPackaged) {
    try {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        log('Auto-update check error:', err.message)
      })
    } catch (e) {
      log('Auto-updater startup exception:', e.message)
    }
  }
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

  ipcMain.handle('bob:checkUpdates', async () => {
    if (!app.isPackaged || !autoUpdater) {
      return {
        status: 'latest',
        version: app.getVersion() || '1.0.19',
        message: `Running latest build (v${app.getVersion() || '1.0.19'})`
      }
    }
    try {
      await autoUpdater.checkForUpdates()
      return updateState
    } catch (err) {
      return { status: 'error', message: err.message || 'Check failed' }
    }
  })

  ipcMain.handle('bob:installUpdate', () => {
    if (autoUpdater) {
      autoUpdater.quitAndInstall()
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
  const iconPath = process.platform === 'win32' && fs.existsSync(path.join(__dirname, 'icon.ico'))
    ? path.join(__dirname, 'icon.ico')
    : path.join(__dirname, 'icon.png')

  // Explicitly grant microphone media permission for speech recognition
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