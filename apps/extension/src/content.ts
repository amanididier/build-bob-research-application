export {}

const SESSION_ID = 'active-session'
let bobToolbar: HTMLDivElement | null = null

function reportTab() {
  const payload = {
    type: 'tab.updated',
    sessionId: SESSION_ID,
    url: window.location.href,
    title: document.title,
    tabId: -1,
    selectedText: '',
  }
  void chrome.runtime.sendMessage(payload)
}

function removeToolbar() {
  bobToolbar?.remove()
  bobToolbar = null
}

function showToolbar() {
  removeToolbar()
  const selection = window.getSelection()
  const selectedText = selection?.toString().trim() ?? ''
  if (!selectedText || !selection?.rangeCount) return
  const rect = selection.getRangeAt(0).getBoundingClientRect()
  bobToolbar = document.createElement('div')
  bobToolbar.style.cssText = 'position:fixed;z-index:2147483647;display:flex;gap:6px;padding:6px;border:1px solid #dce3ef;border-radius:10px;background:#fff;box-shadow:0 8px 24px rgba(30,45,70,.16);font:12px system-ui'
  bobToolbar.style.left = `${Math.max(8, rect.left)}px`
  bobToolbar.style.top = `${Math.max(8, rect.top - 48)}px`
  const notesButton = document.createElement('button')
  notesButton.textContent = 'Notes'
  notesButton.style.cssText = 'border:0;border-radius:6px;background:#1f8f5f;color:#fff;padding:7px 10px;cursor:pointer'
  notesButton.onclick = () => {
    void chrome.runtime.sendMessage({ type: 'note.create', sessionId: SESSION_ID, selectedText, url: window.location.href, sourceTab: document.title })
    notesButton.textContent = 'Saved'
    notesButton.style.background = '#4aa477'
    window.setTimeout(removeToolbar, 900)
  }
  const askButton = document.createElement('button')
  askButton.textContent = 'Ask Bob'
  askButton.style.cssText = 'border:0;border-radius:6px;background:#f3f6fa;color:#24344a;padding:7px 10px;cursor:pointer'
  askButton.onclick = () => { void chrome.runtime.sendMessage({ type: 'ask.selection', sessionId: SESSION_ID, selectedText, url: window.location.href }); removeToolbar() }
  bobToolbar.append(notesButton, askButton)
  document.body.append(bobToolbar)
}

document.addEventListener('mouseup', () => window.setTimeout(showToolbar, 0))
document.addEventListener('mousedown', (event) => { if (bobToolbar && !bobToolbar.contains(event.target as Node)) removeToolbar() })
reportTab()
window.addEventListener('popstate', reportTab)
window.addEventListener('hashchange', reportTab)
