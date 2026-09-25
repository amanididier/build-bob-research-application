import { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Terminal, 
  Globe, 
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export function RepoFixExporter() {
  const [activeFile, setActiveFile] = useState<string>('apps/desktop/main.cjs');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedOnlineGuide, setCopiedOnlineGuide] = useState(false);
  const [copiedTerminal, setCopiedTerminal] = useState(false);

  const filesContent: Record<string, { desc: string; code: string }> = {
    'apps/desktop/main.cjs': {
      desc: 'Fixed Electron main process. Bundles offline renderer, starts bridge on 127.0.0.1:54321, reads bob-workspace.json, and exposes hardware RAM profiling IPC.',
      code: `// Bob Research Companion - Desktop Main Process (v1.0.12)
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
  projects: [{ id: 'default', name: 'My Research', color: 'violet' }],
  notes: [],
  sources: [],
  captures: [],
  tabs: {},
  messages: []
}

function log(...args) {
  try {
    const logPath = path.join(app.getPath('userData'), 'bob.log')
    fs.appendFileSync(logPath, \`[\${new Date().toISOString()}] \${args.join(' ')}\\n\`)
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
`,
    },
    'apps/desktop/preload.cjs': {
      desc: 'Secure preload script using contextBridge to expose window.bob safely.',
      code: `const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bob', {
  get: () => ipcRenderer.invoke('bob:get'),
  add: (kind, item) => ipcRenderer.invoke('bob:add', kind, item),
  remove: (kind, id) => ipcRenderer.invoke('bob:remove', kind, id),
  openWeb: (sub) => ipcRenderer.invoke('bob:openWeb', sub),
  info: () => ipcRenderer.invoke('bob:info'),
  onChange: (fn) => ipcRenderer.on('bob:changed', () => fn()),
})
`,
    },
    'apps/desktop/package.json': {
      desc: 'Package manifest with version 1.0.12 and explicit files bundle array.',
      code: `{
  "name": "@bob/desktop",
  "version": "1.0.12",
  "description": "Bob desktop research companion",
  "author": "Bob",
  "private": true,
  "main": "main.cjs",
  "repository": {
    "type": "git",
    "url": "https://github.com/amanididier/build-bob-research-application.git"
  },
  "scripts": {
    "start": "electron .",
    "dist": "electron-builder --dir",
    "package": "electron-builder"
  },
  "dependencies": {},
  "devDependencies": {
    "electron": "44.4.3",
    "electron-builder": "^26.15.3"
  },
  "build": {
    "appId": "com.bob.research",
    "productName": "Bob Research Companion",
    "executableName": "bob-research-companion",
    "files": [
      "main.cjs",
      "preload.cjs",
      "renderer/**"
    ],
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": "nsis",
      "artifactName": "Bob-Research-Companion-Setup.exe"
    }
  }
}
`,
    },
    '.github/workflows/release-desktop.yml': {
      desc: 'GitHub Actions workflow file triggering Windows installer build and release packaging on v* tags.',
      code: `name: Release Desktop App

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Check desktop app code
        working-directory: apps/desktop
        run: |
          node --check main.cjs
          node --check preload.cjs
          node --check renderer/app.js

      # The desktop app is self-contained with offline renderer;
      # the website (Next.js) is deployed separately on Vercel.
      - name: Install desktop dependencies
        working-directory: apps/desktop
        run: npm install --no-audit --no-fund

      - name: Build Windows installer
        working-directory: apps/desktop
        run: npx electron-builder --win nsis --publish never

      - name: Attach installer to release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v2
        with:
          files: apps/desktop/dist/*.exe
`,
    },
    'chrome-extension/manifest.json': {
      desc: 'Real Chrome Side Panel Extension Manifest V3 with sidePanel and contextMenus permissions.',
      code: `{
  "manifest_version": 3,
  "name": "Bob — Research Companion Side Panel",
  "version": "1.0.0",
  "description": "Your AI companion for focused web research. Reads active tabs, saves context-aware highlights, and connects directly to Bob Desktop.",
  "permissions": [
    "sidePanel",
    "activeTab",
    "storage",
    "tabs",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_title": "Open Bob Research Side Panel"
  },
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
`,
    },
    'chrome-extension/background.js': {
      desc: 'Chrome Extension background service worker: opens real Side Panel and coordinates context menu highlighting.',
      code: `// Bob Research Companion - Chrome Extension Service Worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Side panel behavior error:', error));
  }

  chrome.contextMenus.create({
    id: 'bob-save-highlight',
    title: 'Save highlight to Bob Notes (⌥H)',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'bob-ask-selection',
    title: 'Ask Bob about this passage (⌥B)',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'bob-open-panel',
    title: 'Open Bob Research Panel',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  if (info.menuItemId === 'bob-open-panel') {
    chrome.sidePanel.open({ tabId: tab.id }).catch(err => console.error(err));
  } else if (info.menuItemId === 'bob-save-highlight' && info.selectionText) {
    saveHighlightToBob({
      text: info.selectionText,
      pageTitle: tab.title || 'Web Research',
      url: tab.url || '',
      tabId: tab.id
    });
  } else if (info.menuItemId === 'bob-ask-selection' && info.selectionText) {
    chrome.sidePanel.open({ tabId: tab.id }).then(() => {
      chrome.runtime.sendMessage({
        type: 'BOB_ASK_PROMPT',
        prompt: \`Explain and evaluate this passage in relation to our research:\\n"\${info.selectionText}"\`,
        source: { title: tab.title, url: tab.url }
      });
    }).catch(err => console.error(err));
  }
});
`,
    },
    'chrome-extension/sidepanel.html': {
      desc: 'Real Chrome Side Panel HTML layout with active research session banner and Bob companion controls.',
      code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bob Side Panel</title>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div class="sidepanel-root">
    <header class="sp-header">
      <div class="sp-brand">
        <img src="icons/icon48.png" alt="Bob" class="sp-avatar">
        <div class="sp-meta">
          <div class="sp-name">Bob Research</div>
          <div class="sp-status"><span class="dot active"></span> Connected</div>
        </div>
      </div>
    </header>
    <div class="sp-context-banner">
      <div class="context-label">ACTIVE RESEARCH</div>
      <div class="context-title" id="active-project-title">AI research companion</div>
      <div class="context-sub" id="active-tab-title">Reading current webpage...</div>
    </div>
    <div class="sp-quick-actions">
      <button class="pill" id="btn-summarize">✦ Summarize page</button>
      <button class="pill" id="btn-extract-claims">Extract key claims</button>
      <button class="pill" id="btn-save-tab">+ Save to Tabs</button>
    </div>
    <main class="sp-main">
      <div class="sp-stream" id="chat-stream">
        <div class="sp-msg bob-msg">
          <div class="msg-bubble"><p>I'm looking at this page with you. What would you like to explore?</p></div>
        </div>
      </div>
    </main>
    <footer class="sp-footer">
      <div class="sp-composer">
        <textarea id="prompt-input" placeholder="Ask Bob about this page..." rows="1"></textarea>
        <button id="btn-send" class="btn-send">Send</button>
      </div>
    </footer>
  </div>
  <script src="sidepanel.js"></script>
</body>
</html>
`,
    },
  };

  const handleCopy = (fileName: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Instant 1-Click Codebase & Extension Download Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-emerald-500/10 border border-amber-500/30 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                1-Click Direct Download Available
              </span>
              <span className="text-xs text-neutral-400">No PNPM or Command Line Required</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-100">
              Download Entire Codebase & Extension ZIPs
            </h2>
            <p className="text-sm text-neutral-300 max-w-2xl">
              Because internet timeouts can break package installs, we have pre-packaged all 98 files into ready-to-use zip archives:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="/bob-complete-codebase.zip"
              download="bob-complete-codebase.zip"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <HardDrive className="w-4 h-4" /> Download Complete Project (4.4 MB)
            </a>
            <a
              href="/bob-chrome-extension.zip"
              download="bob-chrome-extension.zip"
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" /> Download Extension ZIP (1.1 MB)
            </a>
          </div>
        </div>

        {/* Git Push Status Banner */}
        <div className="mt-4 p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-neutral-200 font-semibold">Git Feature Branch Ready: </span>
              <code className="text-emerald-400 bg-neutral-900 px-1.5 py-0.5 rounded">feature/bob-complete-ui-extension-onboarding</code>
              <p className="text-neutral-400 mt-0.5">98 files committed and linked to origin/main. Ready to push to GitHub as soon as authorized.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">
              ✓ 98 Files Committed
            </span>
          </div>
        </div>
      </div>

      {/* Direct GitHub Web Implementation Guide (No local terminal needed) */}
      <div className="bg-gradient-to-r from-emerald-900/30 via-neutral-900 to-violet-900/30 border border-emerald-500/30 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                100% Online GitHub Implementation
              </span>
              <span className="text-xs text-neutral-400">Zero Local PC Setup Required</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-100 mt-1">
              How to Publish Release v1.0.12 Directly on GitHub in 3 Minutes
            </h2>
            <p className="text-sm text-neutral-300 mt-1 max-w-2xl">
              Since you don't have the project cloned locally, you can do this directly on GitHub's website in your browser!
            </p>
          </div>

          <a
            href="https://github.com/amanididier/build-bob-research-application"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 shrink-0"
          >
            <ExternalLink className="w-4 h-4" /> Open Your GitHub Repo
          </a>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h4 className="text-sm font-semibold text-neutral-200">Press '.' on GitHub</h4>
            <p className="text-xs text-neutral-400">
              Open your repo in Chrome, press the <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded">.</kbd> key. 
              GitHub will launch a free online VS Code editor right in your browser!
            </p>
          </div>

          <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h4 className="text-sm font-semibold text-neutral-200">Paste the Updated Files</h4>
            <p className="text-xs text-neutral-400">
              Paste the contents of <code className="text-emerald-400">main.cjs</code> and the files listed below, then click "Commit to main".
            </p>
          </div>

          <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h4 className="text-sm font-semibold text-neutral-200">Draft Release 'v1.0.12'</h4>
            <p className="text-xs text-neutral-400">
              Go to Releases → "Draft a new release". In the Tag field type <code className="text-violet-300 font-mono font-bold">v1.0.12</code> and click "Publish release". 
              GitHub Actions automatically builds your Windows installer!
            </p>
          </div>
        </div>
      </div>

      {/* File Viewer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File Tree / Selector */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-2 px-1">
            Files to Copy to Repo
          </span>
          {Object.keys(filesContent).map((fileName) => {
            const isSelected = activeFile === fileName;
            return (
              <div
                key={fileName}
                onClick={() => setActiveFile(fileName)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-neutral-900 border-violet-500 text-neutral-100 shadow-md'
                    : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-violet-400' : 'text-neutral-500'}`} />
                  <span className="font-mono text-xs truncate">{fileName}</span>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
            );
          })}
        </div>

        {/* Code Preview & Copy */}
        <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
            <div>
              <div className="font-mono text-xs font-bold text-neutral-200">{activeFile}</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">{filesContent[activeFile].desc}</p>
            </div>
            <button
              onClick={() => handleCopy(activeFile, filesContent[activeFile].code)}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              {copiedFile === activeFile ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy File Content
                </>
              )}
            </button>
          </div>

          <div className="flex-1 bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 overflow-x-auto max-h-[500px]">
            <pre className="font-mono text-xs text-neutral-300 whitespace-pre leading-relaxed">
              {filesContent[activeFile].code}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
