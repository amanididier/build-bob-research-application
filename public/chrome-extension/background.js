// Bob Research Companion - Chrome Extension Service Worker (Manifest V3)

// Configure Side Panel behavior: open side panel whenever user clicks extension action icon
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Side panel behavior error:', error));
  }

  // Create context menus for quick capturing
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

// Handle context menu clicks
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
    // Open side panel and send query
    chrome.sidePanel.open({ tabId: tab.id }).then(() => {
      chrome.runtime.sendMessage({
        type: 'BOB_ASK_PROMPT',
        prompt: `Explain and evaluate this passage in relation to our research:\n"${info.selectionText}"`,
        source: {
          title: tab.title,
          url: tab.url
        }
      });
    }).catch(err => console.error(err));
  }
});

// Broadcast messages between content scripts, side panel, and desktop app
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_ACTIVE_TAB_CONTEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        sendResponse({
          title: tabs[0].title,
          url: tabs[0].url,
          id: tabs[0].id
        });
      } else {
        sendResponse(null);
      }
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'BOB_SAVE_HIGHLIGHT') {
    saveHighlightToBob(message.data);
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'OPEN_SIDE_PANEL_FROM_PAGE') {
    if (sender.tab && sender.tab.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(err => console.error(err));
    }
  }
});

// Helper to push highlight to desktop bridge & local storage
async function saveHighlightToBob(data) {
  // Store locally in chrome.storage for instant offline access
  const result = await chrome.storage.local.get(['bob_notes']);
  const existingNotes = result.bob_notes || [];
  const newNote = {
    id: 'note_' + Date.now(),
    text: data.text,
    sourceTitle: data.pageTitle,
    sourceUrl: data.url,
    timestamp: new Date().toISOString()
  };
  await chrome.storage.local.set({ bob_notes: [newNote, ...existingNotes] });

  // Notify side panel if it's currently open
  chrome.runtime.sendMessage({
    type: 'BOB_NOTE_ADDED',
    note: newNote
  }).catch(() => {});

  // Try syncing with Bob desktop bridge if running on 127.0.0.1:54321
  try {
    fetch('http://127.0.0.1:54321/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote)
    }).catch(() => {
      // Desktop app might not be running at this exact second
    });
  } catch (e) {}
}
