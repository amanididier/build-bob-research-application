// Bob Research Companion - Content Script (Text Selection Bubble)
(function () {
  let bubble = null;
  let currentSelectionText = '';

  function createBubble() {
    if (bubble) return;
    bubble = document.createElement('div');
    bubble.id = 'bob-selection-bubble';
    bubble.className = 'bob-bubble-hidden';
    bubble.innerHTML = `
      <div class="bob-bubble-inner">
        <div class="bob-bubble-mascot">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#f4bc18">
            <path d="M12 2L2 22h20L12 2z"/>
          </svg>
        </div>
        <button id="bob-btn-save-note" class="bob-bubble-action">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          Save Note
        </button>
        <span class="bob-divider"></span>
        <button id="bob-btn-ask-bob" class="bob-bubble-action primary">
          ✦ Ask Bob
        </button>
      </div>
    `;
    document.body.appendChild(bubble);

    document.getElementById('bob-btn-save-note').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      saveCurrentSelection();
    });

    document.getElementById('bob-btn-ask-bob').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      askBobAboutSelection();
    });
  }

  function handleSelection() {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (!text || text.length < 5) {
      hideBubble();
      return;
    }

    currentSelectionText = text;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!bubble) createBubble();

    const top = rect.top + window.scrollY - 42;
    const left = rect.left + window.scrollX + rect.width / 2 - 80;

    bubble.style.top = `${Math.max(10, top)}px`;
    bubble.style.left = `${Math.max(10, left)}px`;
    bubble.classList.remove('bob-bubble-hidden');
  }

  function hideBubble() {
    if (bubble) {
      bubble.classList.add('bob-bubble-hidden');
    }
  }

  function saveCurrentSelection() {
    if (!currentSelectionText) return;

    chrome.runtime.sendMessage({
      type: 'BOB_SAVE_HIGHLIGHT',
      data: {
        text: currentSelectionText,
        pageTitle: document.title,
        url: window.location.href
      }
    }, () => {
      // Visual feedback
      const btn = document.getElementById('bob-btn-save-note');
      if (btn) {
        btn.innerHTML = '✓ Saved!';
        setTimeout(() => {
          btn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            Save Note
          `;
          hideBubble();
        }, 800);
      }
    });
  }

  function askBobAboutSelection() {
    if (!currentSelectionText) return;
    chrome.runtime.sendMessage({
      type: 'OPEN_SIDE_PANEL_FROM_PAGE'
    });
    chrome.runtime.sendMessage({
      type: 'BOB_ASK_PROMPT',
      prompt: `Analyze this passage from ${document.title}:\n\n"${currentSelectionText}"`,
      source: {
        title: document.title,
        url: window.location.href
      }
    });
    hideBubble();
  }

  document.addEventListener('mouseup', () => {
    setTimeout(handleSelection, 20);
  });

  document.addEventListener('mousedown', (e) => {
    if (bubble && !bubble.contains(e.target)) {
      hideBubble();
    }
  });
})();
