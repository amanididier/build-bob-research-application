const { app, BrowserWindow, shell, session } = require('electron')
const http = require('node:http')
const path = require('node:path')
const crypto = require('node:crypto')

const PORT = 54321
const token = process.env.BOB_BRIDGE_TOKEN || 'development-token'
const tabs = new Map()

function json(res, status, body) { res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, x-bob-token' }); res.end(JSON.stringify(body)) }
function startBridge() {
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') return json(res, 204, {})
    if (req.headers['x-bob-token'] !== token) return json(res, 401, { ok: false, error: 'Unauthorized bridge request' })
    if (req.url === '/health') return json(res, 200, { ok: true, data: { service: 'bob-desktop', port: PORT } })
    if (req.method === 'POST' && (req.url === '/events/note' || req.url === '/events/ask')) {
      let raw = ''
      req.on('data', (chunk) => { raw += chunk })
      req.on('end', () => { try { const payload = JSON.parse(raw); const id = `${req.url.slice(8)}:${Date.now()}`; tabs.set(id, { ...payload, id, type: req.url.slice(8) }); json(res, 201, { ok: true, data: payload }) } catch { json(res, 400, { ok: false, error: 'Invalid JSON payload' }) } })
      return
    }
    if (req.method === 'POST' && req.url === '/events/tab') {
      let raw = ''
      req.on('data', (chunk) => { raw += chunk })
      req.on('end', () => { try { const payload = JSON.parse(raw); tabs.set(`${payload.sessionId}:${payload.tabId}`, { ...payload, id: `${payload.sessionId}:${payload.tabId}` }); json(res, 201, { ok: true, data: payload }) } catch { json(res, 400, { ok: false, error: 'Invalid JSON payload' }) } })
      return
    }
    if (req.method === 'GET' && req.url.startsWith('/sessions/') && req.url.endsWith('/tabs')) return json(res, 200, { ok: true, data: [...tabs.values()] })
    json(res, 404, { ok: false, error: 'Route not found' })
  })
  server.listen(PORT, '127.0.0.1')
  return server
}

function createWindow() {
  const win = new BrowserWindow({ 
    width: 1280, 
    height: 820, 
    minWidth: 980, 
    minHeight: 650, 
    title: 'Bob Research Companion', 
    webPreferences: { 
      contextIsolation: true, 
      nodeIntegration: false 
    } 
  })

  if (app.isPackaged) {
    // When running from the built installer, load your compiled frontend assets or index.html
    win.loadFile(path.join(__dirname, 'dist', 'index.html')).catch(() => {
      // Fallback load if index is nested
      win.loadURL(`file://${path.join(__dirname, 'index.html')}`)
    })
  } else {
    // During local development, use localhost
    const url = process.env.BOB_WEB_URL || 'http://localhost:3000'
    win.loadURL(url)
  }

  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
}

app.whenReady().then(() => { 
  startBridge(); 
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => callback({ responseHeaders: { ...details.responseHeaders, 'Access-Control-Allow-Origin': ['*'] } })); 
  createWindow(); 
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() }) 
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
process.env.BOB_BRIDGE_TOKEN = token
console.log(`[bob] bridge token: ${token}`)
