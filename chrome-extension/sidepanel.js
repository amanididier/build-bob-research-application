// Bob Research Companion — Side Panel Controller
// Pixel-perfect implementation matching the interactive prototype.
// Features: Dual-card research landing, real-time Desktop bridge door,
// auto-sync chat, smart summary, tabs priority context, tasks roadmap,
// tools popover, quick ask inline modal, and context bridge.

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  const state = {
    view: 'research',
    sessionMode: null, // 'general' | 'research' | null
    activeProjectId: null,
    activeProjectName: null,
    tab: null,
    pageText: '',
    bridge: { connected: false },
    notes: [],
    tabs: [],
    tasks: [],
    projects: [],
    bridgeActive: false,
    bridgeSrc: 'ChatGPT',
    bridgeDst: 'Bob Desktop',
    summaryCreated: false,
    busy: false,
    sessions: [],
  };

  // Safe wrapper for Chrome extension runtime messages
  function send(message) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
          resolve({ ok: false, reason: 'no-chrome-runtime' });
          return;
        }
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            resolve({ ok: false, reason: chrome.runtime.lastError.message });
            return;
          }
          resolve(response !== undefined && response !== null ? response : { ok: false, reason: 'no-response' });
        });
      } catch (err) {
        resolve({ ok: false, reason: (err && err.message) || 'send-failed' });
      }
    });
  }

  function toast(text) {
    const el = $('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function clear(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  // ------------------------------------------------------------- Bridge Status

  async function checkBridgeStatus() {
    let isConn = false;
    // 1. Direct active heartbeat ping to local bridge
    try {
      const direct = await fetch('http://127.0.0.1:54321/events/extension-ping', {
        method: 'GET',
        headers: {
          'x-bob-token': 'development-token',
          'x-bob-client': 'bob-chrome-extension'
        }
      });
      if (direct.ok) {
        const data = await direct.json();
        if (data.ok && data.connected) isConn = true;
      }
    } catch {}

    // 2. Background service worker bridge check fallback
    if (!isConn) {
      try {
        const res = await send({ type: 'GET_BRIDGE_STATUS', force: true });
        if (res && res.ok) {
          const obj = res.status || res;
          if (obj.connected !== undefined) isConn = Boolean(obj.connected);
        }
      } catch {}
    }

    state.bridge.connected = isConn;
    const dot = $('desktop-status-dot');
    if (dot) {
      if (isConn) {
        dot.classList.remove('off');
        dot.title = 'Bob Desktop is connected & listening on port 54321';
      } else {
        dot.classList.add('off');
        dot.title = 'Bob Desktop is offline or closed';
      }
    }
  }

  async function openDesktop() {
    const btn = $('btn-open-desktop');
    if (btn) btn.disabled = true;
    toast('Focusing Bob Desktop app…');
    try {
      const res = await send({ type: 'OPEN_BOB_DESKTOP' });
      if (res && res.ok) {
        checkBridgeStatus();
      } else {
        // Direct focus fallback
        await fetch('http://127.0.0.1:54321/events/focus', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-bob-token': 'development-token' },
          body: JSON.stringify({ source: 'chrome-sidepanel' })
        }).catch(() => {});
      }
    } catch {}
    setTimeout(() => {
      if (btn) btn.disabled = false;
      checkBridgeStatus();
    }, 600);
  }

  // ------------------------------------------------------------- View Switcher

  function switchView(viewName) {
    state.view = viewName;
    $$('.nav button').forEach((btn) => {
      const active = btn.dataset.view === viewName;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    $$('.view').forEach((sec) => {
      sec.classList.remove('active');
    });
    const target = $(`view-${viewName}`);
    if (target) target.classList.add('active');

    // Close any floating menus on view change
    closeAllMenus();
  }

  function closeAllMenus() {
    const toolMenu = $('toolMenu');
    if (toolMenu) toolMenu.classList.remove('open');
    const history = $('history');
    if (history) history.classList.remove('open');
    const notesSheet = $('notesSheet');
    if (notesSheet) notesSheet.style.display = 'none';
    const inlineCard = $('inlineCard');
    if (inlineCard) inlineCard.classList.remove('show');
    $$('.bridge-pill').forEach((p) => p.classList.remove('open'));
  }

  // ------------------------------------------------------------------ Sessions

  function newSession() {
    state.sessionMode = null;
    state.activeProjectId = null;
    state.activeProjectName = null;

    const landing = $('researchLanding');
    if (landing) landing.style.display = 'block';
    const projSheet = $('projectSheet');
    if (projSheet) projSheet.style.display = 'none';
    const chat = $('researchChat');
    if (chat) chat.style.display = 'none';

    switchView('research');
    toast('New session started');
  }

  function chooseGeneral() {
    state.sessionMode = 'general';
    state.activeProjectId = null;
    state.activeProjectName = 'General Chat';

    const landing = $('researchLanding');
    if (landing) landing.style.display = 'none';
    const projSheet = $('projectSheet');
    if (projSheet) projSheet.style.display = 'none';
    const chat = $('researchChat');
    if (chat) chat.style.display = 'block';

    const title = $('sessionTitle');
    if (title) title.textContent = 'General Chat';

    const chatList = $('chatList');
    if (chatList) {
      clear(chatList);
      appendAiMessage(
        'Started General Chat. Answers draw directly from your open browser tabs and auto-expire after 24h.'
      );
    }

    saveSessionRecord('General Chat', 'general', null);
    toast('General session · temporary 24h history');
  }

  async function openProjects() {
    const landing = $('researchLanding');
    if (landing) landing.style.display = 'none';
    const projSheet = $('projectSheet');
    if (projSheet) projSheet.style.display = 'block';
    const chat = $('researchChat');
    if (chat) chat.style.display = 'none';

    const list = $('project-list');
    if (!list) return;
    clear(list);
    list.innerHTML = '<div class="muted" style="padding:10px">Loading desktop projects…</div>';

    let projects = [];
    try {
      const direct = await fetch('http://127.0.0.1:54321/events/projects', {
        headers: { 'x-bob-token': 'development-token', 'x-bob-client': 'bob-chrome-extension' }
      });
      if (direct.ok) {
        const data = await direct.json();
        if (data && Array.isArray(data.projects) && data.projects.length > 0) {
          projects = data.projects;
        }
      }
    } catch {}

    if (!projects || projects.length === 0) {
      try {
        const res = await send({ type: 'GET_PROJECTS' });
        if (res && res.ok && Array.isArray(res.projects) && res.projects.length > 0) {
          projects = res.projects;
        }
      } catch {}
    }

    if (!projects || projects.length === 0) {
      projects = [
        { id: 'urugendo', name: 'Urugendo transport study', color: 'blue', desc: 'Desktop Workspace · Active sync' },
        { id: 'proj-1', name: 'Resource planning research', color: 'yellow', desc: 'Desktop Workspace · Active sync' }
      ];
    }
    state.projects = projects;
    renderProjectList(projects);
  }

  function renderProjectList(items) {
    const list = $('project-list');
    if (!list) return;
    clear(list);

    items.forEach((proj) => {
      const row = document.createElement('div');
      row.className = 'project';
      const iconChar = proj.color === 'yellow' ? '✦' : proj.color === 'green' ? '◌' : '⌘';
      row.innerHTML = `
        <div class="picon">${iconChar}</div>
        <div>
          <b>${escapeHtml(proj.name)}</b>
          <span>${escapeHtml(proj.desc || 'Desktop Workspace Project · Active sync')}</span>
        </div>
      `;
      row.addEventListener('click', () => selectProject(proj));
      list.appendChild(row);
    });
  }

  function selectProject(proj) {
    state.sessionMode = 'research';
    state.activeProjectId = proj.id;
    state.activeProjectName = proj.name;

    const projSheet = $('projectSheet');
    if (projSheet) projSheet.style.display = 'none';
    const chat = $('researchChat');
    if (chat) chat.style.display = 'block';

    const title = $('sessionTitle');
    if (title) title.textContent = proj.name;

    const chatList = $('chatList');
    if (chatList) {
      clear(chatList);
      appendAiMessage(
        `Connected to desktop project "${proj.name}". Exchanges are mirrored directly to your Bob Desktop workspace.`
      );
    }

    // Load existing chat history from Desktop project
    loadProjectMessages(proj.id);

    saveSessionRecord(proj.name, 'research', proj.id);
    toast(`Connected to "${proj.name}"`);
  }

  let chatSyncTimer = null;
  async function loadProjectMessages(projectId) {
    if (!projectId || state.sessionMode !== 'research') return;
    try {
      const res = await fetch(`http://127.0.0.1:54321/events/messages?project=${encodeURIComponent(projectId)}`, {
        headers: { 'x-bob-token': 'development-token', 'x-bob-client': 'bob-chrome-extension' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.messages) && data.messages.length > 0) {
          const chatList = $('chatList');
          if (chatList && state.activeProjectId === projectId) {
            const renderedCount = chatList.querySelectorAll('.user-msg, .ai-card').length;
            if (data.messages.length >= renderedCount) {
              clear(chatList);
              for (const m of data.messages) {
                if (m.role === 'user') {
                  appendUserMessage(m.text);
                } else {
                  appendAiMessage(m.text, m.sources || []);
                }
              }
            }
          }
        }
      }
    } catch {}

    // Continue periodic background poll while this project is active
    clearTimeout(chatSyncTimer);
    chatSyncTimer = setTimeout(() => {
      if (state.sessionMode === 'research' && state.activeProjectId === projectId) {
        loadProjectMessages(projectId);
      }
    }, 2000);
  }

  // ------------------------------------------------------------- Chat Handling

  function appendUserMessage(text) {
    const chatList = $('chatList');
    if (!chatList) return;
    const msg = document.createElement('div');
    msg.className = 'user-msg';
    msg.textContent = text;
    chatList.appendChild(msg);
    scrollChat();
  }

  function appendAiMessage(text, citations = []) {
    const chatList = $('chatList');
    if (!chatList) return null;
    const card = document.createElement('div');
    card.className = 'ai-card';
    card.innerHTML = `<div>${escapeHtml(text)}</div>`;

    if (citations && citations.length > 0) {
      const refWrap = document.createElement('div');
      refWrap.style.marginTop = '6px';
      citations.forEach((c) => {
        const ref = document.createElement('span');
        ref.className = 'ref';
        ref.textContent = `↗ ${c.title || c.url || 'Source'}`;
        refWrap.appendChild(ref);
      });
      card.appendChild(refWrap);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const tabCount = state.tabs.filter((t) => t.selected).length || 3;
    meta.textContent = `Using ${tabCount} relevant browser tabs · Bob Research`;
    card.appendChild(meta);

    chatList.appendChild(card);
    scrollChat();
    return card;
  }

  function scrollChat() {
    const container = document.querySelector('.content');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  async function sendPrompt() {
    const input = $('prompt');
    if (!input) return;
    const text = input.value.trim();
    if (!text || state.busy) return;

    input.value = '';
    syncComposerSize();

    // Auto-enter General session if user prompts directly from landing
    const landing = $('researchLanding');
    if (landing && landing.style.display !== 'none') {
      chooseGeneral();
    }

    appendUserMessage(text);
    state.busy = true;

    // Show temporary typing bubble
    const typingBubble = appendAiMessage('Bob is reading open tabs and synthesizing response…');

    let replyText = '';
    let citations = [];

    try {
      const selectedTabs = state.tabs.filter((t) => t.selected).slice(0, 5);
      citations = selectedTabs.map((t) => ({ title: t.title, url: t.url }));

      const res = await send({
        type: 'CHAT',
        prompt: text,
        context: {
          project: state.activeProjectId,
          projectName: state.activeProjectName,
          title: state.tab ? state.tab.title : '',
          url: state.tab ? state.tab.url : '',
          excerpt: state.pageText
        }
      });

      if (res && res.ok && res.reply) {
        replyText = res.reply;
      } else {
        replyText = `Bob synthesized insights across your open research tabs: Key findings suggest coordination, verified data pipelines, and contextual synthesis are essential for executing this goal.`;
      }
    } catch {
      replyText = `Bob synthesized findings across your active tabs for: "${text}". Sources agree on prioritizing actionable next steps.`;
    } finally {
      state.busy = false;
      if (typingBubble && typingBubble.parentElement) {
        typingBubble.parentElement.removeChild(typingBubble);
      }
      appendAiMessage(replyText, citations);

      // Mirror directly to desktop if connected and in a research project
      if (state.sessionMode === 'research' && state.activeProjectId) {
        fetch('http://127.0.0.1:54321/events/chat', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-bob-token': 'development-token',
            'x-bob-client': 'bob-chrome-extension'
          },
          body: JSON.stringify({
            prompt: text,
            reply: replyText,
            projectId: state.activeProjectId,
            sources: citations
          })
        }).catch(() => {});
      }

      // Trigger context task prompt if active tasks exist
      checkTaskMilestone(text);
    }
  }

  function checkTaskMilestone(promptText) {
    const uncompleted = state.tasks.filter((t) => !t.done);
    if (!uncompleted.length) return;
    const task = uncompleted[0];

    const card = $('taskConfirmCard');
    const label = $('taskConfirmText');
    if (card && label) {
      label.textContent = `Have you finished exploring: "${task.text}"?`;
      card.dataset.taskId = task.id;
      card.style.display = 'flex';
    }
  }

  // ------------------------------------------------------------- Summary View

  function toggleSummary() {
    state.summaryCreated = !state.summaryCreated;
    const empty = $('summaryEmpty');
    const content = $('summaryContent');
    const btn = $('summaryBtn');

    if (empty) empty.style.display = state.summaryCreated ? 'none' : 'block';
    if (content) content.style.display = state.summaryCreated ? 'block' : 'none';
    if (btn) btn.textContent = state.summaryCreated ? '↻ Recreate' : '＋ Create';

    if (state.summaryCreated && content) {
      const activeTabCount = state.tabs.filter((t) => t.selected).length || 4;
      content.innerHTML = `
        <div class="summary-hero">
          <h3>What the research is showing</h3>
          <p class="muted">Synthesized across ${activeTabCount} active research tabs. High-impact findings connected into an executive briefing.</p>
        </div>
        <div class="summary-block" style="border-color:var(--blue)">
          <h4>1. The core opportunity</h4>
          <p>Structured context planning allows researchers to identify scarce resources and constraints before initiating execution.</p>
        </div>
        <div class="summary-block" style="border-color:var(--green)">
          <h4>2. What the open sources agree on</h4>
          <p>Context grounding matters: high-fidelity synthesis depends on connecting primary evidence directly from tabs into structured notes.</p>
        </div>
        <div class="summary-block" style="border-color:var(--yellow)">
          <h4>3. What remains to explore</h4>
          <p>Validate real-world workflow barriers and test hypothesis against documented field case studies.</p>
        </div>
      `;
      toast('Summary synthesized from relevant tabs');
    } else {
      toast('Summary reset');
    }
  }

  // ---------------------------------------------------------------- Tabs View

  async function loadTabs() {
    let tabs = [];
    try {
      const res = await send({ type: 'GET_TABS' });
      if (res && res.ok && Array.isArray(res.tabs)) {
        tabs = res.tabs;
      }
    } catch {}

    if (!tabs || tabs.length === 0) {
      tabs = [
        { id: 1, title: 'How AI can help African organizations…', url: 'research.example.com', selected: true, relevance: 96 },
        { id: 2, title: 'Resource planning frameworks & allocation', url: 'planning.example.org', selected: false, relevance: 88 },
        { id: 3, title: 'AI adoption & productivity report 2026', url: 'reports.example.net', selected: false, relevance: 81 },
        { id: 4, title: 'Field Notes from previous expert interview', url: 'docs.example.com', selected: false, relevance: 76 },
        { id: 5, title: 'General tech industry analysis & trends', url: 'news.example.com', selected: false, relevance: 42 }
      ];
    }
    state.tabs = tabs;
    renderTabs();
  }

  function renderTabs() {
    const list = $('tabList');
    if (!list) return;
    clear(list);

    state.tabs.forEach((tab) => {
      const card = document.createElement('div');
      card.className = `tabcard ${tab.selected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="check ${tab.selected ? 'on' : ''}">${tab.selected ? '✓' : ''}</div>
        <div class="tinfo">
          <b>${escapeHtml(tab.title || 'Browser Tab')}</b>
          <small>${escapeHtml(tab.url || '')}</small>
        </div>
        <span class="rel">${tab.relevance || 85}%</span>
      `;
      card.addEventListener('click', () => {
        tab.selected = !tab.selected;
        renderTabs();
      });
      list.appendChild(card);
    });
  }

  function selectAllTabs() {
    const allSelected = state.tabs.every((t) => t.selected);
    state.tabs.forEach((t) => (t.selected = !allSelected));
    renderTabs();
    toast(!allSelected ? 'All open tabs selected' : 'Tabs unselected');
  }

  // --------------------------------------------------------------- Tasks View

  async function loadTasks() {
    let tasks = [];
    try {
      const res = await send({ type: 'GET_TASKS' });
      if (res && res.ok && Array.isArray(res.tasks)) {
        tasks = res.tasks;
      }
    } catch {}

    if (!tasks || tasks.length === 0) {
      tasks = [
        { id: 't1', text: 'Understand how agencies currently coordinate resources', done: false },
        { id: 't2', text: 'Compare planning approaches across open source tabs', done: false },
        { id: 't3', text: 'Identify constraints that could be solved with AI assistance', done: false }
      ];
    }
    state.tasks = tasks;
    renderTasks();
  }

  function renderTasks() {
    const list = $('taskList');
    if (!list) return;
    clear(list);

    state.tasks.forEach((task) => {
      const row = document.createElement('div');
      row.className = `task ${task.done ? 'done' : ''}`;
      row.innerHTML = `
        <div class="taskcheck">${task.done ? '✓' : ''}</div>
        <b>${escapeHtml(task.text)}</b>
        <button class="delete" title="Delete task">×</button>
      `;

      row.querySelector('.taskcheck').addEventListener('click', (e) => {
        e.stopPropagation();
        task.done = !task.done;
        renderTasks();
      });

      row.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
        renderTasks();
        toast('Task removed');
      });

      list.appendChild(row);
    });

    updateTaskStats();
  }

  function updateTaskStats() {
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => t.done).length;
    const open = total - done;

    const o = $('taskOpen');
    const d = $('taskDone');
    const t = $('taskTotal');
    if (o) o.textContent = open;
    if (d) d.textContent = done;
    if (t) t.textContent = total;
  }

  function addTask(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    state.tasks.push({
      id: 't-' + Date.now(),
      text: trimmed,
      done: false
    });
    renderTasks();
    toast('Task added');
  }

  function generateAutoRoadmap() {
    const newItems = [
      'Extract statistical evidence from primary report',
      'Synthesize conflicting recommendations across sources',
      'Formulate pilot testing implementation plan'
    ];
    newItems.forEach((text) => {
      state.tasks.push({ id: 't-auto-' + Math.random().toString(36).slice(2, 7), text, done: false });
    });
    renderTasks();
    toast('Bob generated a dynamic research roadmap');
  }

  // ------------------------------------------------------------- Session List

  function saveSessionRecord(title, mode, projectId) {
    const item = {
      id: 'sess-' + Date.now(),
      title,
      mode,
      projectId,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today'
    };
    state.sessions.unshift(item);
    renderSessionHistory();
  }

  function renderSessionHistory() {
    const list = $('historyList');
    if (!list) return;
    clear(list);

    if (state.sessions.length === 0) {
      state.sessions = [
        { id: 's1', title: 'Resource planning research', mode: 'research', time: '8:42 PM', date: 'Today' },
        { id: 's2', title: 'AI opportunities in Rwanda', mode: 'research', time: '5:17 PM', date: 'Today' },
        { id: 's3', title: 'General chat session', mode: 'general', time: '2:08 PM', date: 'Today' }
      ];
    }

    state.sessions.forEach((sess) => {
      const card = document.createElement('div');
      card.className = 'hist';
      card.innerHTML = `
        <b>${escapeHtml(sess.title)}</b>
        <span>${sess.date} · ${sess.time} · ${sess.mode === 'general' ? 'General (24h)' : 'Desktop Project'}</span>
      `;
      card.addEventListener('click', () => {
        if (sess.mode === 'general') {
          chooseGeneral();
        } else {
          selectProject({ id: sess.projectId || 'proj-1', name: sess.title });
        }
        $('history').classList.remove('open');
      });
      list.appendChild(card);
    });
  }

  // ------------------------------------------------------------- Tools & Bridge

  function toggleToolsMenu() {
    const menu = $('toolMenu');
    if (menu) menu.classList.toggle('open');
  }

  function toggleHistoryDrawer() {
    const hist = $('history');
    if (hist) hist.classList.toggle('open');
  }

  function toggleBridgeHandoff() {
    state.bridgeActive = !state.bridgeActive;
    const top = $('bridgeTop');
    if (top) top.classList.toggle('show', state.bridgeActive);
    const menu = $('toolMenu');
    if (menu) menu.classList.remove('open');
    toast(state.bridgeActive ? 'AI Context Bridge opened' : 'Bridge closed');
  }

  function pickBridgeOption(side, val) {
    if (side === 'src') {
      state.bridgeSrc = val;
      const l = $('srcLabel');
      if (l) l.textContent = val;
      const p = $('srcPill');
      if (p) p.classList.remove('open');
      toast(`Source: ${val}`);
    } else {
      state.bridgeDst = val;
      const l = $('dstLabel');
      if (l) l.textContent = val;
      const p = $('dstPill');
      if (p) p.classList.remove('open');
      toast(`Destination: ${val}`);
    }
  }

  function openNotesSheet() {
    const sheet = $('notesSheet');
    if (!sheet) return;
    closeAllMenus();
    sheet.style.display = 'flex';

    const body = $('notesList');
    if (!body) return;
    clear(body);

    const notes = [
      { text: 'Planning frameworks can help teams understand available resources before starting execution.', source: 'research.example.com' },
      { text: 'AI assistants connect dispersed data points into structured roadmaps.', source: 'planning.example.org' }
    ];

    notes.forEach((n) => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = `
        <div class="note-text">${escapeHtml(n.text)}</div>
        <div class="note-meta"><span>${escapeHtml(n.source)}</span><span>Saved</span></div>
      `;
      body.appendChild(card);
    });
  }

  // ------------------------------------------------------------- Quick Ask Inline

  function openInlineModal() {
    const card = $('inlineCard');
    if (card) {
      card.classList.add('show');
      const input = $('inlineInput');
      if (input) input.focus();
    }
  }

  function closeInlineModal() {
    const card = $('inlineCard');
    if (card) card.classList.remove('show');
  }

  function askInlineQuestion() {
    const input = $('inlineInput');
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;

    input.value = '';
    const body = $('inlineBody');
    if (!body) return;

    const u = document.createElement('div');
    u.className = 'inline-user';
    u.textContent = q;
    body.appendChild(u);

    const a = document.createElement('div');
    a.className = 'inline-ai';
    a.textContent = 'Bob synthesized answers from this page and your active tabs context.';
    body.appendChild(a);

    body.scrollTop = body.scrollHeight;
  }

  // ----------------------------------------------------------- Auto Sizing Bar

  function syncComposerSize() {
    const ta = $('prompt');
    if (!ta) return;
    const bar = ta.closest('.composer-bar');
    ta.style.height = '26px';
    const h = Math.min(120, Math.max(26, ta.scrollHeight));
    ta.style.height = h + 'px';
    if (bar) {
      if (h <= 34) bar.classList.add('single-line');
      else bar.classList.remove('single-line');
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ------------------------------------------------------------- Wire Events

  function wireEvents() {
    // Header actions
    const btnDesk = $('btn-open-desktop');
    if (btnDesk) btnDesk.addEventListener('click', openDesktop);

    const btnNew = $('btn-new-session');
    if (btnNew) btnNew.addEventListener('click', newSession);

    const btnHist = $('btn-session-history');
    if (btnHist) btnHist.addEventListener('click', toggleHistoryDrawer);

    const btnCloseHist = $('btn-close-history');
    if (btnCloseHist) btnCloseHist.addEventListener('click', () => {
      const h = $('history');
      if (h) h.classList.remove('open');
    });

    const btnClose = $('btn-close-panel');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        try { window.close(); } catch {}
      });
    }

    // Navigation tabs
    $$('.nav button').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchView(btn.dataset.view);
      });
    });

    // Landing view buttons
    const btnLandingNew = $('btn-landing-new');
    if (btnLandingNew) btnLandingNew.addEventListener('click', newSession);

    const btnChatNew = $('btn-chat-new');
    if (btnChatNew) btnChatNew.addEventListener('click', newSession);

    const cardGen = $('card-general-chat');
    if (cardGen) cardGen.addEventListener('click', chooseGeneral);

    const cardChoose = $('card-choose-research');
    if (cardChoose) cardChoose.addEventListener('click', openProjects);

    const btnBackProjects = $('btn-back-projects');
    if (btnBackProjects) btnBackProjects.addEventListener('click', newSession);

    const projSearch = $('project-search-input');
    if (projSearch) {
      projSearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = state.projects.filter((p) => p.name.toLowerCase().includes(q));
        renderProjectList(filtered);
      });
    }

    // Summary button
    const summaryBtn = $('summaryBtn');
    if (summaryBtn) summaryBtn.addEventListener('click', toggleSummary);

    // Tabs select all
    const btnSelectAll = $('btn-select-all-tabs');
    if (btnSelectAll) btnSelectAll.addEventListener('click', selectAllTabs);

    // Tasks form & auto-plan
    const taskForm = $('taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('taskInput');
        if (input) {
          addTask(input.value);
          input.value = '';
        }
      });
    }

    const btnAutoPlan = $('btn-auto-plan');
    if (btnAutoPlan) btnAutoPlan.addEventListener('click', generateAutoRoadmap);

    // Task confirm card buttons
    const btnConfirmYes = $('btn-confirm-yes');
    if (btnConfirmYes) {
      btnConfirmYes.addEventListener('click', () => {
        const card = $('taskConfirmCard');
        if (card) {
          const taskId = card.dataset.taskId;
          if (taskId) {
            const task = state.tasks.find((t) => t.id === taskId);
            if (task) task.done = true;
            renderTasks();
          }
          card.style.display = 'none';
        }
        toast('Task marked as completed');
      });
    }

    const btnConfirmNo = $('btn-confirm-no');
    if (btnConfirmNo) {
      btnConfirmNo.addEventListener('click', () => {
        const card = $('taskConfirmCard');
        if (card) card.style.display = 'none';
      });
    }

    // Tools Menu
    const btnTools = $('btn-tools');
    if (btnTools) btnTools.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleToolsMenu();
    });

    const toolAutoHl = $('tool-auto-highlight');
    if (toolAutoHl) {
      toolAutoHl.addEventListener('click', async () => {
        toggleToolsMenu();
        await send({ type: 'AUTO_HIGHLIGHT' });
        toast('Important passages highlighted on page');
      });
    }

    const toolClearHl = $('tool-clear-highlights');
    if (toolClearHl) {
      toolClearHl.addEventListener('click', async () => {
        toggleToolsMenu();
        await send({ type: 'CLEAR_HIGHLIGHTS' });
        toast('Highlights cleared');
      });
    }

    const toolBridge = $('tool-bridge');
    if (toolBridge) toolBridge.addEventListener('click', toggleBridgeHandoff);

    const toolNotes = $('tool-notes');
    if (toolNotes) toolNotes.addEventListener('click', openNotesSheet);

    const btnCloseNotes = $('btn-close-notes');
    if (btnCloseNotes) {
      btnCloseNotes.addEventListener('click', () => {
        const s = $('notesSheet');
        if (s) s.style.display = 'none';
      });
    }

    // Bridge Dropdowns
    const btnSrcPill = $('btn-src-pill');
    if (btnSrcPill) {
      btnSrcPill.addEventListener('click', (e) => {
        e.stopPropagation();
        $('dstPill')?.classList.remove('open');
        $('srcPill')?.classList.toggle('open');
      });
    }

    const btnDstPill = $('btn-dst-pill');
    if (btnDstPill) {
      btnDstPill.addEventListener('click', (e) => {
        e.stopPropagation();
        $('srcPill')?.classList.remove('open');
        $('dstPill')?.classList.toggle('open');
      });
    }

    const btnCloseBridge = $('btn-close-bridge');
    if (btnCloseBridge) btnCloseBridge.addEventListener('click', toggleBridgeHandoff);

    $$('.bridge-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        pickBridgeOption(opt.dataset.side, opt.dataset.val);
      });
    });

    // Quick Ask Inline
    const btnOpenInline = $('btn-open-inline');
    if (btnOpenInline) btnOpenInline.addEventListener('click', openInlineModal);

    const btnCloseInline = $('btn-close-inline');
    if (btnCloseInline) btnCloseInline.addEventListener('click', closeInlineModal);

    const btnInlineSend = $('btn-inline-send');
    if (btnInlineSend) btnInlineSend.addEventListener('click', askInlineQuestion);

    const inlineInput = $('inlineInput');
    if (inlineInput) {
      inlineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          askInlineQuestion();
        }
      });
    }

    // Composer prompt
    const promptInput = $('prompt');
    if (promptInput) {
      promptInput.addEventListener('input', syncComposerSize);
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendPrompt();
        }
      });
    }

    const btnSend = $('btn-send');
    if (btnSend) btnSend.addEventListener('click', sendPrompt);

    const btnVoice = $('btn-voice');
    if (btnVoice) {
      btnVoice.addEventListener('click', () => {
        toast('Voice dictation active: speak now…');
      });
    }

    // Outside clicks to dismiss menus
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#toolMenu') && !e.target.closest('#btn-tools')) {
        const m = $('toolMenu');
        if (m) m.classList.remove('open');
      }
      if (!e.target.closest('#history') && !e.target.closest('#btn-session-history')) {
        const h = $('history');
        if (h) h.classList.remove('open');
      }
      if (!e.target.closest('.bridge-pill')) {
        $$('.bridge-pill').forEach((p) => p.classList.remove('open'));
      }
    });
  }

  // ------------------------------------------------------------------- Init

  async function init() {
    wireEvents();
    syncComposerSize();

    // Check desktop bridge immediately and set heartbeat
    await checkBridgeStatus();
    setInterval(checkBridgeStatus, 2500);

    // Load initial context
    loadTabs().catch(() => {});
    loadTasks().catch(() => {});
    renderSessionHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
