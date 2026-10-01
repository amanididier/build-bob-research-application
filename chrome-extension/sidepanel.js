// Bob Research Companion — side panel controller
// High-grade research experience: dual-card landing, session history,
// real-time desktop door, AI context bridge, dynamic tabs, and auto-plan tasks.

(() => {
  'use strict';

  const dom = {};
  const state = {
    view: 'chat',
    sessionMode: null, // 'general' | 'research' | null (null shows landing screen)
    activeProjectId: null,
    activeProjectName: null,
    tab: null,
    pageText: '',
    bridge: { connected: false, detail: 'unknown' },
    settings: { geminiKey: '', bridgeToken: 'development-token', syncTabsToDesktop: true, researchFocus: '' },
    hasGeminiKey: false,
    notes: [],
    tabs: [],
    tasks: [],
    projects: [],
    scores: new Map(),
    manualTabSelection: false,
    bridgeHandoffActive: false,
    isAllTabsSelected: false,
    busy: false,
    sessions: [], // [{ id, title, mode, timestamp, projectId }]
  };

  const STOPWORDS = new Set(
    'the a an and or but of to in for on with as by is are was were be been this that these those it its from at into about over under their there they we you your our his her which who what when where why how can could should would will may might must not no do does did done have has had more most other some such than then also very just only own same https http www html php com org net'.split(' ')
  );

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

  function relativeTime(ts) {
    const diff = Date.now() - Number(ts || 0);
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString();
  }

  // -------------------------------------------------------- session memory ---

  async function loadSessions() {
    try {
      const data = await chrome.storage.local.get(['bob_sessions', 'bob_pinned']);
      const raw = Array.isArray(data.bob_sessions) ? data.bob_sessions : [];
      // Clean up general sessions older than 24 hours
      const now = Date.now();
      const valid = raw.filter((s) => {
        if (s.mode === 'general') {
          return now - (s.timestamp || 0) < 24 * 60 * 60 * 1000;
        }
        return true;
      });
      state.sessions = valid;
      if (valid.length !== raw.length) {
        await chrome.storage.local.set({ bob_sessions: valid });
      }

      // Check pin state
      if (data.bob_pinned) {
        dom.btnPinExtension.style.display = 'none';
      }
    } catch {
      state.sessions = [];
    }
  }

  async function saveCurrentSession(title, mode, projectId) {
    const existingIndex = state.sessions.findIndex((s) => s.projectId === projectId && s.mode === mode);
    const sessionRecord = {
      id: existingIndex >= 0 ? state.sessions[existingIndex].id : 'sess_' + Date.now(),
      title: title || (mode === 'general' ? 'General Exploration' : state.activeProjectName || 'Research Session'),
      mode: mode || 'general',
      projectId: projectId || null,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      state.sessions[existingIndex] = sessionRecord;
    } else {
      state.sessions.unshift(sessionRecord);
    }
    state.sessions = state.sessions.slice(0, 30);
    await chrome.storage.local.set({ bob_sessions: state.sessions });
  }

  function renderSessionHistory() {
    clear(dom.historyList);
    if (!state.sessions.length) {
      const empty = make('div', 'sp-empty', 'No recent sessions. Start a General Chat or Choose Research.');
      dom.historyList.appendChild(empty);
      return;
    }

    state.sessions.forEach((s) => {
      const item = make('button', 'sp-history-item');
      item.type = 'button';
      if (
        (s.mode === 'general' && state.sessionMode === 'general') ||
        (s.mode === 'research' && state.activeProjectId === s.projectId)
      ) {
        item.classList.add('active');
      }

      const left = make('div', 'sp-hist-left');
      left.appendChild(make('div', 'sp-hist-title', s.title));

      const meta = make('div', 'sp-hist-meta');
      const badge = make('span', `sp-hist-badge ${s.mode}`, s.mode === 'general' ? 'General' : 'Desktop');
      meta.appendChild(badge);
      meta.appendChild(make('span', null, `· ${relativeTime(s.timestamp)}`));
      left.appendChild(meta);

      item.appendChild(left);
      item.addEventListener('click', () => {
        dom.historyDrawer.hidden = true;
        if (s.mode === 'general') {
          startGeneralSession();
        } else {
          selectProject({ id: s.projectId, name: s.title });
        }
      });

      dom.historyList.appendChild(item);
    });
  }

  // ------------------------------------------------------------ chat view ---

  function addMessage(role, text, citations = [], isHandoff = false, handoffData = null) {
    const wrap = make('div', `sp-msg ${role}-msg`);
    const bubble = make('div', 'msg-bubble');
    bubble.appendChild(make('div', null, text));

    // Render citations pills like ChatGPT / Google AI Search references
    if (citations && citations.length > 0) {
      const citRow = make('div', 'sp-citation-row');
      citations.forEach((c) => {
        const pill = make('span', 'sp-citation-pill');
        pill.title = c.url || c.title;
        pill.textContent = `↗ ${c.title || domainOf(c.url)}`;
        citRow.appendChild(pill);
      });
      bubble.appendChild(citRow);
    }

    // Render Handoff card with 1-click Copy button
    if (isHandoff && handoffData) {
      const card = make('div', 'sp-handoff-card');
      const head = make('div', 'sp-handoff-head');
      head.appendChild(make('span', 'sp-handoff-title', `Handoff: ${handoffData.from} → ${handoffData.to}`));

      const copyBtn = make('button', 'sp-copy-btn', 'Copy for ' + handoffData.to);
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(handoffData.prompt);
        copyBtn.textContent = 'Copied ✓';
        setTimeout(() => (copyBtn.textContent = 'Copy for ' + handoffData.to), 2000);
      });
      head.appendChild(copyBtn);
      card.appendChild(head);
      bubble.appendChild(card);
    }

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

  function startGeneralSession() {
    state.sessionMode = 'general';
    state.activeProjectId = null;
    state.activeProjectName = null;
    dom.researchLanding.hidden = true;
    dom.projectSheet.hidden = true;
    dom.chatStream.hidden = false;
    clear(dom.chatStream);
    addMessage(
      'bob',
      'Started General Chat. Answers draw from your active tabs and are cleared automatically after 24 hours.'
    );
    saveCurrentSession('General Chat', 'general', null);
  }

  async function openProjectSelector() {
    dom.projectSheet.hidden = false;
    clear(dom.projectList);
    const loading = make('div', 'sp-empty', 'Connecting to Bob Desktop projects…');
    dom.projectList.appendChild(loading);

    const res = await send({ type: 'GET_PROJECTS' });
    clear(dom.projectList);

    const projects = (res && res.ok && Array.isArray(res.projects) && res.projects.length)
      ? res.projects
      : [
          { id: 'default', name: 'Main Research Workspace', color: 'blue' },
          { id: 'proj-deep-learning', name: 'Neural Speech & Audio Processing', color: 'yellow' },
          { id: 'proj-battery', name: 'Clean Energy & Charging Infrastructure', color: 'green' }
        ];

    state.projects = projects;
    renderProjectList(projects);
  }

  function renderProjectList(projects) {
    clear(dom.projectList);
    projects.forEach((proj) => {
      const item = make('button', 'sp-project-item');
      item.type = 'button';

      const dot = make('span', 'sp-proj-dot');
      dot.style.background = proj.color === 'yellow' ? '#f59e0b' : proj.color === 'green' ? '#22c55e' : '#38bdf8';
      item.appendChild(dot);

      const content = make('div', null);
      content.appendChild(make('div', 'sp-proj-title', proj.name));
      content.appendChild(make('div', 'sp-proj-sub', 'Desktop Workspace Project · Active sync'));
      item.appendChild(content);

      item.addEventListener('click', () => {
        selectProject(proj);
      });

      dom.projectList.appendChild(item);
    });
  }

  function selectProject(proj) {
    state.sessionMode = 'research';
    state.activeProjectId = proj.id;
    state.activeProjectName = proj.name;
    dom.projectSheet.hidden = true;
    dom.researchLanding.hidden = true;
    dom.chatStream.hidden = false;
    clear(dom.chatStream);
    addMessage(
      'bob',
      `Connected to desktop project: "${proj.name}". Exchanges are synced directly to your Bob Desktop workspace.`
    );
    saveCurrentSession(proj.name, 'research', proj.id);
  }

  function resetToNewSession() {
    state.sessionMode = null;
    state.activeProjectId = null;
    state.activeProjectName = null;
    dom.researchLanding.hidden = false;
    dom.projectSheet.hidden = true;
    dom.chatStream.hidden = true;
    clear(dom.chatStream);
    switchView('chat');
  }

  async function submitPrompt(prompt) {
    const text = String(prompt || '').trim();
    if (!text || state.busy) return;

    // If user types before picking a mode, default to General Chat
    if (!state.sessionMode) {
      startGeneralSession();
    }

    addMessage('user', text);

    // AI Bridge Handoff Mode
    if (state.bridgeHandoffActive) {
      const fromAI = dom.bridgeSourceSelect.value;
      const toAI = dom.bridgeDestSelect.value;
      const pending = addMessage('bob', `Structuring context handoff from ${fromAI} to ${toAI}…`);
      state.busy = true;
      dom.btnSend.disabled = true;

      // Extract current tab context
      let pageText = state.pageText;
      if (!pageText && state.tab) {
        const extracted = await send({ type: 'GET_PAGE_TEXT' });
        if (extracted && extracted.ok) pageText = extracted.excerpt || '';
      }

      const handoffPrompt =
        `[CONTEXT HANDOFF FROM ${fromAI.toUpperCase()} TO ${toAI.toUpperCase()}]\n\n` +
        `I have been collaborating with ${fromAI} on research regarding: "${state.tab ? state.tab.title : 'this project'}".\n\n` +
        `Current Status & Intent:\n${text}\n\n` +
        `Background Context Established So Far:\n${(pageText || '').slice(0, 15000)}\n\n` +
        `Instructions for ${toAI}:\nAct with full awareness of the conversation above without asking me to restate or re-explain context. Continue directly from this point.`;

      state.busy = false;
      dom.btnSend.disabled = false;
      setPendingMessage(
        pending,
        `Context handoff ready! Click below to copy the prompt directly into ${toAI}.`
      );
      addMessage('bob', `Prepared structured handoff prompt for ${toAI}:`, [], true, {
        from: fromAI,
        to: toAI,
        prompt: handoffPrompt,
      });

      // Close handoff mode
      state.bridgeHandoffActive = false;
      dom.bridgeHandoffBar.hidden = true;
      dom.promptInput.placeholder = 'Ask Bob about this page…';
      return;
    }

    // Standard Research Prompt
    const pending = addMessage('bob', 'Reading open tabs and synthesizing response…');
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

    const selectedTabs = state.tabs.filter((t) => t.selected).slice(0, 5);
    const citations = selectedTabs.map((t) => ({ title: t.title, url: t.url }));

    const result = await send({
      type: 'CHAT',
      prompt: text,
      context: {
        title: state.tab ? state.tab.title : '',
        url: state.tab ? state.tab.url : '',
        excerpt: pageText,
        project: state.activeProjectId,
      },
    });

    state.busy = false;
    dom.btnSend.disabled = false;

    if (result && result.ok && result.reply) {
      setPendingMessage(pending, result.reply);
      // Attach citation references
      if (citations.length > 0) {
        const citRow = make('div', 'sp-citation-row');
        citations.forEach((c) => {
          const pill = make('span', 'sp-citation-pill');
          pill.textContent = `↗ ${c.title || domainOf(c.url)}`;
          citRow.appendChild(pill);
        });
        pending.bubble.appendChild(citRow);
      }

      // Check for exploration milestone to pop up confirmation chip
      triggerTaskConfirmationCheck(text, result.reply);
      return;
    }

    setPendingMessage(
      pending,
      'Bob analyzed the page and tabs, but experienced a network timeout. Please verify local connectivity.'
    );
  }

  // ---------------------------------------------------- task confirmation ---

  let taskConfirmTimeout = null;

  function triggerTaskConfirmationCheck(userPrompt, botReply) {
    if (!state.tasks.length) return;
    const pendingTask = state.tasks.find((t) => !t.done);
    if (!pendingTask) return;

    clearTimeout(taskConfirmTimeout);
    taskConfirmTimeout = setTimeout(() => {
      dom.taskConfirmText.textContent = `Did Bob’s answer cover "${pendingTask.text}"?`;
      dom.taskConfirmChip.dataset.taskId = pendingTask.id;
      dom.taskConfirmChip.hidden = false;
    }, 1800);
  }

  // -------------------------------------------------------- summary view ---

  async function buildSummary() {
    if (state.busy) return;

    dom.summaryOutput.className = 'sp-empty';
    dom.summaryOutput.textContent = 'Bob is synthesizing research across all active tabs…';
    dom.btnBuildSummary.disabled = true;
    state.busy = true;

    const readableTabs = state.tabs.filter((t) => t.selected);
    const tabsToUse = readableTabs.length ? readableTabs : state.tabs.slice(0, 6);

    const sources = [];
    for (const tab of tabsToUse) {
      const read = await send({ type: 'EXTRACT_TAB_TEXT', url: tab.url, tabId: tab.tabId });
      if (read && read.ok && read.text) {
        sources.push(`### ${read.title}\nURL: ${read.url}\n${read.text}`);
      }
    }

    if (state.tab && state.pageText) {
      sources.push(`### ${state.tab.title} (active tab)\nURL: ${state.tab.url}\n${state.pageText}`);
    }

    state.busy = false;
    dom.btnBuildSummary.disabled = false;

    if (!sources.length) {
      dom.summaryOutput.textContent = 'No readable tab content found. Open and explore web pages to generate a summary.';
      return;
    }

    const prompt =
      'Create a polished executive research synthesis based on these sources. Format as:\n\n' +
      '### EXECUTIVE SYNTHESIS\nA concise 3-sentence summary of the core thesis.\n\n' +
      '### KEY FINDINGS & EVIDENCE\nBullet points highlighting strongest evidence, tagging inline domains.\n\n' +
      '### EMERGING PATTERNS\nSynergies or shared arguments across the sources.\n\n' +
      '### STRATEGIC TAKEAWAYS & GAPS\nOpen questions or contradictions worth exploring.';

    const result = await send({
      type: 'CHAT',
      prompt,
      context: { excerpt: sources.join('\n\n---\n\n'), title: 'Summary' },
    });

    if (result && result.ok && result.reply) {
      formatSummary(result.reply);
      // Flip button to "Recreate"
      dom.summaryBtnIcon.textContent = '↺';
      dom.summaryBtnText.textContent = 'Recreate';
      dom.btnBuildSummary.title = 'Refresh summary with latest tab changes';
    } else {
      dom.summaryOutput.className = 'sp-empty';
      dom.summaryOutput.textContent = 'Summary generation timed out. Please click Recreate to try again.';
    }
  }

  function formatSummary(text) {
    dom.summaryOutput.className = 'sp-summary-body';
    clear(dom.summaryOutput);

    const lines = text.split('\n');
    lines.forEach((line) => {
      const trim = line.trim();
      if (!trim) return;

      if (trim.includes('EXECUTIVE SYNTHESIS')) {
        const h = make('div', 'summary-heading yellow', '🟡 Executive Synthesis');
        dom.summaryOutput.appendChild(h);
      } else if (trim.includes('KEY FINDINGS')) {
        const h = make('div', 'summary-heading green', '🟢 Key Findings & Strongest Evidence');
        dom.summaryOutput.appendChild(h);
      } else if (trim.includes('EMERGING PATTERNS')) {
        const h = make('div', 'summary-heading blue', '🔵 Emerging Patterns');
        dom.summaryOutput.appendChild(h);
      } else if (trim.includes('STRATEGIC TAKEAWAYS') || trim.includes('GAPS')) {
        const h = make('div', 'summary-heading red', '🔴 Strategic Takeaways & Open Gaps');
        dom.summaryOutput.appendChild(h);
      } else {
        const p = make('p', null, trim.replace(/^###\s*/, ''));
        p.style.marginBottom = '6px';
        dom.summaryOutput.appendChild(p);
      }
    });
  }

  // ----------------------------------------------------------- tabs view ---

  function renderTabs() {
    clear(dom.tabsSelected);
    clear(dom.tabsOther);

    const selected = state.tabs.filter((t) => t.selected);
    const others = state.tabs.filter((t) => !t.selected);

    dom.tabsSelectedCount.textContent = `${selected.length} selected`;
    dom.otherTabsCount.textContent = String(others.length);

    // Update master toggle circle
    state.isAllTabsSelected = state.tabs.length > 0 && selected.length === state.tabs.length;
    dom.radioAllTabsCircle.className = `sp-radio-circle ${state.isAllTabsSelected ? 'checked' : ''}`;

    selected.forEach((t) => dom.tabsSelected.appendChild(createTabItem(t, true)));
    others.forEach((t) => dom.tabsOther.appendChild(createTabItem(t, false)));
  }

  function createTabItem(tab, isSelected) {
    const item = make('div', `sp-tab ${isSelected ? 'selected' : ''}`);

    const check = make('button', `sp-check ${isSelected ? 'checked' : ''}`);
    check.type = 'button';
    check.textContent = isSelected ? '✓' : '';
    check.addEventListener('click', async (e) => {
      e.stopPropagation();
      const nextSelected = !tab.selected;
      const res = await send({ type: 'SET_TAB_SELECTED', url: tab.url, selected: nextSelected, tab });
      if (res && res.ok) {
        state.tabs = res.tabs;
        renderTabs();
      }
    });
    item.appendChild(check);

    if (tab.favIconUrl && !tab.favIconUrl.startsWith('chrome://')) {
      const img = make('img', 'sp-favicon');
      img.src = tab.favIconUrl;
      img.alt = '';
      img.onerror = () => {
        img.replaceWith(make('span', 'sp-favicon-fallback', (domainOf(tab.url) || '?')[0].toUpperCase()));
      };
      item.appendChild(img);
    } else {
      item.appendChild(make('span', 'sp-favicon-fallback', (domainOf(tab.url) || '?')[0].toUpperCase()));
    }

    const main = make('div', 'sp-tab-main');
    main.appendChild(make('div', 'sp-tab-title', tab.title || tab.url));
    main.appendChild(make('div', 'sp-tab-domain', domainOf(tab.url)));
    item.appendChild(main);

    // Relevance score tag
    const scoreVal = typeof tab.relevance === 'number' ? tab.relevance : 85;
    const tier = scoreVal >= 80 ? 'green' : scoreVal >= 60 ? 'blue' : 'yellow';
    const rel = make('div', 'sp-tab-relevance');
    rel.appendChild(make('span', `sp-score ${tier}`, `${scoreVal}%`));
    item.appendChild(rel);

    return item;
  }

  async function loadTabs() {
    const result = await send({ type: 'GET_TABS' });
    if (result && result.ok) {
      state.tabs = result.tabs || [];
      renderTabs();
    }
  }

  // ---------------------------------------------------------- tasks view ---

  function renderTasks() {
    clear(dom.taskList);
    if (!state.tasks.length) {
      const empty = make('div', 'sp-empty', 'No tasks yet. Type a task above or click Auto Plan to generate a roadmap.');
      dom.taskList.appendChild(empty);
      return;
    }

    state.tasks.forEach((task) => {
      const row = make('div', `sp-task ${task.done ? 'done' : ''}`);

      const check = make('button', `sp-check ${task.done ? 'checked' : ''}`);
      check.type = 'button';
      check.textContent = task.done ? '✓' : '';
      check.addEventListener('click', async () => {
        const res = await send({ type: 'TOGGLE_TASK', id: task.id, done: !task.done });
        if (res && res.ok) {
          state.tasks = res.tasks;
          renderTasks();
        }
      });
      row.appendChild(check);

      row.appendChild(make('span', 'sp-task-text', task.text));

      const del = make('button', 'sp-task-del', '✕');
      del.type = 'button';
      del.title = 'Delete task';
      del.addEventListener('click', async () => {
        const res = await send({ type: 'DELETE_TASK', id: task.id });
        if (res && res.ok) {
          state.tasks = res.tasks;
          renderTasks();
        }
      });
      row.appendChild(del);

      dom.taskList.appendChild(row);
    });
  }

  async function loadTasks() {
    const stateRes = await send({ type: 'GET_STATE' });
    if (stateRes && stateRes.ok && Array.isArray(stateRes.tasks)) {
      state.tasks = stateRes.tasks;
      renderTasks();
    }
  }

  async function handleAutoPlanTasks() {
    dom.btnAutoPlan.disabled = true;
    const oldHtml = dom.btnAutoPlan.innerHTML;
    dom.btnAutoPlan.textContent = 'Planning…';

    // Auto-generate research milestones based on active research tabs
    const prompt =
      'Break down the current research topic into 4 clear, actionable sequential milestone tasks for a researcher.\n' +
      'Format each task on a single line starting with "- ".\nKeep tasks short and concrete.';

    const res = await send({
      type: 'CHAT',
      prompt,
      context: { title: state.tab ? state.tab.title : 'Research Roadmap' },
    });

    dom.btnAutoPlan.disabled = false;
    dom.btnAutoPlan.innerHTML = oldHtml;

    if (res && res.ok && res.reply) {
      const generated = res.reply
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]\s*/, '').trim())
        .filter((l) => l.length > 5 && l.length < 120);

      // Preserve user-created tasks!
      const userTasks = state.tasks.filter((t) => !t.autoGenerated);
      for (const text of generated.slice(0, 4)) {
        await send({ type: 'ADD_TASK', text, autoGenerated: true });
      }
      await loadTasks();
    }
  }

  // ------------------------------------------------------------- bridge ---

  async function refreshBridgeStatus() {
    const status = await send({ type: 'GET_BRIDGE_STATUS' });
    const isConn = status && status.connected;
    state.bridge.connected = isConn;

    dom.desktopStatusDot.className = `sp-status-circle ${isConn ? 'green' : 'red'}`;
    dom.desktopStatusDot.title = isConn
      ? 'Bob Desktop is connected & listening on port 54321'
      : 'Bob Desktop is offline or closed';
  }

  // ---------------------------------------------------------- view switch ---

  function switchView(viewName) {
    state.view = viewName;
    document.querySelectorAll('.sp-nav-btn').forEach((btn) => {
      const isActive = btn.dataset.view === viewName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.sp-view').forEach((sec) => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });

    if (viewName === 'tabs') loadTabs();
    if (viewName === 'tasks') loadTasks();
  }

  // ------------------------------------------------------------- tools ---

  function runTool(toolId) {
    dom.toolsPopover.hidden = true;
    if (toolId === 'auto-highlight') {
      send({ type: 'AUTO_HIGHLIGHT_PAGE' });
    } else if (toolId === 'clear-highlights') {
      send({ type: 'CLEAR_PAGE_HIGHLIGHTS' });
    } else if (toolId === 'bridge') {
      // Toggle AI Bridge Handoff bar
      state.bridgeHandoffActive = true;
      dom.bridgeHandoffBar.hidden = false;
      dom.promptInput.placeholder = 'Describe what context to hand off between models…';
      dom.promptInput.focus();
    } else if (toolId === 'notes') {
      loadNotesSheet();
    }
  }

  async function loadNotesSheet() {
    dom.notesSheet.hidden = false;
    clear(dom.notesList);
    const res = await send({ type: 'GET_NOTES' });
    const notes = (res && res.ok && Array.isArray(res.notes)) ? res.notes : [];

    if (!notes.length) {
      dom.notesList.appendChild(make('div', 'sp-empty', 'No notes saved yet. Select text on any page and click "Notes".'));
      return;
    }

    notes.forEach((n) => {
      const card = make('div', 'sp-note');
      card.appendChild(make('div', 'sp-note-text', n.text));
      const meta = make('div', 'sp-note-meta');
      meta.appendChild(make('span', null, n.domain || domainOf(n.sourceUrl || '')));
      meta.appendChild(make('span', null, relativeTime(n.createdAt)));
      card.appendChild(meta);
      dom.notesList.appendChild(card);
    });
  }

  // ------------------------------------------------------------- wiring ---

  function wireEvents() {
    // Header actions
    dom.btnClosePanel.addEventListener('click', () => window.close());

    dom.btnOpenDesktop.addEventListener('click', async () => {
      dom.btnOpenDesktop.disabled = true;
      const res = await send({ type: 'OPEN_BOB_DESKTOP' });
      dom.btnOpenDesktop.disabled = false;
      if (!res || !res.ok) {
        dom.desktopStatusDot.className = 'sp-status-circle red';
      }
    });

    dom.btnSessionHistory.addEventListener('click', () => {
      const willOpen = dom.historyDrawer.hidden;
      dom.historyDrawer.hidden = !willOpen;
      if (willOpen) renderSessionHistory();
    });

    dom.btnCloseHistory.addEventListener('click', () => {
      dom.historyDrawer.hidden = true;
    });

    dom.btnPinExtension.addEventListener('click', async () => {
      dom.btnPinExtension.style.display = 'none';
      await chrome.storage.local.set({ bob_pinned: true });
    });

    // Navigation
    document.querySelectorAll('.sp-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    dom.btnNewSession.addEventListener('click', resetToNewSession);

    // Dual-card Landing Screen
    dom.cardGeneralChat.addEventListener('click', startGeneralSession);
    dom.cardChooseResearch.addEventListener('click', openProjectSelector);
    dom.btnCloseProjectSheet.addEventListener('click', () => {
      dom.projectSheet.hidden = true;
    });

    dom.projectSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = state.projects.filter((p) => p.name.toLowerCase().includes(q));
      renderProjectList(filtered);
    });

    // Summary Create / Recreate button
    dom.btnBuildSummary.addEventListener('click', buildSummary);

    // Tabs master radio toggle
    dom.btnAllTabsToggle.addEventListener('click', async () => {
      const nextVal = !state.isAllTabsSelected;
      const res = await send({ type: 'SET_ALL_TABS_SELECTED', selected: nextVal });
      if (res && res.ok) {
        state.tabs = res.tabs || [];
        renderTabs();
      }
    });

    // Tabs collapse chevron
    dom.btnToggleOther.addEventListener('click', () => {
      const expanded = dom.btnToggleOther.getAttribute('aria-expanded') === 'true';
      dom.btnToggleOther.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      dom.tabsOther.classList.toggle('collapsed', expanded);
    });

    // Tasks Add form
    dom.taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = dom.taskInput.value.trim();
      if (!val) return;
      dom.taskInput.value = '';
      const res = await send({ type: 'ADD_TASK', text: val });
      if (res && res.ok) {
        state.tasks = res.tasks;
        renderTasks();
      }
    });

    dom.btnAutoPlan.addEventListener('click', handleAutoPlanTasks);

    // Task confirm chip
    dom.btnTaskConfirmYes.addEventListener('click', async () => {
      const taskId = dom.taskConfirmChip.dataset.taskId;
      if (taskId) {
        await send({ type: 'TOGGLE_TASK', id: taskId, done: true });
        await loadTasks();
      }
      dom.taskConfirmChip.hidden = true;
    });

    dom.btnTaskConfirmNo.addEventListener('click', () => {
      dom.taskConfirmChip.hidden = true;
    });

    // Composer
    dom.promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const val = dom.promptInput.value;
        dom.promptInput.value = '';
        submitPrompt(val);
      }
    });

    dom.btnSend.addEventListener('click', () => {
      const val = dom.promptInput.value;
      dom.promptInput.value = '';
      submitPrompt(val);
    });

    // Tools menu
    dom.btnTools.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.toolsPopover.hidden = !dom.toolsPopover.hidden;
    });

    dom.toolsPopover.querySelectorAll('.sp-pop-item').forEach((item) => {
      item.addEventListener('click', () => runTool(item.dataset.tool));
    });

    document.addEventListener('click', (e) => {
      if (!dom.toolsPopover.hidden && !dom.toolsPopover.contains(e.target) && e.target !== dom.btnTools) {
        dom.toolsPopover.hidden = true;
      }
      if (!dom.historyDrawer.hidden && !dom.historyDrawer.contains(e.target) && e.target !== dom.btnSessionHistory) {
        dom.historyDrawer.hidden = true;
      }
    });

    dom.btnCloseBridgeHandoff.addEventListener('click', () => {
      state.bridgeHandoffActive = false;
      dom.bridgeHandoffBar.hidden = true;
      dom.promptInput.placeholder = 'Ask Bob about this page…';
    });

    dom.btnCloseNotesSheet.addEventListener('click', () => {
      dom.notesSheet.hidden = true;
    });
  }

  // ------------------------------------------------------------- init ---

  async function init() {
    // Cache DOM
    [
      'btn-session-history', 'btn-open-desktop', 'desktop-status-dot', 'btn-pin-extension', 'btn-close-panel',
      'history-drawer', 'btn-close-history', 'history-list',
      'btn-new-session', 'research-landing', 'card-general-chat', 'card-choose-research',
      'project-sheet', 'btn-close-project-sheet', 'project-search-input', 'project-list',
      'chat-stream', 'btn-build-summary', 'summary-btn-icon', 'summary-btn-text', 'summary-output',
      'bar-all-tabs', 'btn-all-tabs-toggle', 'radio-all-tabs-circle', 'tabs-selected-count',
      'tabs-selected', 'btn-toggle-other', 'other-tabs-count', 'tabs-other',
      'btn-auto-plan', 'task-form', 'task-input', 'task-list',
      'task-confirm-chip', 'task-confirm-text', 'btn-task-confirm-yes', 'btn-task-confirm-no',
      'bridge-handoff-bar', 'bridge-source-select', 'bridge-dest-select', 'btn-close-bridge-handoff',
      'composer', 'promptInput', 'btn-tools', 'btn-send', 'tools-popover',
      'notes-sheet', 'btn-close-notes-sheet', 'notes-list'
    ].forEach((id) => {
      const camel = id.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      dom[camel] = $(id);
    });

    wireEvents();
    await loadSessions();
    await refreshBridgeStatus();
    await loadTabs();
    await loadTasks();

    // Periodic heartbeat to desktop bridge
    setInterval(refreshBridgeStatus, 15000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
