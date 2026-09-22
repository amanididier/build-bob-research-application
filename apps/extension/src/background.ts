export {}

const BRIDGE = 'http://127.0.0.1:54321'
const TOKEN = 'development-token'

async function bridge(path: string, init?: RequestInit) {
  return fetch(`${BRIDGE}${path}`, { ...init, headers: { 'content-type': 'application/json', 'x-bob-token': TOKEN, ...(init?.headers ?? {}) } })
}

function reportTab(tabId: number, tab: chrome.tabs.Tab) {
  if (!tab.url) return
  void bridge('/events/tab', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-bob-token': 'development-token' },
    body: JSON.stringify({
      sessionId: 'active-session',
      url: tab.url,
      title: tab.title ?? tab.url,
      tabId,
      favicon: tab.favIconUrl,
      selectedText: '',
    }),
  })
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) reportTab(tabId, tab)
})

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void chrome.tabs.get(tabId).then((tab) => reportTab(tabId, tab))
})

chrome.runtime.onMessage.addListener((message: { type?: string; sessionId?: string; selectedText?: string; url?: string; sourceTab?: string }) => {
  if (message.type === 'note.create') {
    void bridge('/events/note', { method: 'POST', body: JSON.stringify({ sessionId: message.sessionId ?? 'active-session', selectedText: message.selectedText ?? '', url: message.url ?? '', sourceTab: message.sourceTab ?? '' }) })
  }
  if (message.type === 'ask.selection') {
    void bridge('/events/ask', { method: 'POST', body: JSON.stringify({ sessionId: message.sessionId ?? 'active-session', selectedText: message.selectedText ?? '', url: message.url ?? '' }) })
  }
})
