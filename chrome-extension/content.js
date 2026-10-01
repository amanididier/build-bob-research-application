// Bob Research Companion — content script
//
// Provides: the selection card (Copy | Notes | Ask Bob), the bottom Ask-Bob
// chat card, a real highlight engine (manual + relevance-based) with anchors
// that survive reloads, and the highlight navigation rail.

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

  const COLOR_LABEL = { green: 'Research critical', blue: 'Supporting', yellow: 'Reference' };

  let uiRoot = null;
  let selectionCard = null;
  let chatCard = null;
  let rail = null;
  let toast = null;
  let currentSelection = { text: '', range: null };
  let highlights = []; // rendered highlight descriptors, in document order
  let navMode = false;
  let navIndex = -1;

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
      if (el.id === UI_ROOT_ID || el.getAttribute && el.getAttribute('data-bob-ui') === '1') return true;
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

  function showToast(message, tone) {
    const root = ensureRoot();
    if (!toast) {
      toast = el('div', 'bob-toast');
      toast.setAttribute('role', 'status');
      root.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `bob-toast bob-toast-${tone || 'ok'} bob-toast-show`;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      if (toast) toast.className = 'bob-toast';
    }, 1800);
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

  // ------------------------------------------------------- selection card ---

  function buildSelectionCard() {
    const card = el('div', 'bob-card bob-card-hidden');
    card.setAttribute('role', 'toolbar');
    card.setAttribute('aria-label', 'Bob selection actions');

    const actions = [
      { id: 'copy', label: 'Copy', icon: copyIcon() },
      { id: 'notes', label: 'Notes', icon: noteIcon() },
      { id: 'ask', label: 'Ask Bob', icon: sparkIcon(), primary: true },
    ];

    actions.forEach((action, index) => {
      const button = el('button', `bob-card-action${action.primary ? ' primary' : ''}`);
      button.type = 'button';
      button.dataset.action = action.id;
      button.innerHTML = action.icon;
      button.appendChild(el('span', null, action.label));
      button.tabIndex = 0;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleCardAction(action.id);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const buttons = Array.from(card.querySelectorAll('.bob-card-action'));
          const next = buttons[(index + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
          if (next) next.focus();
        }
      });
      card.appendChild(button);
    });

    ensureRoot().appendChild(card);
    return card;
  }

  function copyIcon() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  }

  function noteIcon() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  }

  function sparkIcon() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>';
  }

  function positionCard(rect) {
    if (!selectionCard) return;
    const cardWidth = selectionCard.offsetWidth || 210;
    const cardHeight = selectionCard.offsetHeight || 34;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let left = rect.left + scrollX + rect.width / 2 - cardWidth / 2;
    left = Math.max(8 + scrollX, Math.min(left, scrollX + document.documentElement.clientWidth - cardWidth - 8));

    let top = rect.top + scrollY - cardHeight - 10;
    if (rect.top < cardHeight + 16) top = rect.bottom + scrollY + 10;

    selectionCard.style.left = `${Math.round(left)}px`;
    selectionCard.style.top = `${Math.round(top)}px`;
  }

  function handleSelectionChange() {
    const selection = window.getSelection();
    const text = selection && selection.toString ? selection.toString().trim() : '';

    if (!text || text.length < 3 || !selection.rangeCount) {
      hideSelectionCard();
      return;
    }

    const range = selection.getRangeAt(0);
    if (isBobUi(range.commonAncestorContainer)) {
      hideSelectionCard();
      return;
    }

    currentSelection = { text, range: range.cloneRange() };
    if (!selectionCard) selectionCard = buildSelectionCard();
    positionCard(range.getBoundingClientRect());
    selectionCard.classList.remove('bob-card-hidden');
  }

  function hideSelectionCard() {
    if (selectionCard) selectionCard.classList.add('bob-card-hidden');
  }

  async function handleCardAction(action) {
    const { text, range } = currentSelection;
    if (!text) return;
    hideSelectionCard();

    if (action === 'copy') {
      const copied = await copyText(text);
      showToast(copied ? 'Copied to clipboard' : 'Copy blocked by this page', copied ? 'ok' : 'warn');
      return;
    }

    if (action === 'notes') {
      const result = await send({
        type: 'SAVE_NOTE',
        data: { text, pageTitle: document.title, url: location.href, origin: 'selection-card' },
      });
      if (result && result.ok) {
        showToast('✓ Saved to Notes', 'ok');
        if (range) flashRange(range, 'saved');
      } else {
        showToast('Could not save note', 'warn');
      }
      return;
    }

    if (action === 'ask') {
      openChatCard(text);
    }
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through to the legacy path */
    }
    try {
      const area = el('textarea', 'bob-clip-helper');
      area.value = text;
      area.setAttribute('readonly', '');
      ensureRoot().appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }

  function flashRange(range, kind) {
    try {
      const rect = range.getBoundingClientRect();
      const flash = el('div', `bob-flash bob-flash-${kind}`);
      flash.style.top = `${rect.top + window.scrollY}px`;
      flash.style.left = `${rect.left + window.scrollX}px`;
      flash.style.width = `${rect.width}px`;
      flash.style.height = `${Math.max(rect.height, 14)}px`;
      ensureRoot().appendChild(flash);
      setTimeout(() => flash.remove(), 700);
    } catch {
      /* purely decorative */
    }
  }

  // ------------------------------------------------------------ chat card ---

  function openChatCard(selectedText) {
    const root = ensureRoot();
    if (chatCard) chatCard.remove();

    chatCard = el('div', 'bob-chat');
    chatCard.setAttribute('data-bob-ui', '1');
    chatCard.innerHTML = `
      <div class="bob-chat-head">
        <span class="bob-chat-title">Ask Bob</span>
        <button class="bob-chat-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="bob-chat-excerpt"></div>
      <div class="bob-chat-thread"></div>
      <form class="bob-chat-form">
        <textarea class="bob-chat-input" rows="1" placeholder="Why does this matter for my research?" aria-label="Ask Bob about this passage"></textarea>
        <button class="bob-chat-send" type="submit" aria-label="Send">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    `;

    chatCard.querySelector('.bob-chat-excerpt').textContent = `“${selectedText.slice(0, 240)}${selectedText.length > 240 ? '…' : ''}”`;
    chatCard.querySelector('.bob-chat-close').addEventListener('click', closeChatCard);

    const form = chatCard.querySelector('.bob-chat-form');
    const input = chatCard.querySelector('.bob-chat-input');

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeChatCard();
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const prompt = input.value.trim();
      if (!prompt) return;
      input.value = '';
      input.style.height = 'auto';
      await askQuestion(prompt, selectedText);
    });

    root.appendChild(chatCard);
    requestAnimationFrame(() => chatCard.classList.add('bob-chat-open'));
    setTimeout(() => input.focus(), 60);
  }

  function closeChatCard() {
    if (!chatCard) return;
    chatCard.classList.remove('bob-chat-open');
    const node = chatCard;
    chatCard = null;
    setTimeout(() => node.remove(), 180);
  }

  function appendThreadMessage(role, text) {
    if (!chatCard) return null;
    const thread = chatCard.querySelector('.bob-chat-thread');
    const msg = el('div', `bob-chat-msg ${role}`);
    msg.textContent = text;
    thread.appendChild(msg);
    thread.scrollTop = thread.scrollHeight;
    return msg;
  }

  async function askQuestion(prompt, selectedText) {
    const placeholder = appendThreadMessage('bob', 'Reading this passage…');
    const result = await send({
      type: 'CHAT',
      prompt,
      context: {
        title: document.title,
        url: location.href,
        selection: selectedText,
        excerpt: collectPageText(4000),
      },
    });

    if (!placeholder) return;

    if (result && result.ok && result.reply) {
      placeholder.textContent = result.reply;
      return;
    }

    const reason = result && result.reason;
    if (reason === 'no-key') {
      placeholder.textContent = 'No Gemini API key is connected yet. Open the Bob side panel → Tools → Bridge to paste your Google AI Studio key. Bob will not invent an answer without one.';
    } else if (reason === 'bad-key') {
      placeholder.textContent = 'Google rejected that API key (401/403). Check it in the side panel under Tools → Bridge.';
    } else if (reason === 'rate-limited') {
      placeholder.textContent = 'Google rate-limited this key (429). Try again in a minute.';
    } else {
      placeholder.textContent = `Bob could not reach Gemini (${reason || 'unknown error'}). Your selection is saved in this card — nothing was guessed.`;
    }
  }

  // ------------------------------------------------------------- indexing ---

  function indexTextNodes(root) {
    const nodes = [];
    let text = '';
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.length) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return NodeFilter.FILTER_REJECT;
        if (isBobUi(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    while (walker.nextNode()) {
      const node = walker.currentNode;
      nodes.push({ node, start: text.length, length: node.nodeValue.length });
      text += node.nodeValue;
    }
    return { nodes, text };
  }

  function offsetToPosition(index, offset) {
    for (let i = 0; i < index.nodes.length; i += 1) {
      const entry = index.nodes[i];
      if (offset >= entry.start && offset <= entry.start + entry.length) {
        return { node: entry.node, offset: offset - entry.start };
      }
    }
    return null;
  }

  function buildRange(index, start, end) {
    const from = offsetToPosition(index, start);
    const to = offsetToPosition(index, end);
    if (!from || !to) return null;
    const range = document.createRange();
    try {
      range.setStart(from.node, from.offset);
      range.setEnd(to.node, to.offset);
    } catch {
      return null;
    }
    return range;
  }

  // ----------------------------------------------------------- highlight ---

  function wrapRange(range, color, id) {
    const ancestor = range.commonAncestorContainer;
    const root = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor;
    if (!root) return 0;

    const candidates = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (isBobUi(node)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    while (walker.nextNode()) candidates.push(walker.currentNode);

    let wrapped = 0;
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const node = candidates[i];
      const length = node.nodeValue.length;
      const start = node === range.startContainer ? range.startOffset : 0;
      const end = node === range.endContainer ? range.endOffset : length;
      if (start >= end || end > length) continue;

      let target = node;
      if (end < target.nodeValue.length) target.splitText(end);
      if (start > 0) target = target.splitText(start);

      const mark = document.createElement('mark');
      mark.className = `bob-hl bob-hl-${color}`;
      mark.setAttribute('data-bob-hl-id', id);
      mark.setAttribute('data-bob-color', color);
      target.parentNode.replaceChild(mark, target);
      mark.appendChild(target);
      wrapped += 1;
    }
    return wrapped;
  }

  function unwrapHighlight(id) {
    const marks = document.querySelectorAll(`mark[data-bob-hl-id="${CSS.escape(id)}"]`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  function describeAnchor(index, start, end) {
    const text = index.text;
    return {
      exact: text.slice(start, end),
      prefix: text.slice(Math.max(0, start - 60), start),
      suffix: text.slice(end, end + 60),
      start,
      end,
    };
  }

  function locateAnchor(index, anchor) {
    const { text } = index;
    if (!anchor || !anchor.exact) return null;

    const direct = Number.isInteger(anchor.start) ? anchor.start : -1;
    if (direct >= 0 && text.slice(direct, direct + anchor.exact.length) === anchor.exact) {
      return { start: direct, end: direct + anchor.exact.length };
    }

    if (anchor.prefix || anchor.suffix) {
      const needle = `${anchor.prefix || ''}${anchor.exact}${anchor.suffix || ''}`;
      const at = text.indexOf(needle);
      if (at >= 0) {
        const start = at + (anchor.prefix || '').length;
        return { start, end: start + anchor.exact.length };
      }
    }

    let best = -1;
    let bestDistance = Infinity;
    let cursor = text.indexOf(anchor.exact);
    while (cursor >= 0) {
      const distance = Math.abs(cursor - (anchor.start || 0));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = cursor;
      }
      cursor = text.indexOf(anchor.exact, cursor + 1);
    }
    if (best >= 0) return { start: best, end: best + anchor.exact.length };

    return null;
  }

  function makeHighlightRecord({ color, anchor, source, reason }) {
    return {
      id: `hl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      url: location.href,
      pageTitle: document.title,
      selectedText: anchor.exact,
      color,
      anchor,
      source: source || 'manual',
      reason: reason || null,
      createdAt: new Date().toISOString(),
    };
  }

  async function highlightCurrentSelection(color) {
    const selection = window.getSelection();
    const text = selection && selection.toString ? selection.toString().trim() : '';
    if (!text || !selection.rangeCount) return { ok: false, reason: 'no-selection' };

    const range = selection.getRangeAt(0);
    if (isBobUi(range.commonAncestorContainer)) return { ok: false, reason: 'ui-selection' };

    const index = indexTextNodes(document.body);
    const rangeStart = absoluteOffset(index, range.startContainer, range.startOffset);
    const rangeEnd = absoluteOffset(index, range.endContainer, range.endOffset);
    if (rangeStart === null || rangeEnd === null || rangeEnd <= rangeStart) {
      return { ok: false, reason: 'could-not-anchor' };
    }

    const anchor = describeAnchor(index, rangeStart, rangeEnd);
    const record = makeHighlightRecord({ color, anchor, source: 'manual' });
    const wrapped = wrapRange(range, color, record.id);
    if (!wrapped) return { ok: false, reason: 'could-not-render' };

    selection.removeAllRanges();
    hideSelectionCard();

    const saved = await send({ type: 'SAVE_HIGHLIGHT', highlight: record });
    await refreshHighlights();
    showToast(
      saved && saved.ok ? `Highlighted · ${COLOR_LABEL[color] || color}` : 'Highlighted locally (not saved)',
      saved && saved.ok ? 'ok' : 'warn'
    );
    return { ok: true, highlight: record };
  }

  function absoluteOffset(index, container, offset) {
    if (!container) return null;
    if (container.nodeType === Node.TEXT_NODE) {
      const entry = index.nodes.find((item) => item.node === container);
      return entry ? entry.start + offset : null;
    }
    const child = container.childNodes[offset];
    if (!child) {
      const last = index.nodes[index.nodes.length - 1];
      return last ? last.start + last.length : null;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      const entry = index.nodes.find((item) => item.node === child);
      return entry ? entry.start : null;
    }
    const entry = index.nodes.find((item) => child.contains(item.node));
    return entry ? entry.start : null;
  }

  async function renderStoredHighlights(records) {
    const index = indexTextNodes(document.body);
    const planned = [];

    (records || []).forEach((record) => {
      const found = locateAnchor(index, record.anchor);
      if (!found) return;
      const range = buildRange(index, found.start, found.end);
      if (!range) return;
      planned.push({ record, range, start: found.start });
    });

    planned.sort((a, b) => b.start - a.start);
    let rendered = 0;
    planned.forEach(({ record, range }) => {
      unwrapHighlight(record.id);
      if (wrapRange(range, record.color, record.id)) rendered += 1;
    });

    await refreshHighlights();
    return { ok: true, rendered, total: (records || []).length };
  }

  async function refreshHighlights() {
    const marks = Array.from(document.querySelectorAll('mark[data-bob-hl-id]'));
    const byId = new Map();
    marks.forEach((mark) => {
      const id = mark.getAttribute('data-bob-hl-id');
      const existing = byId.get(id);
      if (existing) {
        existing.text += mark.textContent;
        existing.nodes.push(mark);
      } else {
        byId.set(id, {
          id,
          color: mark.getAttribute('data-bob-color') || 'yellow',
          text: mark.textContent,
          nodes: [mark],
          top: mark.getBoundingClientRect().top + window.scrollY,
        });
      }
    });
    highlights = Array.from(byId.values()).sort((a, b) => a.top - b.top);
    renderRail();
    return highlights;
  }

  // ------------------------------------------------------- auto highlight ---

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
    const selectors = 'article p, article li, main p, main li, [role="main"] p, [role="main"] li, p, li, h2, h3, h4, td';
    const seen = new Set();
    const blocks = [];
    document.querySelectorAll(selectors).forEach((node) => {
      if (seen.has(node) || isBobUi(node)) return;
      if (node.closest('#' + UI_ROOT_ID)) return;
      const text = (node.innerText || node.textContent || '').trim();
      if (text.length < 70 || text.length > 900) return;
      if (node.closest('nav, header, footer, aside, form')) return;
      seen.add(node);
      blocks.push({ node, text });
    });
    return blocks;
  }

  async function autoHighlight(focusText) {
    const keywords = keywordsFrom(focusText);
    if (!keywords.size) return { ok: false, reason: 'no-research-focus' };

    const blocks = candidateBlocks();
    if (!blocks.length) return { ok: true, count: 0, reason: 'no-candidate-text' };

    const scored = blocks
      .map((block) => {
        const words = block.text.toLowerCase().split(/\s+/);
        let hits = 0;
        const matched = new Set();
        words.forEach((word) => {
          const clean = word.replace(/[^a-z0-9-]/g, '');
          if (!clean) return;
          for (const [keyword, weight] of keywords) {
            if (clean === keyword || (clean.length > 5 && clean.startsWith(keyword))) {
              hits += 1 + Math.min(weight, 4) * 0.25;
              matched.add(keyword);
              break;
            }
          }
        });
        if (!matched.size) return null;
        const density = hits / Math.sqrt(words.length);
        return { ...block, score: density, matched: Array.from(matched).slice(0, 5) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return { ok: true, count: 0, reason: 'no-matches' };

    // Drop nested duplicates (e.g. a <p> inside an already picked <li>) so the
    // ranges we wrap never overlap.
    const picked = [];
    scored.forEach((item) => {
      if (picked.length >= 12) return;
      const overlaps = picked.some((other) => other.node.contains(item.node) || item.node.contains(other.node));
      if (!overlaps) picked.push(item);
    });
    if (!picked.length) return { ok: true, count: 0, reason: 'no-renderable-match' };

    const index = indexTextNodes(document.body);
    const created = [];

    for (const item of picked) {
      const range = document.createRange();
      try {
        range.selectNodeContents(item.node);
      } catch {
        continue;
      }
      const start = absoluteOffset(index, range.startContainer, range.startOffset);
      const end = absoluteOffset(index, range.endContainer, range.endOffset);
      if (start === null || end === null || end <= start) continue;

      const rank = picked.indexOf(item);
      const color = rank < Math.ceil(picked.length / 3) ? 'green' : rank < Math.ceil((picked.length * 2) / 3) ? 'blue' : 'yellow';
      const anchor = describeAnchor(index, start, end);
      const record = makeHighlightRecord({
        color,
        anchor,
        source: 'auto',
        reason: `Matched ${item.matched.map((m) => `"${m}"`).join(', ')} · relevance ${(item.score * 20).toFixed(0)}`,
      });
      if (wrapRange(range, color, record.id)) created.push(record);
    }

    for (const record of created) {
      await send({ type: 'SAVE_HIGHLIGHT', highlight: record });
    }
    await refreshHighlights();
    return { ok: true, count: created.length, reason: created.length ? 'matched' : 'no-renderable-match' };
  }

  // ------------------------------------------------------------- the rail ---

  function renderRail() {
    if (!highlights.length) {
      if (rail) {
        rail.remove();
        rail = null;
      }
      return;
    }

    const root = ensureRoot();
    if (!rail) {
      rail = el('div', 'bob-rail');
      rail.setAttribute('data-bob-ui', '1');
      rail.innerHTML = `
        <div class="bob-rail-head" title="Highlights on this page">
          <span class="bob-rail-count">0</span>
        </div>
        <div class="bob-rail-markers"></div>
        <button class="bob-rail-nav" type="button" title="Start highlight walk-through (↑ ↓ to move, Esc to exit)">▶</button>
        <div class="bob-rail-preview"></div>
      `;
      root.appendChild(rail);
      rail.querySelector('.bob-rail-nav').addEventListener('click', () => enterNavMode(0));
    }

    const markers = rail.querySelector('.bob-rail-markers');
    markers.textContent = '';
    rail.querySelector('.bob-rail-count').textContent = String(highlights.length);

    highlights.forEach((highlight, index) => {
      const marker = el('button', `bob-marker bob-marker-${highlight.color}`);
      marker.type = 'button';
      marker.setAttribute('aria-label', `${COLOR_LABEL[highlight.color] || highlight.color} highlight ${index + 1}`);
      marker.addEventListener('mouseenter', () => showPreview(highlight, marker));
      marker.addEventListener('mouseleave', hidePreview);
      marker.addEventListener('focus', () => showPreview(highlight, marker));
      marker.addEventListener('blur', hidePreview);
      marker.addEventListener('click', () => enterNavMode(index));
      markers.appendChild(marker);
    });
  }

  function showPreview(highlight, marker) {
    if (!rail) return;
    const preview = rail.querySelector('.bob-rail-preview');
    const text = (highlight.text || '').trim().replace(/\s+/g, ' ');
    preview.textContent = '';
    preview.appendChild(el('div', 'bob-preview-color', COLOR_LABEL[highlight.color] || highlight.color));
    preview.appendChild(el('div', 'bob-preview-text', `“${text.slice(0, 160)}${text.length > 160 ? '…' : ''}”`));

    const jump = el('button', 'bob-preview-jump', 'Jump to highlight');
    jump.type = 'button';
    jump.addEventListener('click', () => enterNavMode(highlights.indexOf(highlight)));
    preview.appendChild(jump);

    const markerRect = marker.getBoundingClientRect();
    preview.style.top = `${markerRect.top + markerRect.height / 2}px`;
    preview.classList.add('bob-preview-open');
  }

  function hidePreview() {
    if (!rail) return;
    rail.querySelector('.bob-rail-preview').classList.remove('bob-preview-open');
  }

  function enterNavMode(index) {
    if (!highlights.length) return;
    navMode = true;
    navIndex = Math.max(0, Math.min(index, highlights.length - 1));
    if (rail) rail.classList.add('bob-rail-active');
    focusHighlight(navIndex);
    showToast(`Highlight ${navIndex + 1} of ${highlights.length} · ↑ ↓ to move · Esc to exit`, 'info');
  }

  function exitNavMode() {
    if (!navMode) return;
    navMode = false;
    navIndex = -1;
    if (rail) rail.classList.remove('bob-rail-active');
  }

  function focusHighlight(index) {
    const highlight = highlights[index];
    if (!highlight || !highlight.nodes.length) return;
    highlights.forEach((item) => item.nodes.forEach((node) => node.classList.remove('bob-hl-focus')));
    highlight.nodes.forEach((node) => node.classList.add('bob-hl-focus'));
    const first = highlight.nodes[0];
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (rail) rail.querySelector('.bob-rail-count').textContent = `${index + 1}/${highlights.length}`;
  }

  document.addEventListener(
    'keydown',
    (event) => {
      if (!navMode) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        exitNavMode();
        if (rail) rail.querySelector('.bob-rail-count').textContent = String(highlights.length);
        highlights.forEach((item) => item.nodes.forEach((node) => node.classList.remove('bob-hl-focus')));
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        navIndex = (navIndex + 1) % highlights.length;
        focusHighlight(navIndex);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        navIndex = (navIndex - 1 + highlights.length) % highlights.length;
        focusHighlight(navIndex);
      }
    },
    true
  );

  // -------------------------------------------------------- page reading ---

  function mainContentRoot() {
    return document.querySelector('article') || document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
  }

  function collectPageText(limit) {
    const root = mainContentRoot();
    const raw = root.innerText || root.textContent || '';
    return raw.replace(/\n{3,}/g, '\n\n').trim().slice(0, limit || 8000);
  }

  // ------------------------------------------------------------- messages ---

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const type = message && message.type;

    if (type === 'BOB_HIGHLIGHT_SELECTION') {
      highlightCurrentSelection(message.color || 'yellow').then(sendResponse);
      return true;
    }
    if (type === 'BOB_RENDER_HIGHLIGHTS') {
      renderStoredHighlights(message.highlights || []).then(sendResponse);
      return true;
    }
    if (type === 'BOB_AUTO_HIGHLIGHT') {
      autoHighlight(message.focus || '').then(sendResponse);
      return true;
    }
    if (type === 'BOB_EXTRACT_PAGE_TEXT') {
      sendResponse({ ok: true, title: document.title, url: location.href, excerpt: collectPageText(100000) });
      return false;
    }
    if (type === 'BOB_SAVE_SELECTION_AS_NOTE') {
      const text = currentSelection.text || (window.getSelection() || '').toString().trim();
      if (!text) {
        sendResponse({ ok: false, reason: 'no-selection' });
        return false;
      }
      send({ type: 'SAVE_NOTE', data: { text, pageTitle: document.title, url: location.href, origin: 'shortcut' } }).then((result) => {
        if (result && result.ok) showToast('✓ Saved to Notes', 'ok');
        sendResponse(result);
      });
      return true;
    }
    if (type === 'BOB_ASK_SELECTION') {
      const text = currentSelection.text || (window.getSelection() || '').toString().trim();
      if (!text) {
        sendResponse({ ok: false, reason: 'no-selection' });
        return false;
      }
      openChatCard(text);
      sendResponse({ ok: true });
      return false;
    }
    if (type === 'BOB_CLEAR_PAGE_HIGHLIGHTS') {
      highlights.forEach((highlight) => unwrapHighlight(highlight.id));
      highlights = [];
      renderRail();
      sendResponse({ ok: true });
      return false;
    }
    if (type === 'BOB_FOCUS_HIGHLIGHT') {
      const index = highlights.findIndex((h) => h.id === message.id);
      if (index >= 0) enterNavMode(index);
      sendResponse({ ok: index >= 0 });
      return false;
    }
    return false;
  });

  // -------------------------------------------------------------- wiring ---

  document.addEventListener('mouseup', (event) => {
    if (isBobUi(event.target)) return;
    setTimeout(handleSelectionChange, 10);
  });

  document.addEventListener('mousedown', (event) => {
    if (selectionCard && !selectionCard.contains(event.target)) hideSelectionCard();
  });

  document.addEventListener('selectionchange', () => {
    clearTimeout(handleSelectionChange._t);
    handleSelectionChange._t = setTimeout(() => {
      if (selectionCard && !selectionCard.classList.contains('bob-card-hidden')) {
        const selection = window.getSelection();
        if (!selection || !selection.toString().trim()) hideSelectionCard();
      }
    }, 200);
  });

  window.addEventListener('scroll', () => {
    if (!selectionCard || selectionCard.classList.contains('bob-card-hidden')) return;
    hideSelectionCard();
  }, { passive: true });

  window.addEventListener('resize', hideSelectionCard);

  // Restore this page's highlights once the document has settled.
  (async function restore() {
    try {
      const response = await send({ type: 'GET_HIGHLIGHTS', url: location.href });
      const records = (response && response.highlights) || [];
      if (records.length) await renderStoredHighlights(records);
    } catch {
      /* extension context invalidated (reload of the extension) — stay silent */
    }
  })();

  window.addEventListener('pageshow', async (event) => {
    if (!event.persisted) return;
    const response = await send({ type: 'GET_HIGHLIGHTS', url: location.href });
    await renderStoredHighlights((response && response.highlights) || []);
  });
})();
