// Bob Research Companion — side panel controller
//
// Every state shown here comes from real sources: chrome.tabs, the extension's
// local storage, the authenticated Bob Desktop bridge, or the user's own
// Gemini key. Nothing is simulated.

(() => {
  'use strict';

  const dom = {};
  const state = {
    view: 'chat',
    tab: null,
    pageText: '',
    bridge: { connected: false, detail: 'unknown' },
    settings: { geminiKey: '', bridgeToken: 'development-token', syncTabsToDesktop: true, researchFocus: '' },
    hasGeminiKey: false,
    notes: [],
    tabs: [],
    tasks: [],
    scores: new Map(),
    busy: false,
  };

  const STOPWORDS = new Set(
    'the a an and or but of to in for on with as by is are was were be been this that these those it its from at into about over under their there they we you your our his her which who what when where why how can could should would will may might must not no do does did done have has had more most other some such than then also very just only own same https http www html php com org net'.split(
      ' '
    )
  );

  // ------------------------------------------------------------- helpers ---

  const $ = (id) => document.getElementById(id);

  function send(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, reason: chrome.runtime.lastError.message });
            return;
          }
          resolve(response === undefined || response === null ? { ok: false, reason: 'no-response' } : response);
        });
      } catch (err) {
        resolve({ ok: false, reason: (err && err.message) || 'send-failed' });
      }
    });
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function domainOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function relativeTime(iso) {
    const then = new Date(iso).getTime();
    if (!then) return '';
    const diff = Date.now() - then;
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(then).toLocaleDateString();
  }

  // ------------------------------------------------------------ chat view ---

  function addMessage(role, text, meta) {
    const wrap = make('div', `sp-msg ${role}-msg`);
    const bubble = make('div', 'msg-bubble');
    bubble.appendChild(make('div', null, text));
    if (meta) bubble.appendChild(make('div', 'msg-meta', meta));
    wrap.appendChild(bubble);
    dom.chatStream.appendChild(wrap);
    dom.chatStream.scrollTop = dom.chatStream.scrollHeight;
    return { wrap, bubble };
  }

  function setPendingMessage(entry, text) {
    clear(entry.bubble);
    entry.bubble.appendChild(make('div', null, text));
    dom.chatStream.scrollTop = dom.chatStream.scrollHeight;
  }

  function renderChatEmptyState() {
    if (dom.chatStream.childElementCount) return;
    const empty = make('div', 'sp-chat-empty');
    empty.appendChild(make('div', null, 'Bob reads the page you are on — only when you ask.'));
    empty.appendChild(make('div', null, 'Select text on the page for Copy · Notes · Ask Bob, or type a question below.'));
    dom.chatStream.appendChild(empty);
  }

  async function submitPrompt(prompt, extraContext) {
    const text = String(prompt || '').trim();
    if (!text || state.busy) return;

    renderChatEmptyState();
    if (dom.chatStream.querySelector('.sp-chat-empty')) clear(dom.chatStream);

    addMessage('user', text);
    const pending = addMessage('bob', 'Reading the page and your research context…');
    dom.chatStream.classList.add('busy');
    state.busy = true;
    dom.btnSend.disabled = true;

    let pageText = state.pageText;
    if (!pageText && state.tab) {
      const extracted = await send({ type: 'GET_PAGE_TEXT' });
      if (extracted && extracted.ok) {
        pageText = extracted.excerpt || '';
        state.pageText = pageText;
      }
    }

    const result = await send({
      type: 'CHAT',
      prompt: text,
      context: {
        title: state.tab ? state.tab.title : '',
        url: state.tab ? state.tab.url : '',
        excerpt: [extraContext, pageText].filter(Boolean).join('\n\n'),
      },
    });

    state.busy = false;
    dom.btnSend.disabled = false;
    dom.chatStream.classList.remove('busy');

    if (result && result.ok && result.reply) {
      setPendingMessage(pending, result.reply);
      pending.bubble.appendChild(make('div', 'msg-meta', `Gemini · ${result.model}`));
      return;
    }

    const reason = result && result.reason;
    const messages = {
      'no-key': 'No Gemini key is connected. Open Tools → Bridge & AI key and paste your Google AI Studio key — Bob will not invent an answer without one.',
      'bad-key': 'Google rejected that key (401/403). Update it under Tools → Bridge & AI key.',
      'rate-limited': 'Google rate-limited this key (429). Wait a moment and try again.',
      'no-tab': 'Bob could not see an active tab. Reload the page you are reading and try again.',
    };
    setPendingMessage(pending, messages[reason] || `Bob could not reach Gemini (${reason || 'unknown error'}). Nothing was guessed.`);
    pending.wrap.classList.add('pending');
  }

  // -------------------------------------------------------- summary view ---

  async function buildSummary() {
    if (state.busy) return;

    const selected = state.tabs.filter((t) => t.selected);
    clear(dom.summarySource);
    dom.summaryOutput.className = 'sp-empty';
    dom.summaryOutput.textContent = 'Collecting the selected sources…';
    dom.btnBuildSummary.disabled = true;
    state.busy = true;

    const sources = [];
    for (const tab of selected.slice(0, 6)) {
      const read = await send({ type: 'EXTRACT_TAB_TEXT', url: tab.url, tabId: tab.tabId });
      const row = make('div', 'sp-source');
      row.appendChild(make('span', 'sp-source-title', tab.title));
      row.appendChild(
        make(
          'span',
          'sp-source-domain',
          read && read.ok ? `${domainOf(tab.url)} · ${Math.round((read.text || '').length / 1000)}k chars` : `${domainOf(tab.url)} · not readable`
        )
      );
      dom.summarySource.appendChild(row);
      if (read && read.ok && read.text) sources.push(`### ${read.title}\n${read.url}\n${read.text}`);
    }

    if (state.tab) {
      if (!state.pageText) {
        const extracted = await send({ type: 'GET_PAGE_TEXT' });
        if (extracted && extracted.ok) state.pageText = extracted.excerpt || '';
      }
      if (state.pageText) {
        sources.push(`### ${state.tab.title} (active tab)\n${state.tab.url}\n${state.pageText}`);
        if (!selected.some((t) => t.url === state.tab.url)) {
          const row = make('div', 'sp-source');
          row.appendChild(make('span', 'sp-source-title', `${state.tab.title} (active tab)`));
          row.appendChild(make('span', 'sp-source-domain', domainOf(state.tab.url)));
          dom.summarySource.appendChild(row);
        }
      }
    }

    state.busy = false;
    dom.btnBuildSummary.disabled = false;

    if (!sources.length) {
      dom.summaryOutput.textContent = 'Nothing to summarize yet. Select at least one readable tab in the Tabs view (pages like chrome:// or the web store cannot be read).';
      return;
    }

    dom.summaryOutput.className = 'sp-summary-body';
    dom.summaryOutput.textContent = 'Comparing sources…';

    const prompt =
      'Summarize the sources below for my research. Structure the answer as:\n' +
      '1. Three-sentence overview.\n' +
      '2. Key findings as bullets, each tagged [Supported], [Contradicted], [Related] or [Background] depending on how the sources relate to each other.\n' +
      '3. Gaps or contradictions worth verifying.\n' +
      'Cite the source domain inline for each finding. Use only these sources.';

    const result = await send({ type: 'CHAT', prompt, context: { excerpt: sources.join('\n\n---\n\n'), title: '', url: '' } });

    if (result && result.ok && result.reply) {
      dom.summaryOutput.textContent = result.reply;
      dom.summaryOutput.appendChild(make('div', 'msg-meta', `Gemini · ${result.model} · ${sources.length} source(s)`));
    } else {
      dom.summaryOutput.className = 'sp-empty';
      dom.summaryOutput.textContent =
        result && result.reason === 'no-key'
          ? 'Bob needs your Gemini key to write the summary. Open Tools → Bridge & AI key. The sources above were collected and are ready.'
          : `Summary failed (${(result && result.reason) || 'unknown error'}). Your sources are listed above — nothing was invented.`;
    }
  }

  // ----------------------------------------------------------- tabs view ---

  function keywords(text) {
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

  function scoreTab(tab, focus) {
    if (!focus.size) return { score: null, tier: 'unknown', why: 'no focus set' };

    const title = String(tab.title || '').toLowerCase();
    const url = String(tab.url || '').toLowerCase();
    const titleTokens = new Set(title.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean));

    let matched = [];
    let weight = 0;
    focus.forEach((focusWeight, keyword) => {
      const inTitle = Array.from(titleTokens).some((token) => token === keyword || token.startsWith(keyword) || keyword.startsWith(token));
      const inUrl = url.includes(keyword);
      if (inTitle || inUrl) {
        matched.push(keyword);
        weight += (inTitle ? 2 : 1) * (1 + Math.min(focusWeight, 3) * 0.2);
      }
    });

    if (!matched.length) return { score: 12, tier: 'red', why: 'no keyword overlap' };

    const score = Math.max(20, Math.min(100, Math.round(38 + weight * 11)));
    const tier = score >= 80 ? 'green' : score >= 66 ? 'blue' : score >= 50 ? 'yellow' : 'red';
    return { score, tier, why: matched.slice(0, 3).join(', ') };
  }

  function tierOf(score) {
    if (score === null) return 'unknown';
    return score >= 80 ? 'green' : score >= 66 ? 'blue' : score >= 50 ? 'yellow' : 'red';
  }

  function renderTabs() {
    const focus = keywords(state.settings.researchFocus);
    clear(dom.tabsSelected);
    clear(dom.tabsOther);

    const selected = state.tabs.filter((t) => t.selected);
    const others = state.tabs.filter((t) => !t.selected);

    if (!state.tabs.length) {
      dom.tabsOther.appendChild(
        make('div', 'sp-empty', 'No tabs tracked yet. Press “+ This tab” to add the page you are reading, or right-click any page → “Add this tab to Bob research tabs”.')
      );
    }

    if (!selected.length) {
      dom.tabsSelected.appendChild(make('div', 'sp-empty', 'Nothing selected. Selected tabs are the sources Bob summarizes and cites.'));
    }

    selected.forEach((tab) => dom.tabsSelected.appendChild(tabRow(tab, focus)));
    others
      .slice()
      .sort((a, b) => {
        const sa = state.scores.get(a.url);
        const sb = state.scores.get(b.url);
        return (sb && sb.score ? sb.score : -1) - (sa && sa.score ? sa.score : -1);
      })
      .forEach((tab) => dom.tabsOther.appendChild(tabRow(tab, focus)));

    dom.btnToggleOther.querySelector('span').textContent = `Other tabs (${others.length})`;
  }

  function tabRow(tab, focus) {
    const score = scoreTab(tab, focus);
    state.scores.set(tab.url, score);

    const row = make('div', `sp-tab${tab.selected ? ' selected' : ''}`);

    const check = make('button', 'sp-check', '✓');
    check.type = 'button';
    check.setAttribute('aria-pressed', tab.selected ? 'true' : 'false');
    check.title = tab.selected ? 'Remove from primary research context' : 'Make this a primary research source';
    check.addEventListener('click', async () => {
      const result = await send({ type: 'SET_TAB_SELECTED', url: tab.url, selected: !tab.selected, tab });
      if (result && result.ok) {
        state.tabs = result.tabs;
        renderTabs();
      }
    });
    row.appendChild(check);

    if (tab.favIconUrl) {
      const img = make('img', 'sp-favicon');
      img.src = tab.favIconUrl;
      img.alt = '';
      img.addEventListener('error', () => img.replaceWith(faviconFallback(tab)));
      row.appendChild(img);
    } else {
      row.appendChild(faviconFallback(tab));
    }

    const main = make('div', 'sp-tab-main');
    const title = make('div', 'sp-tab-title', tab.title || tab.url);
    title.title = tab.title || tab.url;
    title.addEventListener('click', () => {
      if (tab.tabId) chrome.tabs.update(tab.tabId, { active: true }).catch(() => {});
      else chrome.tabs.create({ url: tab.url, active: false });
    });
    title.style.cursor = 'pointer';
    main.appendChild(title);
    main.appendChild(make('div', 'sp-tab-domain', tab.domain || domainOf(tab.url)));
    row.appendChild(main);

    const relevance = make('div', 'sp-tab-relevance');
    const tier = tierOf(score.score);
    relevance.appendChild(make('div', `sp-score ${tier}`, score.score === null ? '—' : `${score.score}%`));
    const bar = make('div', 'sp-score-bar');
    const fill = make('div', 'sp-score-fill');
    fill.style.width = `${score.score === null ? 0 : score.score}%`;
    bar.appendChild(fill);
    relevance.appendChild(bar);
    relevance.appendChild(make('div', 'sp-tab-why', score.why));
    relevance.title = `Relevance from title + URL against your research focus. ${score.why}`;
    row.appendChild(relevance);

    return row;
  }

  function faviconFallback(tab) {
    const letter = (tab.domain || domainOf(tab.url) || tab.title || '?').charAt(0).toUpperCase();
    return make('div', 'sp-favicon-fallback', letter);
  }

  // ---------------------------------------------------------- tasks view ---

  function renderTasks() {
    clear(dom.taskList);
    if (!state.tasks.length) {
      dom.taskList.appendChild(make('div', 'sp-empty', 'No tasks yet. Add the next step of your research here — Bob keeps it in chat context.'));
      return;
    }
    state.tasks.forEach((task) => {
      const row = make('div', `sp-task${task.done ? ' done' : ''}`);
      const box = make('input');
      box.type = 'checkbox';
      box.checked = Boolean(task.done);
      box.addEventListener('change', async () => {
        const result = await send({ type: 'TOGGLE_TASK', id: task.id });
        if (result && result.ok) {
          state.tasks = result.tasks;
          renderTasks();
        }
      });
      row.appendChild(box);
      row.appendChild(make('div', 'sp-task-title', task.title));
      const del = make('button', 'sp-task-delete', '✕');
      del.type = 'button';
      del.title = 'Delete task';
      del.addEventListener('click', async () => {
        const result = await send({ type: 'DELETE_TASK', id: task.id });
        if (result && result.ok) {
          state.tasks = result.tasks;
          renderTasks();
        }
      });
      row.appendChild(del);
      dom.taskList.appendChild(row);
    });
  }

  // ---------------------------------------------------------- notes view ---

  function renderNotes() {
    dom.notesCount.textContent = `${state.notes.length} note${state.notes.length === 1 ? '' : 's'}`;
    clear(dom.notesList);

    if (!state.notes.length) {
      dom.notesList.appendChild(make('div', 'sp-empty', 'No notes yet. Select text on any page and choose Notes.'));
      return;
    }

    state.notes.slice(0, 60).forEach((note) => {
      const card = make('div', `sp-note${note.color ? ` ${note.color}` : ''}`);
      card.appendChild(make('div', 'sp-note-text', note.text.length > 400 ? `${note.text.slice(0, 400)}…` : note.text));
      const meta = make('div', 'sp-note-meta');
      const src = make('span', 'sp-note-src', `${note.domain || domainOf(note.sourceUrl) || 'unknown source'} · ${relativeTime(note.createdAt)}`);
      src.title = note.sourceUrl || '';
      src.style.cursor = note.sourceUrl ? 'pointer' : 'default';
      if (note.sourceUrl) src.addEventListener('click', () => chrome.tabs.create({ url: note.sourceUrl, active: true }));
      meta.appendChild(src);
      const del = make('button', 'sp-note-delete', 'Delete');
      del.type = 'button';
      del.addEventListener('click', async () => {
        const result = await send({ type: 'DELETE_NOTE', id: note.id });
        if (result && result.ok) {
          state.notes = result.notes;
          renderNotes();
        }
      });
      meta.appendChild(del);
      card.appendChild(meta);
      dom.notesList.appendChild(card);
    });
  }

  // --------------------------------------------------------- bridge chip ---

  function renderBridge(status) {
    state.bridge = status || state.bridge;
    const connected = Boolean(state.bridge.connected);
    dom.bridgeDot.className = `sp-dot ${connected ? 'on' : 'off'}`;
    dom.bridgeLabel.textContent = connected ? `Desktop v${state.bridge.version || '?'}` : 'Desktop offline';
    dom.bridgeChip.title = connected
      ? 'Bob Desktop bridge connected on 127.0.0.1:54321'
      : `Bridge not connected (${state.bridge.detail || 'unreachable'}). Start Bob Desktop, or fix the token in Tools → Bridge & AI key.`;

    dom.bridgeStatusLine.className = `sp-status-line ${connected ? 'ok' : 'err'}`;
    dom.bridgeStatusLine.textContent = connected
      ? `Connected to Bob Desktop v${state.bridge.version || 'unknown'} on 127.0.0.1:54321.`
      : state.bridge.detail === 'bad-token'
        ? 'Bob Desktop answered but rejected the token (401). Set the same BOB_BRIDGE_TOKEN below.'
        : 'Bob Desktop is not answering on 127.0.0.1:54321. Notes and highlights stay in this browser until it does.';
  }

  async function refreshBridge(force) {
    dom.bridgeDot.className = 'sp-dot pending';
    dom.bridgeLabel.textContent = 'Checking…';
    const result = await send({ type: 'GET_BRIDGE_STATUS', force: Boolean(force) });
    if (result && result.ok) renderBridge(result.status);
    else renderBridge({ connected: false, detail: 'unknown' });
  }

  // -------------------------------------------------------------- tools ---

  function closePopovers() {
    dom.toolsPopover.hidden = true;
    dom.attachPopover.hidden = true;
    dom.btnTools.setAttribute('aria-expanded', 'false');
    dom.btnAttach.setAttribute('aria-expanded', 'false');
  }

  async function runTool(tool) {
    closePopovers();

    if (tool.startsWith('highlight-')) {
      const color = tool.replace('highlight-', '');
      const result = await send({ type: 'HIGHLIGHT_SELECTION_IN_PAGE', color });
      if (!result || !result.ok) toastInChat(result && result.reason === 'no-selection' ? 'Select the text you want to highlight first.' : 'Bob could not reach this page. Reload it and try again.');
      return;
    }

    if (tool === 'auto-highlight') {
      const result = await send({ type: 'AUTO_HIGHLIGHT_PAGE', focus: state.settings.researchFocus });
      if (result && result.ok && result.count) {
        toastInChat(`Auto-highlighted ${result.count} passage${result.count === 1 ? '' : 's'} that match your research focus. Hover the rail on the right of the page to walk through them.`);
      } else if (result && result.reason === 'no-research-focus') {
        toastInChat('Set a research focus in the Tabs view first — Bob will not highlight arbitrary text.');
      } else if (result && (result.reason === 'no-matches' || result.count === 0)) {
        toastInChat('Nothing on this page matched your research focus, so Bob highlighted nothing.');
      } else {
        toastInChat('Bob could not analyse this page (it may block extensions). Reload and try again.');
      }
      return;
    }

    if (tool === 'clear-highlights') {
      if (!state.tab) return;
      await send({ type: 'CLEAR_PAGE_HIGHLIGHTS', url: state.tab.url });
      const relay = await chrome.tabs.sendMessage(state.tab.id, { type: 'BOB_CLEAR_PAGE_HIGHLIGHTS' }).catch(() => null);
      toastInChat(relay && relay.ok ? 'Cleared every Bob highlight on this page.' : 'Stored highlights cleared. Reload the page to remove the marks.');
      return;
    }

    if (tool === 'bridge') {
      dom.bridgeSheet.hidden = false;
      dom.bridgeToken.value = state.settings.bridgeToken || '';
      dom.syncTabs.checked = Boolean(state.settings.syncTabsToDesktop);
      await refreshBridge(true);
      return;
    }

    if (tool === 'notes') {
      dom.notesList.hidden = false;
      dom.btnToggleNotes.setAttribute('aria-expanded', 'true');
      renderNotes();
    }
  }

  function toastInChat(text) {
    switchView('chat');
    renderChatEmptyState();
    const empty = dom.chatStream.querySelector('.sp-chat-empty');
    if (empty) clear(dom.chatStream);
    addMessage('bob', text);
  }

  // -------------------------------------------------------------- views ---

  function switchView(view) {
    state.view = view;
    document.querySelectorAll('.sp-nav-btn').forEach((btn) => {
      const active = btn.dataset.view === view;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.sp-view').forEach((section) => {
      section.classList.toggle('active', section.id === `view-${view}`);
    });
    if (view === 'tabs') renderTabs();
    if (view === 'tasks') renderTasks();
  }

  // --------------------------------------------------------------- boot ---

  async function boot() {
    [
      'context-title',
      'context-sub',
      'bridge-chip',
      'bridge-dot',
      'bridge-label',
      'btn-open-desktop',
      'btn-close-panel',
      'chat-stream',
      'btn-build-summary',
      'summary-source',
      'summary-output',
      'tabs-selected',
      'tabs-other',
      'btn-toggle-other',
      'btn-score-tabs',
      'btn-add-current-tab',
      'research-focus',
      'task-form',
      'task-input',
      'task-list',
      'notes-bar',
      'notes-count',
      'notes-list',
      'btn-toggle-notes',
      'composer',
      'prompt-input',
      'btn-send',
      'btn-tools',
      'btn-attach',
      'tools-popover',
      'attach-popover',
      'bridge-sheet',
      'bridge-status-line',
      'btn-recheck-bridge',
      'gemini-key',
      'btn-save-key',
      'btn-test-key',
      'key-status',
      'bridge-token',
      'sync-tabs',
    ].forEach((id) => {
      const node = $(id);
      const key = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
      dom[key] = node;
    });

    wireNavigation();
    wireComposer();
    wireTools();
    wireBridgeSheet();
    wireHeader();
    wireNotes();
    wireTasks();
    wireSummary();
    wireTabsView();

    await loadState();
    await loadActiveTab();
    renderChatEmptyState();

    const pending = await send({ type: 'GET_PENDING_ASK' });
    if (pending && pending.ok && pending.pending) {
      const ask = pending.pending;
      switchView('chat');
      if (ask.selection) addMessage('user', `“${ask.selection.slice(0, 300)}${ask.selection.length > 300 ? '…' : ''}”`);
      await submitPrompt(ask.prompt || 'Explain this passage and say how it relates to my research focus.', ask.selection ? `Selected passage:\n"${ask.selection}"` : '');
    }

    chrome.runtime.onMessage.addListener((message) => {
      if (!message || !message.type) return;
      if (message.type === 'BOB_NOTE_ADDED') {
        state.notes = [message.note, ...state.notes.filter((n) => n.id !== message.note.id)];
        renderNotes();
      } else if (message.type === 'BOB_TAB_ADDED') {
        loadTabs();
      } else if (message.type === 'BOB_NOTES_CHANGED') {
        state.notes = message.notes || [];
        renderNotes();
      } else if (message.type === 'BOB_ASK_READY') {
        // Handled on next panel open through GET_PENDING_ASK.
      }
    });

    setInterval(() => refreshBridge(false), 30000);
  }

  async function loadState() {
    const result = await send({ type: 'GET_STATE' });
    if (!result || !result.ok) return;
    state.notes = result.notes || [];
    state.tabs = result.tabs || [];
    state.tasks = result.tasks || [];
    state.settings = { ...state.settings, ...(result.settings || {}), researchFocus: (result.settings && result.settings.researchFocus) || '' };
    state.hasGeminiKey = Boolean(result.hasGeminiKey);
    dom.researchFocus.value = state.settings.researchFocus || '';
    renderBridge(result.bridge);
    renderNotes();
    renderTasks();
    renderTabs();
  }

  async function loadTabs() {
    const result = await send({ type: 'GET_TABS' });
    if (result && result.ok) {
      state.tabs = result.tabs || [];
      renderTabs();
    }
  }

  async function loadActiveTab() {
    const tab = await send({ type: 'GET_ACTIVE_TAB_CONTEXT' });
    state.tab = tab && tab.url ? tab : null;
    state.pageText = '';

    if (state.tab) {
      dom.contextTitle.textContent = state.tab.title || domainOf(state.tab.url);
      dom.contextSub.textContent = domainOf(state.tab.url) || state.tab.url;
      const extracted = await send({ type: 'GET_PAGE_TEXT' });
      if (extracted && extracted.ok) state.pageText = extracted.excerpt || '';
    } else {
      dom.contextTitle.textContent = 'Bob Research';
      dom.contextSub.textContent = 'Open a web page to give Bob context';
    }

    await loadTabs();
  }

  // ------------------------------------------------------------- wiring ---

  function wireNavigation() {
    document.querySelectorAll('.sp-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    dom.btnToggleOther.addEventListener('click', () => {
      const expanded = dom.btnToggleOther.getAttribute('aria-expanded') === 'true';
      dom.btnToggleOther.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      dom.tabsOther.classList.toggle('collapsed', expanded);
    });
  }

  function wireHeader() {
    dom.btnClosePanel.addEventListener('click', () => window.close());

    dom.btnOpenDesktop.addEventListener('click', async () => {
      dom.btnOpenDesktop.disabled = true;
      const result = await send({ type: 'OPEN_BOB_DESKTOP' });
      dom.btnOpenDesktop.disabled = false;
      if (!result || !result.ok) {
        toastInChat(
          result && result.reason === 'desktop-not-running'
            ? 'Bob Desktop is not running, so there is nothing to focus. Start the desktop app and press the Bob logo again.'
            : 'Bob Desktop did not accept the focus request. Open it from your taskbar — the extension cannot launch apps by itself.'
        );
      }
    });

    chrome.tabs.onActivated.addListener(() => {
      if (document.visibilityState === 'visible') loadActiveTab();
    });
  }

  function wireComposer() {
    const input = dom.promptInput;

    const autosize = () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
      dom.composer.classList.toggle('grown', input.value.trim().length > 0 || input.scrollHeight > 40);
    };

    input.addEventListener('input', autosize);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitPrompt(input.value);
        input.value = '';
        autosize();
      }
    });

    dom.btnSend.addEventListener('click', () => {
      submitPrompt(input.value);
      input.value = '';
      autosize();
    });
  }

  function wireTools() {
    dom.btnTools.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = dom.toolsPopover.hidden;
      closePopovers();
      dom.toolsPopover.hidden = !willOpen;
      dom.btnTools.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    dom.btnAttach.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = dom.attachPopover.hidden;
      closePopovers();
      dom.attachPopover.hidden = !willOpen;
      dom.btnAttach.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    dom.toolsPopover.querySelectorAll('.sp-pop-item').forEach((item) => {
      item.addEventListener('click', () => runTool(item.dataset.tool));
    });

    document.addEventListener('click', (event) => {
      if (!dom.toolsPopover.hidden && !dom.toolsPopover.contains(event.target) && event.target !== dom.btnTools) closePopovers();
      if (!dom.attachPopover.hidden && !dom.attachPopover.contains(event.target) && event.target !== dom.btnAttach) closePopovers();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closePopovers();
        dom.bridgeSheet.hidden = true;
      }
    });
  }

  function wireNotes() {
    dom.btnToggleNotes.addEventListener('click', () => {
      const expanded = dom.btnToggleNotes.getAttribute('aria-expanded') === 'true';
      dom.btnToggleNotes.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      dom.notesList.hidden = expanded;
      if (!expanded) renderNotes();
    });
  }

  function wireSummary() {
    dom.btnBuildSummary.addEventListener('click', () => buildSummary());
  }

  function wireTasks() {
    dom.taskForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const title = dom.taskInput.value.trim();
      if (!title) return;
      const result = await send({ type: 'ADD_TASK', task: { title } });
      if (result && result.ok) {
        state.tasks = result.tasks;
        dom.taskInput.value = '';
        renderTasks();
      }
    });
  }

  function wireTabsView() {
    dom.btnScoreTabs.addEventListener('click', () => renderTabs());

    dom.btnAddCurrentTab.addEventListener('click', async () => {
      if (!state.tab) {
        toastInChat('Bob cannot see the current tab. Open a normal web page first.');
        return;
      }
      const result = await send({ type: 'SAVE_TAB', tab: state.tab });
      if (result && result.ok) {
        await loadTabs();
        const select = await send({ type: 'SET_TAB_SELECTED', url: state.tab.url, selected: true });
        if (select && select.ok) {
          state.tabs = select.tabs;
          renderTabs();
        }
      }
    });

    let focusTimer = null;
    dom.researchFocus.addEventListener('input', () => {
      clearTimeout(focusTimer);
      focusTimer = setTimeout(async () => {
        state.settings.researchFocus = dom.researchFocus.value.trim();
        await send({ type: 'SET_SETTINGS', patch: { researchFocus: state.settings.researchFocus } });
        renderTabs();
      }, 350);
    });
  }

  function wireBridgeSheet() {
    dom.bridgeSheet.querySelector('[data-close-sheet]').addEventListener('click', () => {
      dom.bridgeSheet.hidden = true;
    });

    dom.btnRecheckBridge.addEventListener('click', async () => {
      const token = dom.bridgeToken.value.trim();
      if (token && token !== state.settings.bridgeToken) {
        const saved = await send({ type: 'SET_SETTINGS', patch: { bridgeToken: token } });
        if (saved && saved.ok) state.settings = { ...state.settings, ...saved.settings };
      }
      await refreshBridge(true);
    });

    dom.btnSaveKey.addEventListener('click', async () => {
      const key = dom.geminiKey.value.trim();
      if (!key) {
        dom.keyStatus.className = 'sp-status-line err';
        dom.keyStatus.textContent = 'Paste a key first, or clear it in chrome://settings if you want to remove access.';
        return;
      }
      dom.keyStatus.className = 'sp-status-line';
      dom.keyStatus.textContent = 'Verifying with Google…';
      const test = await send({ type: 'TEST_GEMINI_KEY', key });
      if (test && test.ok) {
        await send({ type: 'SET_SETTINGS', patch: { geminiKey: key } });
        state.hasGeminiKey = true;
        dom.keyStatus.className = 'sp-status-line ok';
        dom.keyStatus.textContent = `Key saved in this browser only. Verified with ${test.model}.`;
        dom.geminiKey.value = '';
      } else {
        dom.keyStatus.className = 'sp-status-line err';
        dom.keyStatus.textContent =
          test && test.reason === 'bad-key'
            ? 'Google rejected this key. Make sure the Gemini API is enabled for it in Google AI Studio.'
            : 'Could not verify this key right now (network or quota). It was not saved.';
      }
    });

    dom.btnTestKey.addEventListener('click', async () => {
      dom.keyStatus.className = 'sp-status-line';
      dom.keyStatus.textContent = state.hasGeminiKey ? 'Testing the saved key…' : 'No saved key yet — paste one to test.';
      if (!state.hasGeminiKey) return;
      const result = await send({ type: 'CHAT', prompt: 'Reply with the single word: Ready', context: {} });
      if (result && result.ok) {
        dom.keyStatus.className = 'sp-status-line ok';
        dom.keyStatus.textContent = `Saved key works (${result.model}).`;
      } else {
        dom.keyStatus.className = 'sp-status-line err';
        dom.keyStatus.textContent = `Saved key failed: ${result && result.reason}.`;
      }
    });

    dom.syncTabs.addEventListener('change', async () => {
      const result = await send({ type: 'SET_SETTINGS', patch: { syncTabsToDesktop: dom.syncTabs.checked } });
      if (result && result.ok) state.settings = { ...state.settings, ...result.settings };
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
