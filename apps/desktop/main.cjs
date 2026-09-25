// Bob Research Companion - desktop main process.
// The window ALWAYS loads the bundled offline renderer (renderer/index.html),
// so it never shows a blank screen when the website is unreachable.
const { app, BrowserWindow, shell, ipcMain } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const PORT = 54321
const TOKEN = process.env.BOB_BRIDGE_TOKEN || 'development-token'
const WEB_URL = process.env.BOB_WEB_URL || 'https://build-bob-research-application.vercel.app'

let win = null
let storePath = null
let store = { projects: [{ id: 'default', name: 'My research' }], notes: [], sources: [], captures: [], tabs: {} }

function log(...args) {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'bob.log'), `[${new Date().toISOString()}] ${args.join(' ')}\n`) } catch {}
  console.log(...args)
}

function loadStore() {
  storePath = path.join(app.getPath('userData'), 'bob-workspace.json')
  try { store = { ...store, ...JSON.parse(fs.readFileSync(storePath, 'utf8')) } } catch {}
}
function saveStore() {
  try { fs.writeFileSync(storePath, JSON.stringify(store, null, 2)) } catch (e) { log('save failed', e.message) }
}
function notify() { if (win && !win.isDestroyed()) win.webContents.send('bob:changed') }
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy() })
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } })
  })
}

// Local bridge used by the browser extension.
function startBridge() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', 'content-type, x-bob-token')
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)) }
    if (req.headers['x-bob-token'] !== TOKEN) return send(401, { error: 'unauthorized' })

    if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true, version: app.getVersion() })
    if (req.method !== 'POST') return send(404, { error: 'not found' })
    const body = await readBody(req)
    if (req.url === '/events/tab') {
      const key = String(body.tabId ?? body.url ?? id())
      store.tabs[key] = { title: String(body.title ?? ''), url: String(body.url ?? ''), at: Date.now() }
    } else if (req.url === '/events/note' || req.url === '/events/ask') {
      store.captures.unshift({
        id: id(), kind: req.url.endsWith('ask') ? 'ask' : 'highlight',
        text: String(body.selectedText ?? '').slice(0, 20000), url: String(body.url ?? ''), at: Date.now(),
      })
      store.captures = store.captures.slice(0, 500)
    } else return send(404, { error: 'not found' })
    saveStore(); notify(); send(200, { ok: true })
  })
  server.on('error', (e) => log('bridge error', e.message))
  server.listen(PORT, '127.0.0.1', () => log('bridge listening on', PORT))
}

function registerIpc() {
  ipcMain.handle('bob:get', () => store)
  ipcMain.handle('bob:add', (_e, kind, item) => {
    if (!['notes', 'sources', 'projects'].includes(kind)) return store
    store[kind].unshift({ id: id(), at: Date.now(), ...item })
    saveStore(); return store
  })
  ipcMain.handle('bob:remove', (_e, kind, itemId) => {
    if (Array.isArray(store[kind])) store[kind] = store[kind].filter((x) => x.id !== itemId)
    saveStore(); return store
  })
  ipcMain.handle('bob:openWeb', (_e, sub = '') => shell.openExternal(WEB_URL + String(sub)))
  ipcMain.handle('bob:info', () => ({ version: app.getVersion(), webUrl: WEB_URL }))
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 980, minHeight: 650,
    title: 'Bob Research Companion', show: false, backgroundColor: '#0f1115',
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') },
  })
  win.setMenu(null)
  win.once('ready-to-show', () => win.show())
  win.webContents.on('did-fail-load', (_e, code, desc, url) => log('load failed', code, desc, url))
  win.webContents.on('render-process-gone', (_e, d) => log('renderer gone', d.reason))
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url) } })
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })
  app.whenReady().then(() => {
    loadStore(); registerIpc(); startBridge(); createWindow()
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
