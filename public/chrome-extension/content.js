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

  const CATEGORY_COLOR_MAP = {
    claim: 'blue',
    data: 'green',
    definition: 'purple',
    conclusion: 'yellow',
    caveat: 'orange',
    action: 'pink'
  };

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
        <button class="bob-pill-nav-btn" id="btn-pill-play" type="button" title="Navigate highlights (Arrow keys: Up/Left = Prev, Down/Right = Next)">▶</button>
        <button class="bob-pill-clear-btn" id="btn-pill-clear" type="button" title="Close pill and clear highlights">✕</button>
        <div class="bob-pill-preview-card" id="traffic-preview-card"></div>
      `;
      root.appendChild(trafficPill);

      setupPillDrag(trafficPill);

      trafficPill.querySelector('#btn-pill-play').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNavigation();
      });

      trafficPill.querySelector('#btn-pill-clear').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAndClearTrafficPill();
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
      const circle = el('div', `bob-light-circle ${h.color || 'blue'}`);
      circle.setAttribute('data-idx', String(i));
      circle.title = `Jump to highlight ${i + 1} (${h.category || h.color})`;
      circle.addEventListener('click', () => focusHighlight(i));
      lightsContainer.appendChild(circle);
    });

    if (highlights.length > 3) {
      blurEl.style.display = 'block';
    } else {
      blurEl.style.display = 'none';
    }

    // Populate preview card on hover with ChatGPT-style single-line key sections
    const head = el('div', 'bob-preview-head');
    head.innerHTML = `
      <span class="bob-preview-title">Key Highlights</span>
      <span class="bob-preview-count">${highlights.length} found</span>
    `;
    previewCard.appendChild(head);

    highlights.slice(0, 8).forEach((h, i) => {
      const item = el('div', `bob-preview-item ${h.color || 'blue'}`);
      item.setAttribute('data-idx', String(i));
      const category = (h.category || h.color || 'Point').toUpperCase();
      const cleanSnippet = (h.text || '').replace(/\s+/g, ' ').trim();
      item.innerHTML = `
        <span class="bob-preview-badge ${h.color || 'blue'}">${escapeHtml(category)}</span>
        <span class="bob-preview-line">${escapeHtml(cleanSnippet)}</span>
      `;
      item.title = cleanSnippet;

      // Click navigates directly to that highlight
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        focusHighlight(i);
      });

      // Hover on preview item temporarily highlights in page
      item.addEventListener('mouseenter', () => {
        const targetEl = h.element || (h.range && h.range.startContainer && (h.range.startContainer.nodeType === Node.TEXT_NODE ? h.range.startContainer.parentElement : h.range.startContainer));
        if (targetEl) {
          targetEl.classList.add('bob-hl-focus');
        }
      });
      item.addEventListener('mouseleave', () => {
        const targetEl = h.element || (h.range && h.range.startContainer && (h.range.startContainer.nodeType === Node.TEXT_NODE ? h.range.startContainer.parentElement : h.range.startContainer));
        if (targetEl && activeNavIndex !== i) {
          targetEl.classList.remove('bob-hl-focus');
        }
      });

      previewCard.appendChild(item);
    });
  }

  function closeAndClearTrafficPill() {
    stopNavigation();
    if (trafficPill) {
      // Smooth slide-to-right exit animation
      trafficPill.classList.add('bob-pill-closing');
      trafficPill.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease';
      trafficPill.style.transform = 'translateX(140px)';
      trafficPill.style.opacity = '0';
      trafficPill.style.pointerEvents = 'none';
    }

    // Clear all highlights from page
    try {
      send({ type: 'CLEAR_PAGE_HIGHLIGHTS' });
      send({ type: 'CLEAR_HIGHLIGHTS' });
    } catch {}

    clearAllHighlights();

    document.querySelectorAll('.bob-highlight-pulse, .bob-hl-focus').forEach((el) => {
      el.classList.remove('bob-highlight-pulse', 'bob-hl-focus');
    });

    setTimeout(() => {
      if (trafficPill) {
        trafficPill.remove();
        trafficPill = null;
      }
    }, 320);
  }

  let isNavigating = false;

  function onNavKeyDown(e) {
    if (!isNavigating || !highlights.length) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;

    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      // Move to previous highlight unless on the first one
      if (activeNavIndex > 0) {
        activeNavIndex--;
        focusHighlight(activeNavIndex);
      } else {
        showToast('First highlight reached', 'info');
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      // Move down to next highlight
      if (activeNavIndex < highlights.length - 1) {
        activeNavIndex++;
        focusHighlight(activeNavIndex);
      } else {
        showToast('Last highlight reached', 'info');
      }
    } else if (e.key === 'Escape') {
      stopNavigation();
      showToast('Highlight navigation closed', 'info');
    }
  }

  function toggleNavigation() {
    if (isNavigating) {
      if (activeNavIndex < highlights.length - 1) {
        activeNavIndex++;
        focusHighlight(activeNavIndex);
      } else {
        activeNavIndex = 0;
        focusHighlight(0);
      }
    } else {
      startNavigation();
    }
  }

  function startNavigation() {
    if (!highlights.length) return;
    isNavigating = true;
    window.addEventListener('keydown', onNavKeyDown);
    const playBtn = trafficPill?.querySelector('#btn-pill-play');
    if (playBtn) {
      playBtn.classList.add('active');
      playBtn.title = 'Navigation active (Up/Left = Prev, Down/Right = Next, Esc = Exit)';
    }
    if (activeNavIndex < 0 || activeNavIndex >= highlights.length) {
      activeNavIndex = 0;
    }
    focusHighlight(activeNavIndex);
    showToast(`Highlight 1 of ${highlights.length} · Use ↑/← or ↓/→ to navigate`, 'ok');
  }

  function stopNavigation() {
    isNavigating = false;
    window.removeEventListener('keydown', onNavKeyDown);
    const playBtn = trafficPill?.querySelector('#btn-pill-play');
    if (playBtn) {
      playBtn.classList.remove('active');
      playBtn.title = 'Navigate highlights (Arrow keys: Up/Left = Prev, Down/Right = Next)';
    }
    document.querySelectorAll('.bob-light-circle.active, .bob-preview-item.active').forEach((el) => {
      el.classList.remove('active');
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

  function focusHighlight(indexOrId) {
    let index = -1;
    if (typeof indexOrId === 'number') {
      index = indexOrId;
    } else {
      index = highlights.findIndex((h) => h.id === indexOrId);
    }
    if (index < 0 || !highlights[index]) return;
    activeNavIndex = index;
    const h = highlights[index];

    // Remove previous active outline / pulse
    document.querySelectorAll('.bob-highlight-pulse, .bob-hl-focus').forEach((el) => {
      el.classList.remove('bob-highlight-pulse', 'bob-hl-focus');
    });

    // Highlight active circle and preview item in standing pill
    if (trafficPill) {
      trafficPill.querySelectorAll('.bob-light-circle.active, .bob-preview-item.active').forEach((el) => {
        el.classList.remove('active');
      });
      const activeCircle = trafficPill.querySelector(`.bob-light-circle[data-idx="${index}"]`);
      if (activeCircle) activeCircle.classList.add('active');
      const activeItem = trafficPill.querySelector(`.bob-preview-item[data-idx="${index}"]`);
      if (activeItem) {
        activeItem.classList.add('active');
        activeItem.scrollIntoView?.({ block: 'nearest' });
      }
    }

    let targetEl = h.element || (h.nodes && h.nodes[0]) || (h.range && h.range.startContainer && (h.range.startContainer.nodeType === Node.TEXT_NODE ? h.range.startContainer.parentElement : h.range.startContainer));
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('bob-highlight-pulse');
      setTimeout(() => {
        if (targetEl) targetEl.classList.remove('bob-highlight-pulse');
      }, 1900);
    }
  }

  // ---------------------------------------------------- auto highlight ---

  function candidateBlocks() {
    const selectors = 'article p, article li, main p, main li, [role="main"] p, [role="main"] li, p, li, h1, h2, h3, h4, blockquote';
    const seen = new Set();
    const blocks = [];
    let idx = 0;

    document.querySelectorAll(selectors).forEach((node) => {
      if (seen.has(node) || isBobUi(node)) return;
      // Skip hidden or zero-size elements
      if (node.offsetParent === null && node.tagName !== 'BODY') return;
      if (node.closest('nav, header, footer, aside, form, button, svg, script, style, dialog, input, textarea, select, #' + UI_ROOT_ID)) return;
      
      const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length < 35 || text.length > 2500) return;
      
      seen.add(node);
      const id = `b_${idx++}`;
      node.setAttribute('data-bob-block-id', id);
      blocks.push({ id, node, text });
    });

    // Fallback: if strict selectors found nothing, grab any paragraph or body text block
    if (!blocks.length) {
      document.querySelectorAll('p, div').forEach((node) => {
        if (seen.has(node) || isBobUi(node)) return;
        if (node.offsetParent === null) return;
        if (node.closest('nav, header, footer, aside, form, button, svg, script, style, dialog, #' + UI_ROOT_ID)) return;
        const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
        if (text.length >= 40 && text.length <= 2500 && !node.querySelector('p, div, article, main')) {
          seen.add(node);
          const id = `b_${idx++}`;
          node.setAttribute('data-bob-block-id', id);
          blocks.push({ id, node, text });
        }
      });
    }

    return blocks;
  }

  // Helper: locate Range of exact quote inside a DOM container
  function findQuoteRange(containerNode, quote) {
    if (!containerNode || !quote) return null;
    const cleanQuote = quote.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!cleanQuote) return null;

    // Collect all text nodes and their character offsets
    const walker = document.createTreeWalker(containerNode, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_SKIP;
        if (isBobUi(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    let fullText = '';
    let current;
    while ((current = walker.nextNode())) {
      textNodes.push({
        node: current,
        start: fullText.length,
        end: fullText.length + current.textContent.length
      });
      fullText += current.textContent;
    }

    // Try finding exact quote in fullText
    let matchIndex = fullText.toLowerCase().indexOf(cleanQuote);
    let matchLen = cleanQuote.length;

    // Fallback: try normalized whitespace search
    if (matchIndex === -1) {
      const normText = fullText.replace(/\s+/g, ' ').toLowerCase();
      const normIdx = normText.indexOf(cleanQuote);
      if (normIdx !== -1) {
        // Approximate character position in original text
        matchIndex = normIdx;
        matchLen = cleanQuote.length;
      }
    }

    if (matchIndex === -1) return null;

    // Find start text node and end text node
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;

    for (const item of textNodes) {
      if (!startNode && matchIndex >= item.start && matchIndex < item.end) {
        startNode = item.node;
        startOffset = matchIndex - item.start;
      }
      const matchEnd = matchIndex + matchLen;
      if (matchEnd > item.start && matchEnd <= item.end) {
        endNode = item.node;
        endOffset = matchEnd - item.start;
        break;
      }
    }

    if (!startNode) return null;
    if (!endNode) {
      endNode = textNodes[textNodes.length - 1].node;
      endOffset = endNode.textContent.length;
    }

    try {
      const range = document.createRange();
      range.setStart(startNode, Math.min(startOffset, startNode.textContent.length));
      range.setEnd(endNode, Math.min(endOffset, endNode.textContent.length));
      return range;
    } catch {
      return null;
    }
  }

  function clearAllHighlights() {
    // 1. Clear CSS Custom Highlights
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
      ['bob-hl-claim', 'bob-hl-data', 'bob-hl-definition', 'bob-hl-conclusion', 'bob-hl-caveat', 'bob-hl-action', 'bob-hl-top'].forEach((k) => {
        try { CSS.highlights.delete(k); } catch {}
      });
    }

    // 2. Clear Fallback DOM <mark> elements
    document.querySelectorAll('mark.bob-hl').forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      mark.remove();
    });

    highlights = [];
    renderTrafficPill();
  }

  function applyHighlights(items = [], goal = '') {
    clearAllHighlights();
    if (!Array.isArray(items) || !items.length) return;

    const hasCssHighlight = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
    const categoryRanges = {
      claim: [],
      data: [],
      definition: [],
      conclusion: [],
      caveat: [],
      action: [],
    };
    const topRanges = [];
    const validHighlights = [];

    items.forEach((item, index) => {
      if (!item || !item.quote) return;
      const quote = String(item.quote).trim();
      const blockId = String(item.blockId || '');

      let blockEl = blockId ? document.querySelector(`[data-bob-block-id="${blockId}"]`) : null;
      let range = findQuoteRange(blockEl, quote);

      // If not found in assigned block, search whole article or body
      if (!range) {
        const root = document.querySelector('article') || document.querySelector('main') || document.body;
        range = findQuoteRange(root, quote);
      }

      if (!range) {
        // Quote could not be verified on the live DOM, skip it to prevent fake highlights!
        return;
      }

      const cat = (item.category || 'conclusion').toLowerCase();
      if (categoryRanges[cat]) {
        categoryRanges[cat].push(range);
      } else {
        categoryRanges.conclusion.push(range);
      }

      if (index === 0) {
        topRanges.push(range);
      }

      const startEl = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;

      // Fallback wrapping if CSS Custom Highlight API is unsupported
      if (!hasCssHighlight) {
        try {
          const mark = el('mark', `bob-hl bob-hl-${cat}${index === 0 ? ' bob-hl-top' : ''}`);
          mark.setAttribute('data-bob-hl-id', item.id);
          mark.setAttribute('data-bob-category', cat);
          range.surroundContents(mark);
        } catch {
          // surroundContents can fail if crossing boundaries; ignore and rely on element positioning
        }
      }

      validHighlights.push({
        id: item.id || 'hl_' + index,
        quote,
        reason: item.reason || 'Key passage',
        category: cat,
        score: item.score || 0.8,
        color: CATEGORY_COLOR_MAP[cat] || 'blue',
        range,
        element: startEl,
        top: (startEl && startEl.getBoundingClientRect().top + window.scrollY) || 0,
        text: quote
      });
    });

    // Register CSS Custom Highlights
    if (hasCssHighlight) {
      Object.keys(categoryRanges).forEach((cat) => {
        const ranges = categoryRanges[cat];
        if (ranges.length > 0) {
          try {
            CSS.highlights.set(`bob-hl-${cat}`, new Highlight(...ranges));
          } catch (e) {
            console.warn('[Bob Highlight] CSS highlight registration failed:', e);
          }
        }
      });
      if (topRanges.length > 0) {
        try {
          CSS.highlights.set('bob-hl-top', new Highlight(...topRanges));
        } catch {}
      }
    }

    highlights = validHighlights.sort((a, b) => a.top - b.top);
    renderTrafficPill();
  }

  async function autoHighlight(goal = '') {
    const blocks = candidateBlocks();
    if (!blocks.length) {
      showToast('✦ No readable text found on page', 'info');
      return { ok: false, reason: 'no-text' };
    }

    showToast('✦ Asking Gemini to highlight key passages…', 'ok');

    const blocksPayload = blocks.map((b) => ({ id: b.id, text: b.text }));
    const res = await send({
      type: 'ANALYZE_PAGE_FOR_HIGHLIGHTS',
      blocks: blocksPayload,
      goal: goal || '',
      title: document.title,
      url: location.href
    });

    if (res && res.ok && Array.isArray(res.highlights)) {
      applyHighlights(res.highlights, goal);
      showToast(`✦ Highlighted ${res.highlights.length} key sections · Peel active`, 'ok');
      return { ok: true, count: res.highlights.length };
    } else {
      showToast(`✦ Highlighting failed: ${res.message || res.detail || 'Could not verify passages'}`, 'info');
      return res;
    }
  }

  // ------------------------------------------------------------- shortcut ---
  let ctrlBChordTime = 0;
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = e.key ? e.key.toLowerCase() : '';

    if (isCtrlOrCmd && key === 'b') {
      ctrlBChordTime = Date.now();
      return;
    }

    const isChord = Date.now() - ctrlBChordTime < 1800 && key === 'h';
    const isShiftCombo = isCtrlOrCmd && e.shiftKey && key === 'h';
    if (isChord || isShiftCombo) {
      e.preventDefault();
      ctrlBChordTime = 0;
      send({ type: 'TRIGGER_AUTO_HIGHLIGHT' });
      showToast('✦ Bob Auto-Highlight requested (Ctrl+B+H)', 'ok');
    }
  });

  // ------------------------------------------------------------- messages ---

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const type = message && message.type;

    if (type === 'BOB_AUTO_HIGHLIGHT') {
      autoHighlight(message.goal || message.focus || '').then(sendResponse);
      return true;
    }

    if (type === 'BOB_RENDER_HIGHLIGHTS') {
      applyHighlights(message.highlights || [], message.goal || '');
      sendResponse({ ok: true });
      return false;
    }

    if (type === 'BOB_FOCUS_HIGHLIGHT') {
      focusHighlight(message.id);
      sendResponse({ ok: true });
      return false;
    }

    if (type === 'BOB_CLEAR_PAGE_HIGHLIGHTS') {
      clearAllHighlights();
      sendResponse({ ok: true });
      return false;
    }

    if (type === 'BOB_EXTRACT_PAGE_BLOCKS') {
      const blocks = candidateBlocks().map((b) => ({ id: b.id, text: b.text }));
      sendResponse({ ok: true, blocks, title: document.title, url: location.href });
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

  // -------------------------------------------------- SPA & Mutation Observer ---
  let mutationTimer = null;
  let lastHref = location.href;

  const observer = new MutationObserver(() => {
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => {
      // Check if URL changed in SPA navigation
      if (location.href !== lastHref) {
        lastHref = location.href;
        clearAllHighlights();
        // Restore highlights for new URL if stored
        send({ type: 'GET_HIGHLIGHTS', url: location.href }).then((res) => {
          if (res && res.ok && Array.isArray(res.highlights) && res.highlights.length) {
            applyHighlights(res.highlights);
          }
        });
      }
    }, 750);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Restore existing highlights on initial load
  send({ type: 'GET_HIGHLIGHTS', url: location.href }).then((res) => {
    if (res && res.ok && Array.isArray(res.highlights) && res.highlights.length) {
      applyHighlights(res.highlights);
    }
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
