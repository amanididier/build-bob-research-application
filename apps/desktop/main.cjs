const { app, BrowserWindow, shell, session } = require('electron')
const http = require('node:http')
const path = require('node:path')

const PORT = 54321
const token = process.env.BOB_BRIDGE_TOKEN || 'development-token'
const tabs = new Map()

// (Your local bridge code remains here...)

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

  // Completely removes the top menu bar
  win.setMenu(null)

  if (app.isPackaged) {
    // In production, load the local standalone server running inside the app package
    win.loadURL('http://localhost:3000') // or your dynamic local port handler
  } else {
    win.loadURL('http://localhost:3000')
  }

  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
}

app.whenReady().then(() => { 
  startBridge(); 
  createWindow(); 
})
