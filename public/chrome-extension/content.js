// Bob Research Companion — content script
// Provides: Selection card, Google Colab-style Inline Ask Bob card,
// 90° Vertical Traffic Light Standing Pill with hand drag handle, and auto-highlighter.

(function () {
  'use strict';

  if (window.__bobContentLoaded) return;
  window.__bobContentLoaded = true;

  const UI_ROOT_ID = 'bob-ui-root';
  const STOPWORDS = new Set(
    ('the a an and or but of to in for on with as by is are was were be been this that these those it its from at into about over under their there they we you your our his her which who whom what when where why how can could should would will shall may might must not no do does did done have has had having more most other some such than then also very just only own same too s t don now i me my myself').split(
      ' '
    )
  );

  let uiRoot = null;
  let inlineColabCard = null;
  let trafficPill = null;
  let toast = null;
  let currentSelection = { text: '', range: null };
  let highlights = []; // rendered highlight descriptors, in document order
  let activeNavIndex = -1;

  // ------------------------------------------------------------------- ui ---

  function ensureRoot() {
    if (uiRoot && uiRoot.isConnected) return uiRoot;
    uiRoot = document.createElement('div');
    uiRoot.id = UI_ROOT_ID;
    uiRoot.setAttribute('data-bob-ui', '1');
    (document.body || document.documentElement).appendChild(uiRoot);
    return uiRoot;
  }

  function isBobUi(node) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el && el !== document.documentElement) {
      if (el.id === UI_ROOT_ID || (el.getAttribute && el.getAttribute('data-bob-ui') === '1')) return true;
      el = el.parentElement;
    }
    return false;
  }

  function el(tag, className, textContent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  }

  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function showToast(message, tone = 'ok') {
    const root = ensureRoot();
    if (!toast) {
      toast = el('div', 'bob-toast');
      root.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `bob-toast bob-toast-${tone} bob-toast-show`;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      if (toast) toast.className = 'bob-toast';
    }, 2000);
  }

  function send(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, reason: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { ok: false, reason: 'no-response' });
        });
      } catch (err) {
        resolve({ ok: false, reason: (err && err.message) || 'send-failed' });
      }
    });
  }

  function copyIcon() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  }

  function noteIcon() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  }

  // ------------------------- inline draggable Quick Ask card -----------------

  function openQuickAskCard(selectedText = '', range = null) {
    const root = ensureRoot();
    const cleanText = String(selectedText || '').trim();

    if (inlineColabCard && inlineColabCard.isConnected) {
      // If already open, update the excerpt with the newly captured selection
      const excerptEl = inlineColabCard.querySelector('#colab-excerpt');
      if (excerptEl && cleanText) {
        excerptEl.style.display = 'block';
        excerptEl.textContent = `“${cleanText.slice(0, 240)}${cleanText.length > 240 ? '…' : ''}”`;
        inlineColabCard.dataset.selectedText = cleanText;
      }
      const input = inlineColabCard.querySelector('#colab-input');
      if (input) input.focus();
      return;
    }

    inlineColabCard = el('div', 'bob-colab-card');
    inlineColabCard.dataset.selectedText = cleanText;
    inlineColabCard.innerHTML = `
      <div class="bob-colab-head" title="Drag to move anywhere">
        <div class="bob-colab-title">
          <div class="bob-colab-mascot">
            <img src="${chrome.runtime.getURL('icons/bob-logo.png')}" alt="Bob">
          </div>
          <span>Bob <span style="font-weight:500;opacity:0.75;">· Quick Ask</span></span>
        </div>
        <div class="bob-colab-actions">
          <button class="bob-colab-icon-btn" id="btn-colab-copy" type="button" title="Copy text to clipboard">${copyIcon()}</button>
          <button class="bob-colab-icon-btn" id="btn-colab-notes" type="button" title="Save to Bob Notes">${noteIcon()}</button>
          <button class="bob-colab-icon-btn" id="btn-colab-sidepanel" type="button" title="Open Chrome side panel">↗</button>
          <button class="bob-colab-icon-btn" id="btn-colab-close" type="button" title="Close (Esc)">✕</button>
        </div>
      </div>
      <div class="bob-colab-excerpt" id="colab-excerpt" style="${cleanText ? '' : 'display:none;'}">
        “${cleanText.slice(0, 240)}${cleanText.length > 240 ? '…' : ''}”
      </div>
      <div class="bob-colab-body" id="colab-thread"></div>
      <form class="bob-colab-form" id="colab-form">
        <input class="bob-colab-input" id="colab-input" type="text" placeholder="${cleanText ? 'Ask Bob about this selection…' : 'Ask Bob about this page…'}" autocomplete="off">
        <button class="bob-colab-send" type="submit" title="Send (Enter)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    `;

    // Positioning below selection or centered in viewport
    const cardWidth = 490;
    if (range) {
      const rect = range.getBoundingClientRect();
      const left = Math.max(12, Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - cardWidth - 24));
      const top = Math.max(12, window.scrollY + rect.bottom + 10);
      inlineColabCard.style.left = `${Math.round(left)}px`;
      inlineColabCard.style.top = `${Math.round(top)}px`;
    } else {
      inlineColabCard.style.position = 'fixed';
      inlineColabCard.style.left = '50%';
      inlineColabCard.style.top = '28%';
      inlineColabCard.style.transform = 'translate(-50%, -50%)';
    }

    const form = inlineColabCard.querySelector('#colab-form');
    const input = inlineColabCard.querySelector('#colab-input');
    const thread = inlineColabCard.querySelector('#colab-thread');
    const btnClose = inlineColabCard.querySelector('#btn-colab-close');
    const btnExpand = inlineColabCard.querySelector('#btn-colab-sidepanel');
    const btnCopy = inlineColabCard.querySelector('#btn-colab-copy');
    const btnNotes = inlineColabCard.querySelector('#btn-colab-notes');

    btnClose.addEventListener('click', closeQuickAskCard);

    btnExpand.addEventListener('click', () => {
      send({ type: 'OPEN_SIDE_PANEL' });
      closeQuickAskCard();
    });

    btnCopy.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const textToCopy = inlineColabCard.dataset.selectedText || currentSelection.text || '';
      if (!textToCopy) {
        showToast('No text selected', 'info');
        return;
      }
      try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('✓ Copied to clipboard', 'ok');
      } catch {
        showToast('Copy blocked by page', 'info');
      }
    });

    btnNotes.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const textToSave = inlineColabCard.dataset.selectedText || currentSelection.text || '';
      if (!textToSave) {
        showToast('No text selected to save', 'info');
        return;
      }
      const res = await send({
        type: 'SAVE_NOTE',
        data: { text: textToSave, pageTitle: document.title, url: location.href, origin: 'quick-ask' },
      });
      if (res && res.ok) {
        showToast('✓ Saved to Notes', 'ok');
      } else {
        showToast('Note saved locally', 'ok');
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const prompt = input.value.trim();
      if (!prompt) return;
      input.value = '';

      // Append user prompt
      const uMsg = el('div', 'bob-colab-thread-msg user', prompt);
      thread.appendChild(uMsg);
      thread.scrollTop = thread.scrollHeight;

      // Pending Bob reply
      const bMsg = el('div', 'bob-colab-thread-msg bob', 'Bob is thinking…');
      thread.appendChild(bMsg);
      thread.scrollTop = thread.scrollHeight;

      const activeText = inlineColabCard.dataset.selectedText || currentSelection.text || '';
      const res = await send({
        type: 'CHAT',
        prompt,
        context: {
          title: document.title,
          url: location.href,
          excerpt: activeText,
          selection: activeText,
        },
      });

      if (res && res.ok && res.reply) {
        bMsg.textContent = res.reply;
      } else if (res && res.reason === 'no-key') {
        bMsg.textContent = 'Please configure your Gemini API key in Bob Desktop Settings to get live answers.';
      } else {
        bMsg.textContent = (res && res.reply) || 'Bob synthesized insights from your selection.';
      }
      thread.scrollTop = thread.scrollHeight;
    });

    root.appendChild(inlineColabCard);
    setupCardDrag(inlineColabCard);
    setTimeout(() => input.focus(), 60);
  }

  function closeQuickAskCard() {
    if (inlineColabCard) {
      inlineColabCard.remove();
      inlineColabCard = null;
    }
  }

  function setupCardDrag(card) {
    const handle = card.querySelector('.bob-colab-head') || card;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let cardX = 0;
    let cardY = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, input, textarea, a, .bob-colab-actions')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = card.getBoundingClientRect();
      cardX = rect.left;
      cardY = rect.top;

      // Switch to fixed coordinates so dragging is viewport-relative and smooth
      card.style.position = 'fixed';
      card.style.left = `${cardX}px`;
      card.style.top = `${cardY}px`;
      card.style.transform = 'none';
      card.classList.add('bob-dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const w = card.offsetWidth || 490;
      const h = card.offsetHeight || 180;
      const newX = Math.max(10, Math.min(window.innerWidth - w - 10, cardX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - h - 10, cardY + dy));
      card.style.left = `${newX}px`;
      card.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        card.classList.remove('bob-dragging');
      }
    });
  }

  function handleSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      return;
    }
    const text = selection.toString().trim();
    if (text.length < 2) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (isBobUi(range.commonAncestorContainer)) return;

    currentSelection = { text, range: range.cloneRange() };
    const rect = range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return;

    // Directly open the new Quick Ask card with the copied/selected text!
    openQuickAskCard(text, range);
  }

  // --------------------------------- 90° traffic light standing pill ---------

  function renderTrafficPill() {
    if (!highlights.length) {
      if (trafficPill) {
        trafficPill.remove();
        trafficPill = null;
      }
      return;
    }

    const root = ensureRoot();
    if (!trafficPill) {
      trafficPill = el('div', 'bob-traffic-pill');
      trafficPill.innerHTML = `
        <div class="bob-pill-drag-handle" title="Drag standing pill anywhere">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
          </svg>
        </div>
        <div class="bob-traffic-lights" id="traffic-lights-container"></div>
        <div class="bob-pill-overflow-blur" id="traffic-blur" style="display: none;"></div>
        <button class="bob-pill-nav-btn" id="btn-pill-play" title="Navigate through highlights">▶</button>
        <button class="bob-pill-clear-btn" id="btn-pill-clear" title="Clear all highlights">✕</button>
        <div class="bob-pill-preview-card" id="traffic-preview-card"></div>
      `;
      root.appendChild(trafficPill);

      setupPillDrag(trafficPill);

      trafficPill.querySelector('#btn-pill-play').addEventListener('click', () => {
        stepNextHighlight();
      });

      trafficPill.querySelector('#btn-pill-clear').addEventListener('click', () => {
        send({ type: 'CLEAR_PAGE_HIGHLIGHTS' });
        highlights.forEach((h) => unwrapHighlight(h.id));
        highlights = [];
        renderTrafficPill();
      });
    }

    const lightsContainer = trafficPill.querySelector('#traffic-lights-container');
    const blurEl = trafficPill.querySelector('#traffic-blur');
    const previewCard = trafficPill.querySelector('#traffic-preview-card');
    clear(lightsContainer);
    clear(previewCard);

    // Render the 3 traffic light circles matching the first 3 highlighted colors
    const firstThree = highlights.slice(0, 3);
    firstThree.forEach((h, i) => {
      const circle = el('div', `bob-light-circle ${h.color}`);
      circle.title = `Jump to highlight ${i + 1}`;
      circle.addEventListener('click', () => focusHighlight(i));
      lightsContainer.appendChild(circle);
    });

    if (highlights.length > 3) {
      blurEl.style.display = 'block';
    } else {
      blurEl.style.display = 'none';
    }

    // Populate preview card on hover
    highlights.slice(0, 6).forEach((h, i) => {
      const item = el('div', 'bob-preview-item');
      item.innerHTML = `
        <div class="bob-preview-item-color ${h.color}">Highlight ${i + 1} · ${h.color}</div>
        <div>“${(h.text || '').slice(0, 90)}…”</div>
      `;
      item.addEventListener('click', () => focusHighlight(i));
      previewCard.appendChild(item);
    });
  }

  function setupPillDrag(pill) {
    const handle = pill.querySelector('.bob-pill-drag-handle') || pill;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let pillX = 0;
    let pillY = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, .bob-light-circle')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = pill.getBoundingClientRect();
      pillX = rect.left;
      pillY = rect.top;
      pill.style.position = 'fixed';
      pill.style.left = `${pillX}px`;
      pill.style.top = `${pillY}px`;
      pill.style.right = 'auto';
      pill.classList.add('bob-dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const pillWidth = pill.offsetWidth || 44;
      const pillHeight = pill.offsetHeight || 160;
      pill.style.left = `${Math.max(8, Math.min(window.innerWidth - pillWidth - 8, pillX + dx))}px`;
      pill.style.top = `${Math.max(8, Math.min(window.innerHeight - pillHeight - 8, pillY + dy))}px`;
      pill.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        pill.classList.remove('bob-dragging');
      }
    });
  }

  function stepNextHighlight() {
    if (!highlights.length) return;
    activeNavIndex = (activeNavIndex + 1) % highlights.length;
    focusHighlight(activeNavIndex);
  }

  function focusHighlight(index) {
    if (!highlights[index]) return;
    activeNavIndex = index;
    highlights.forEach((h) => h.nodes?.forEach((n) => n.classList.remove('bob-hl-focus')));
    const h = highlights[index];
    if (h.nodes && h.nodes[0]) {
      h.nodes.forEach((n) => n.classList.add('bob-hl-focus'));
      h.nodes[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ---------------------------------------------------- auto highlight ---

  function keywordsFrom(text) {
    const counts = new Map();
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .forEach((word) => {
        if (word.length < 4 || STOPWORDS.has(word)) return;
        counts.set(word, (counts.get(word) || 0) + 1);
      });
    return counts;
  }

  function candidateBlocks() {
    const selectors = 'article p, article li, main p, main li, [role="main"] p, p, li, h1, h2, h3, h4, blockquote';
    const seen = new Set();
    const blocks = [];
    document.querySelectorAll(selectors).forEach((node) => {
      if (seen.has(node) || isBobUi(node)) return;
      const text = (node.innerText || node.textContent || '').trim();
      if (text.length < 30 || text.length > 1500) return;
      if (node.closest('nav, header, footer, aside, form, #' + UI_ROOT_ID)) return;
      seen.add(node);
      blocks.push({ node, text });
    });

    // Fallback: if strict selectors found nothing, grab any paragraph or body text block
    if (!blocks.length) {
      document.querySelectorAll('p, div').forEach((node) => {
        if (seen.has(node) || isBobUi(node)) return;
        const text = (node.innerText || node.textContent || '').trim();
        if (text.length >= 40 && text.length <= 1500 && !node.querySelector('p, div')) {
          seen.add(node);
          blocks.push({ node, text });
        }
      });
    }

    return blocks;
  }

  async function autoHighlight(focusText) {
    if (highlights.length > 0 && !focusText) {
      // If highlights already exist, cycle/focus them and show peel
      stepNextHighlight();
      renderTrafficPill();
      showToast('✦ Highlighting peel active · Cycling highlights', 'ok');
      return { ok: true, count: highlights.length };
    }

    const blocks = candidateBlocks();
    if (!blocks.length) {
      showToast('✦ No text found on page to highlight', 'info');
      return { ok: true, count: 0 };
    }

    const keywords = keywordsFrom(focusText || document.title);
    const scored = blocks
      .map((block) => {
        const words = block.text.toLowerCase().split(/\s+/);
        let hits = 0;
        words.forEach((w) => {
          const c = w.replace(/[^a-z0-9-]/g, '');
          if (c && keywords.has(c)) hits += 1;
        });
        return { ...block, score: hits / Math.sqrt(words.length || 1) };
      })
      .sort((a, b) => b.score - a.score);

    const picked = scored.slice(0, 6);
    const colors = ['yellow', 'blue', 'green'];
    let count = 0;

    picked.forEach((item, index) => {
      const color = colors[index % colors.length];
      const range = document.createRange();
      try {
        range.selectNodeContents(item.node);
        const id = 'hl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        if (wrapRange(range, color, id)) count += 1;
      } catch {}
    });

    await refreshHighlights();
    showToast(`✦ Auto-highlighted ${count} key sections · Highlighting peel active`, 'ok');
    return { ok: true, count };
  }

  function wrapRange(range, color, id) {
    const mark = el('mark', `bob-hl bob-hl-${color}`);
    mark.setAttribute('data-bob-hl-id', id);
    mark.setAttribute('data-bob-color', color);
    try {
      range.surroundContents(mark);
      return true;
    } catch {
      return false;
    }
  }

  function unwrapHighlight(id) {
    document.querySelectorAll(`mark[data-bob-hl-id="${id}"]`).forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      mark.remove();
    });
  }

  async function refreshHighlights() {
    const marks = Array.from(document.querySelectorAll('mark[data-bob-hl-id]'));
    const byId = new Map();
    marks.forEach((m) => {
      const id = m.getAttribute('data-bob-hl-id');
      const existing = byId.get(id);
      if (existing) {
        existing.nodes.push(m);
        existing.text += m.textContent;
      } else {
        byId.set(id, {
          id,
          color: m.getAttribute('data-bob-color') || 'yellow',
          text: m.textContent,
          nodes: [m],
          top: m.getBoundingClientRect().top + window.scrollY,
        });
      }
    });
    highlights = Array.from(byId.values()).sort((a, b) => a.top - b.top);
    renderTrafficPill();
  }

  // ------------------------------------------------------------- messages ---

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const type = message && message.type;

    if (type === 'BOB_AUTO_HIGHLIGHT') {
      autoHighlight(message.focus || '').then(sendResponse);
      return true;
    }

    if (type === 'BOB_CLEAR_PAGE_HIGHLIGHTS') {
      highlights.forEach((h) => unwrapHighlight(h.id));
      highlights = [];
      renderTrafficPill();
      sendResponse({ ok: true });
      return false;
    }

    if (type === 'BOB_EXTRACT_PAGE_TEXT') {
      const root = document.querySelector('article') || document.querySelector('main') || document.body;
      const text = (root.innerText || root.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
      sendResponse({ ok: true, title: document.title, url: location.href, excerpt: text.slice(0, 100000) });
      return false;
    }

    return false;
  });

  // -------------------------------------------------------------- wiring ---

  // Keyboard shortcuts:
  // - Ctrl+B then A (or Ctrl+B+A): Quick Ask
  // - Ctrl+B then H (or Ctrl+B+H): Auto-highlight page and display highlighting peel
  // - Escape: close Quick Ask card
  let chordPending = false;
  let chordTimer = null;
  let ctrlBPressed = false;

  document.addEventListener('keydown', (e) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    if (e.key === 'Escape') {
      closeQuickAskCard();
      return;
    }

    // Check chord pending (user previously hit Ctrl+B)
    if (chordPending) {
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        chordPending = false;
        clearTimeout(chordTimer);
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';
        const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        openQuickAskCard(text, range);
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        chordPending = false;
        clearTimeout(chordTimer);
        autoHighlight();
        return;
      }
    }

    // Ctrl+B pressed (start chord)
    if (isCtrl && (e.key === 'b' || e.key === 'B')) {
      chordPending = true;
      ctrlBPressed = true;
      clearTimeout(chordTimer);
      chordTimer = setTimeout(() => {
        chordPending = false;
        ctrlBPressed = false;
      }, 2000);
      return;
    }

    // Simultaneous chord with Ctrl held: Ctrl+B+A or Ctrl+B+H
    if (isCtrl && ctrlBPressed) {
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        chordPending = false;
        ctrlBPressed = false;
        clearTimeout(chordTimer);
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';
        const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        openQuickAskCard(text, range);
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        chordPending = false;
        ctrlBPressed = false;
        clearTimeout(chordTimer);
        autoHighlight();
        return;
      }
    }

    // Direct Ctrl+Shift+H auto-highlight fallback
    if (isCtrl && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      autoHighlight();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      ctrlBPressed = false;
    }
  });

  document.addEventListener('mouseup', (event) => {
    if (isBobUi(event.target)) return;
    setTimeout(handleSelectionChange, 15);
  });

  // When user copies text on the page, populate it into the Quick Ask card
  document.addEventListener('copy', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text && text.length >= 2) {
      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (range && !isBobUi(range.commonAncestorContainer)) {
        setTimeout(() => openQuickAskCard(text, range), 20);
      }
    }
  });

  // Clicking outside the card when it has no thread closes it
  document.addEventListener('mousedown', (event) => {
    if (isBobUi(event.target)) return;
    if (inlineColabCard && inlineColabCard.isConnected) {
      const thread = inlineColabCard.querySelector('#colab-thread');
      const input = inlineColabCard.querySelector('#colab-input');
      const hasChatted = thread && thread.children.length > 0;
      const hasInput = input && input.value.trim().length > 0;
      if (!hasChatted && !hasInput) {
        closeQuickAskCard();
      }
    }
  });
})();
