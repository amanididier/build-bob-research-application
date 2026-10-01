// Bob Research Companion — Chrome extension service worker (Manifest V3)
//
// Responsibilities: side panel control, context menus + keyboard commands,
// shared local state (notes / highlights / tabs / tasks / settings),
// the Gemini chat call, and the authenticated bridge to Bob Desktop.

const BRIDGE_ORIGIN = 'http://127.0.0.1:54321';
const DEFAULT_BRIDGE_TOKEN = 'development-token';
const BRIDGE_TIMEOUT_MS = 1500;
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

const KEYS = {
  notes: 'bob_notes',
  highlights: 'bob_highlights',
  tabs: 'bob_tabs',
  tasks: 'bob_tasks',
  settings: 'bob_settings',
  pendingAsk: 'bob_pending_ask',
  bridgeStatus: 'bob_bridge_status',
};

const DEFAULT_SETTINGS = {
  geminiKey: '',
  bridgeToken: DEFAULT_BRIDGE_TOKEN,
  syncTabsToDesktop: true,
  highlightCycleIndex: 0,
  researchFocus: '',
  // By default Bob reads every open tab and picks the most relevant ones on its
  // own. The moment the user hand-picks tabs, manualTabSelection flips true and
  // auto-selection/auto-sync defers to their choice.
  manualTabSelection: false,
  autoSyncTabs: true,
};

const HIGHLIGHT_COLORS = ['green', 'blue', 'yellow'];

// ---------------------------------------------------------------- storage ---

async function getStore(keys) {
  return chrome.storage.local.get(keys);
}

async function getSettings() {
  const res = await getStore([KEYS.settings]);
  return { ...DEFAULT_SETTINGS, ...(res[KEYS.settings] || {}) };
}

async function setSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [KEYS.settings]: next });
  return next;
}

async function readList(key) {
  const res = await getStore([key]);
  return Array.isArray(res[key]) ? res[key] : [];
}

async function writeList(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

const nowId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ----------------------------------------------------------------- bridge ---
// The desktop app exposes only: GET /health, POST /events/tab,
// POST /events/note, POST /events/ask — every request needs `x-bob-token`.

let bridgeCache = { connected: false, version: null, checkedAt: 0 };

async function bridgeFetch(path, { method = 'GET', body, token } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT_MS);
  try {
    const res = await fetch(`${BRIDGE_ORIGIN}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-bob-token': token || DEFAULT_BRIDGE_TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err && err.name === 'AbortError' ? 'timeout' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

async function getBridgeStatus({ force = false } = {}) {
  const age = Date.now() - bridgeCache.checkedAt;
  if (!force && bridgeCache.checkedAt && age < 8000) return bridgeCache;

  const settings = await getSettings();
  const res = await bridgeFetch('/events/handshake', { token: settings.bridgeToken });

  if (res.ok && res.data && res.data.ok) {
    bridgeCache = { connected: true, version: res.data.version || null, checkedAt: Date.now(), detail: 'ok' };
  } else if (res.status === 401) {
    bridgeCache = { connected: false, version: null, checkedAt: Date.now(), detail: 'bad-token' };
  } else if (res.status) {
    bridgeCache = { connected: false, version: null, checkedAt: Date.now(), detail: 'unexpected-response' };
  } else {
    bridgeCache = { connected: false, version: null, checkedAt: Date.now(), detail: res.error || 'unreachable' };
  }

  await chrome.storage.local.set({ [KEYS.bridgeStatus]: bridgeCache });
  return bridgeCache;
}

async function sendToBridge(path, body) {
  let status = await getBridgeStatus();
  if (!status.connected) {
    // Retry once immediately in case Bob Desktop was just opened
    status = await getBridgeStatus({ force: true });
  }
  if (!status.connected) return { delivered: false, reason: status.detail || 'unreachable' };
  const settings = await getSettings();
  const res = await bridgeFetch(path, { method: 'POST', body, token: settings.bridgeToken });
  if (res.ok) {
    bridgeCache.connected = true;
    bridgeCache.checkedAt = Date.now();
    return { delivered: true };
  }
  return { delivered: false, reason: res.status === 401 ? 'bad-token' : 'rejected' };
}

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

// Active handshake on service worker startup
async function pingBridgeHandshake() {
  await getBridgeStatus({ force: true });
}

// ------------------------------------------------------------- pairing ---
// Bind this extension to the running desktop install. The extension trades the
// shared bootstrap token for a per-install secret once, then uses that secret.
// The desktop still accepts the bootstrap token, so an extension that has not
// paired (or an older build) keeps working — pairing is strictly additive.
async function pairWithDesktop() {
  const res = await bridgeFetch('/events/pair', { method: 'POST', body: {}, token: DEFAULT_BRIDGE_TOKEN });
  if (res.ok && res.data && typeof res.data.token === 'string' && res.data.token.length >= 16) {
    await setSettings({ bridgeToken: res.data.token });
    return true;
  }
  return false;
}

// Pair (once) then handshake, so the desktop sees this extension as live and
// the composer's Chrome button can open the panel instead of the install steps.
async function syncWithDesktop() {
  const settings = await getSettings();
  const isPaired = settings.bridgeToken && settings.bridgeToken !== DEFAULT_BRIDGE_TOKEN;
  if (!isPaired) await pairWithDesktop();
  await pingBridgeHandshake();
}

syncWithDesktop().catch(() => {});
// Read and score all open tabs shortly after startup (auto mode default).
setTimeout(() => autoSyncTabs().catch(() => {}), 4000);

// ------------------------------------------------------------- side panel ---

chrome.runtime.onInstalled.addListener(() => {
  schedulePanelPolling();

  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.error('[bob] side panel behavior:', err);
    });
  }

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'bob-save-note',
      title: 'Save to Bob Notes',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'bob-highlight-green',
      title: 'Highlight — research critical (green)',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'bob-highlight-blue',
      title: 'Highlight — supporting (blue)',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'bob-highlight-yellow',
      title: 'Highlight — reference (yellow)',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'bob-ask',
      title: 'Ask Bob about this passage',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'bob-save-tab',
      title: 'Add this tab to Bob research tabs',
      contexts: ['page'],
    });
    chrome.contextMenus.create({
      id: 'bob-open-panel',
      title: 'Open Bob Research Panel',
      contexts: ['page', 'action'],
    });
  });
});

async function openPanelForTab(tabId) {
  if (!chrome.sidePanel || !chrome.sidePanel.open) return { opened: false, reason: 'unsupported' };
  try {
    await chrome.sidePanel.open({ tabId });
    return { opened: true };
  } catch (err) {
    // Chrome only allows this from a genuine user gesture.
    return { opened: false, reason: (err && err.message) || 'gesture-required' };
  }
}

// --------------------------------------------------------------------------
// Desktop → extension. Chrome has no push channel into an extension and the
// side panel may only be opened from a user gesture, so Bob Desktop leaves a
// request on the bridge; the extension polls it and raises a notification.
// Clicking that notification is the gesture Chrome requires.
// --------------------------------------------------------------------------

const PANEL_POLL_ALARM = 'bob-panel-poll';
const AUTO_SYNC_ALARM = 'bob-auto-sync';

function schedulePanelPolling() {
  if (!chrome.alarms) return;
  chrome.alarms.create(PANEL_POLL_ALARM, { periodInMinutes: 0.5 });
  chrome.alarms.create(AUTO_SYNC_ALARM, { periodInMinutes: 1 });
}

async function pollPanelRequest() {
  const status = await getBridgeStatus();
  if (!status.connected) {
    await chrome.action.setBadgeText({ text: '' }).catch(() => {});
    return;
  }

  const settings = await getSettings();
  const res = await bridgeFetch('/events/pending', { token: settings.bridgeToken });
  const pending = res.ok && res.data ? res.data.pending : null;
  if (!pending) return;

  const notificationId = nowId('panel');
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/bob-logo.png'),
    title: 'Bob Desktop is waiting',
    message: 'Click to open the Bob research side panel.',
    priority: 2,
  });

  await chrome.action.setBadgeText({ text: '●' }).catch(() => {});
  await chrome.action.setBadgeBackgroundColor({ color: '#f4bc18' }).catch(() => {});
}

if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === PANEL_POLL_ALARM) {
      syncWithDesktop();
      pollPanelRequest();
    } else if (alarm.name === AUTO_SYNC_ALARM) {
      autoSyncTabs().catch(() => {});
    }
  });
}

chrome.runtime.onStartup.addListener(schedulePanelPolling);

if (chrome.notifications) {
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    chrome.notifications.clear(notificationId);
    await chrome.action.setBadgeText({ text: '' }).catch(() => {});
    const windows = await chrome.windows.getAll();
    const target = windows.find((w) => w.focused) || windows[0];
    if (!target || !chrome.sidePanel || !chrome.sidePanel.open) return;
    try {
      await chrome.sidePanel.open({ windowId: target.id });
    } catch (err) {
      console.error('[bob] panel open from notification failed:', err);
    }
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;
  const selection = (info.selectionText || '').trim();

  switch (info.menuItemId) {
    case 'bob-open-panel':
      await openPanelForTab(tab.id);
      break;
    case 'bob-save-note':
      if (selection) await saveNote({ text: selection, pageTitle: tab.title, url: tab.url, origin: 'context-menu' });
      break;
    case 'bob-highlight-green':
    case 'bob-highlight-blue':
    case 'bob-highlight-yellow':
      if (selection) {
        await relayToTab(tab.id, {
          type: 'BOB_HIGHLIGHT_SELECTION',
          color: info.menuItemId.replace('bob-highlight-', ''),
        });
      }
      break;
    case 'bob-ask':
      if (selection) await startAsk({ prompt: '', selection, tab });
      break;
    case 'bob-save-tab':
      await saveTab({ id: tab.id, title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl });
      break;
    default:
      break;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.id) return;

  if (command === 'bob-highlight') {
    const settings = await getSettings();
    const color = HIGHLIGHT_COLORS[settings.highlightCycleIndex % HIGHLIGHT_COLORS.length];
    await setSettings({ highlightCycleIndex: (settings.highlightCycleIndex + 1) % HIGHLIGHT_COLORS.length });
    await relayToTab(tab.id, { type: 'BOB_HIGHLIGHT_SELECTION', color });
  } else if (command === 'bob-save-note') {
    await relayToTab(tab.id, { type: 'BOB_SAVE_SELECTION_AS_NOTE' });
  } else if (command === 'bob-ask') {
    await relayToTab(tab.id, { type: 'BOB_ASK_SELECTION' });
  }
});

async function relayToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    return { ok: false, reason: (err && err.message) || 'content-script-unavailable' };
  }
}

// --------------------------------------------------------------- notes/tabs ---

async function saveNote({ text, pageTitle, url, origin = 'selection', color = null }) {
  const clean = String(text || '').trim();
  if (!clean) return { ok: false, reason: 'empty' };

  const note = {
    id: nowId('note'),
    text: clean.slice(0, 20000),
    sourceTitle: pageTitle || '',
    sourceUrl: url || '',
    domain: safeDomain(url),
    color,
    origin,
    createdAt: new Date().toISOString(),
  };

  const notes = await readList(KEYS.notes);
  await writeList(KEYS.notes, [note, ...notes].slice(0, 1000));

  const delivery = await sendToBridge('/events/note', { selectedText: note.text, url: note.sourceUrl, title: note.sourceTitle });
  broadcast({ type: 'BOB_NOTE_ADDED', note, delivery });
  return { ok: true, note, delivery };
}

async function saveTab({ id, title, url, favIconUrl }) {
  if (!url) return { ok: false, reason: 'no-url' };

  const tabs = await readList(KEYS.tabs);
  const existing = tabs.find((t) => t.url === url);
  const entry = existing
    ? { ...existing, title: title || existing.title, favIconUrl: favIconUrl || existing.favIconUrl, tabId: id ?? existing.tabId, updatedAt: Date.now() }
    : {
        id: nowId('tab'),
        tabId: id ?? null,
        title: title || url,
        url,
        domain: safeDomain(url),
        favIconUrl: favIconUrl || null,
        selected: false,
        addedAt: Date.now(),
        updatedAt: Date.now(),
      };

  const next = [entry, ...tabs.filter((t) => t.url !== url)].slice(0, 300);
  await writeList(KEYS.tabs, next);

  const settings = await getSettings();
  const delivery = settings.syncTabsToDesktop
    ? await sendToBridge('/events/tab', { tabId: entry.tabId ?? entry.id, title: entry.title, url: entry.url, favicon: entry.favIconUrl })
    : { delivered: false, reason: 'sync-disabled' };

  broadcast({ type: 'BOB_TAB_ADDED', tab: entry, delivery });
  return { ok: true, tab: entry, delivery };
}

function safeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// ---------------------------------------------------- full-content reading ---
// Deep-read a tab's real text. `cap` defaults to 100k chars so Bob can read
// essentially the whole page, not just a teaser.
async function extractTabText(tabId, cap = 100000) {
  if (!tabId) return { ok: false, reason: 'no-tab' };
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [cap],
      func: (limit) => {
        const root =
          document.querySelector('article') ||
          document.querySelector('main') ||
          document.querySelector('[role="main"]') ||
          document.body;
        const text = (root.innerText || root.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
        return { title: document.title, url: location.href, text: text.slice(0, limit) };
      },
    });
    const result = injection && injection.result;
    return result ? { ok: true, ...result } : { ok: false, reason: 'no-content' };
  } catch (err) {
    return { ok: false, reason: (err && err.message) || 'injection-blocked' };
  }
}

// ------------------------------------------------------- relevance scoring ---
const STOPWORDS = new Set(
  'the a an and or but of to in for on with as by is are was were be been this that these those it its from at into about over under their there they we you your our his her which who what when where why how can could should would will may might must not no do does did done have has had more most other some such than then also very just only own same https http www html php com org net'.split(
    ' '
  )
);

function focusKeywords(text) {
  const counts = new Map();
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .forEach((w) => {
      if (w.length < 4 || STOPWORDS.has(w)) return;
      counts.set(w, (counts.get(w) || 0) + 1);
    });
  return counts;
}

// Dynamic relevance: blends how much of the research focus the tab's title
// covers, URL/domain matches, and — when a content sample is available — how
// densely the focus keywords appear in the actual page text. Produces a wide,
// content-driven 0..100 range instead of a fixed tier value.
function scoreTabRelevance(tab, focus, bodyText) {
  const total = focus.size;
  if (!total) return { score: null, tier: 'unknown', why: 'no focus set' };

  const title = String(tab.title || '').toLowerCase();
  const url = String(tab.url || '').toLowerCase();
  const body = String(bodyText || '').toLowerCase();
  const titleTokens = title.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);

  const matched = [];
  let weight = 0;
  let bodyHits = 0;
  focus.forEach((fw, kw) => {
    const inTitle = titleTokens.some((t) => t === kw || t.startsWith(kw) || kw.startsWith(t)) || title.includes(kw);
    const inUrl = url.includes(kw);
    const inBody = body ? body.includes(kw) : false;
    if (inTitle || inUrl || inBody) {
      matched.push(kw);
      if (inBody) bodyHits += 1;
      weight += (inTitle ? 2.2 : 0) + (inUrl ? 1.1 : 0) + (inBody ? 1.7 : 0) + Math.min(fw, 4) * 0.15;
    }
  });

  if (!matched.length) return { score: 6, tier: 'red', why: 'no keyword overlap' };

  const coverage = matched.length / total;
  const strength = Math.min(1, weight / (total * 1.7));
  const raw = 100 * (0.55 * coverage + 0.45 * strength);
  const score = Math.max(4, Math.min(99, Math.round(raw)));
  const tier = score >= 80 ? 'green' : score >= 62 ? 'blue' : score >= 40 ? 'yellow' : 'red';
  const why = matched.slice(0, 3).join(', ') + (bodyHits ? ' · in page text' : '');
  return { score, tier, why };
}

// Merge stored tabs with the currently-open http(s) tabs, keyed by URL.
async function collectAllTabs() {
  const stored = await readList(KEYS.tabs);
  const openTabs = await chrome.tabs.query({});
  const live = openTabs.filter((t) => t.url && /^https?:/.test(t.url));
  const byUrl = new Map(stored.map((t) => [t.url, { ...t }]));
  for (const t of live) {
    const ex = byUrl.get(t.url);
    if (ex) {
      ex.tabId = t.id ?? ex.tabId;
      ex.title = t.title || ex.title;
      ex.favIconUrl = t.favIconUrl || ex.favIconUrl;
      ex.live = true;
      ex.updatedAt = Date.now();
    } else {
      byUrl.set(t.url, {
        id: nowId('tab'),
        tabId: t.id ?? null,
        title: t.title || t.url,
        url: t.url,
        domain: safeDomain(t.url),
        favIconUrl: t.favIconUrl || null,
        selected: false,
        live: true,
        addedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }
  return { all: [...byUrl.values()], live };
}

// ------------------------------------------------------------- auto sync ---
// By default Bob re-reads every open tab about once a minute: he registers the
// tab, captures a short content sample for scoring, computes dynamic relevance,
// and — unless the user hand-picked tabs — auto-selects the most relevant ones
// and pushes them to Bob Desktop.
const SAMPLE_TTL_MS = 5 * 60 * 1000;
const MAX_SAMPLES_PER_CYCLE = 12;

async function autoSyncTabs({ force = false } = {}) {
  const settings = await getSettings();
  if (!force && settings.autoSyncTabs === false) return readList(KEYS.tabs);

  const { all, live } = await collectAllTabs();
  const focus = focusKeywords(settings.researchFocus || '');

  // Refresh content samples for readable open tabs (throttled + capped).
  let sampled = 0;
  for (const t of live) {
    if (sampled >= MAX_SAMPLES_PER_CYCLE) break;
    const entry = all.find((x) => x.url === t.url);
    if (!entry || !t.id) continue;
    if (entry.textSample && Date.now() - (entry.sampledAt || 0) < SAMPLE_TTL_MS) continue;
    const read = await extractTabText(t.id, 4000);
    if (read.ok && read.text) {
      entry.textSample = String(read.text).slice(0, 4000);
      entry.sampledAt = Date.now();
      sampled += 1;
    }
  }

  // Score every tab; auto-select the most relevant unless the user chose manually.
  let pick = null;
  if (!settings.manualTabSelection) {
    const ranked = all
      .map((t) => ({ t, s: scoreTabRelevance(t, focus, t.textSample || '') }))
      .sort((a, b) => (b.s.score == null ? -1 : b.s.score) - (a.s.score == null ? -1 : a.s.score));
    pick = new Set();
    for (const { t, s } of ranked) {
      if (pick.size >= 5) break;
      if ((s.score == null ? 0 : s.score) >= 30) pick.add(t.url);
    }
  }

  const next = all
    .map((t) => {
      const s = scoreTabRelevance(t, focus, t.textSample || '');
      return {
        ...t,
        selected: pick ? pick.has(t.url) : Boolean(t.selected),
        relevance: s.score,
        relevanceWhy: s.why,
      };
    })
    .slice(0, 300);

  await writeList(KEYS.tabs, next);

  if (settings.syncTabsToDesktop) {
    for (const t of next.filter((x) => x.selected).slice(0, 8)) {
      await sendToBridge('/events/tab', { tabId: t.tabId ?? t.id, title: t.title, url: t.url, favicon: t.favIconUrl });
    }
  }

  broadcast({ type: 'BOB_TABS_CHANGED', tabs: next });
  return next;
}

// ------------------------------------------------------------------- ask ---

async function startAsk({ prompt, selection, tab }) {
  const pending = {
    prompt: String(prompt || ''),
    selection: String(selection || '').slice(0, 20000),
    source: { title: (tab && tab.title) || '', url: (tab && tab.url) || '' },
    createdAt: Date.now(),
  };
  await chrome.storage.local.set({ [KEYS.pendingAsk]: pending });

  if (selection) {
    await sendToBridge('/events/ask', { selectedText: selection, url: pending.source.url });
  }

  const result = tab && tab.id ? await openPanelForTab(tab.id) : { opened: false, reason: 'no-tab' };
  broadcast({ type: 'BOB_ASK_READY', pending });
  return result;
}

// ------------------------------------------------------------------ chat ---

async function callGemini(prompt, contextText) {
  const settings = await getSettings();
  const key = (settings.geminiKey || '').trim();
  if (!key) return { ok: false, reason: 'no-key' };

  const systemInstruction = {
    parts: [
      {
        text:
          'You are Bob, a precise and warm research companion living in a Chrome side panel.\n' +
          'Answer using only the provided research context and the user question. Never invent notes, projects, statistics or sources that are not in the context.\n' +
          'If the context is insufficient, say exactly what is missing.\n' +
          'Be concise: prefer short paragraphs or tight bullet lists.\n\n' +
          `RESEARCH CONTEXT:\n${contextText || '(no page or research context supplied)'}`,
      },
    ],
  };

  let lastError = 'request-failed';
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction, contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      });

      if (res.status === 404) {
        lastError = 'model-unavailable';
        continue;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { ok: false, reason: 'bad-key', status: res.status };
      }
      if (res.status === 429) {
        return { ok: false, reason: 'rate-limited', status: 429 };
      }
      if (!res.ok) {
        lastError = `http-${res.status}`;
        continue;
      }

      const data = await res.json();
      const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
      const reply = parts.map((p) => p.text || '').join('').trim();
      if (reply) return { ok: true, reply, model };
      lastError = 'empty-response';
    } catch (err) {
      lastError = (err && err.message) || 'network-error';
    }
  }

  return { ok: false, reason: 'request-failed', detail: lastError };
}

async function buildContext({ page, includeNotes = true, maxNotes = 6 }) {
  const lines = [];
  const settings = await getSettings();
  const goal = (page && page.goal) || settings.researchFocus;
  if (goal) lines.push(`Research focus: ${goal}`);
  if (page && page.title) lines.push(`Active tab: ${page.title}`);
  if (page && page.url) lines.push(`URL: ${page.url}`);
  if (page && page.excerpt) lines.push(`\nActive page text:\n${String(page.excerpt).slice(0, 120000)}`);
  if (page && page.selection) lines.push(`\nUser selection:\n"${String(page.selection).slice(0, 20000)}"`);

  const [notes, tasks] = await Promise.all([
    includeNotes ? readList(KEYS.notes) : Promise.resolve([]),
    readList(KEYS.tasks),
  ]);

  // Pick the tabs Bob should actually read. In auto mode (the default) Bob
  // chooses the most relevant open tabs himself; a manual hand-pick overrides.
  const chosen = await chooseContextTabs(settings, goal, page);
  if (chosen.length) {
    lines.push(`\nResearch sources Bob is reading (${chosen.length}):`);
    let budget = 120000;
    for (const c of chosen) {
      // The active tab's full text is already included above as page.excerpt.
      if (page && page.excerpt && page.url && c.url === page.url) {
        lines.push(`\n### ${c.title}\n${c.url}\n(active tab — full text included above)`);
        continue;
      }
      let text = c.textSample || '';
      if (!text && c.tabId) {
        const read = await extractTabText(c.tabId);
        if (read.ok) text = read.text || '';
      }
      const clip = String(text).slice(0, Math.max(2000, budget));
      budget -= clip.length;
      lines.push(`\n### ${c.title}\n${c.url}\n${clip || '(no readable text)'}`);
      if (budget <= 0) break;
    }
  }

  if (notes.length) {
    lines.push('\nSaved notes:');
    notes.slice(0, maxNotes).forEach((n) => lines.push(`- "${n.text.slice(0, 400)}" — ${n.domain || n.sourceUrl}`));
  }
  if (tasks.length) {
    const open = tasks.filter((t) => !t.done).slice(0, 8);
    if (open.length) {
      lines.push('\nOpen tasks:');
      open.forEach((t) => lines.push(`- ${t.title}`));
    }
  }
  return lines.join('\n');
}

// Decide which tabs become primary context for a prompt.
async function chooseContextTabs(settings, goal, page) {
  const { all } = await collectAllTabs();
  const activeUrl = page && page.url;

  const manual = all.filter((t) => t.selected);
  if (settings.manualTabSelection && manual.length) return manual.slice(0, 12);

  const focusText = [goal || '', settings.researchFocus || '', (page && page.title) || ''].filter(Boolean).join(' ');
  const focus = focusKeywords(focusText);
  const scored = all
    .map((t) => ({ t, s: scoreTabRelevance(t, focus, t.textSample || '') }))
    .sort((a, b) => (b.s.score == null ? -1 : b.s.score) - (a.s.score == null ? -1 : a.s.score));

  const chosen = [];
  const push = (t, score) => {
    if (!chosen.some((c) => c.url === t.url)) chosen.push({ ...t, score });
  };

  // The tab the user is looking at is always relevant.
  const active = scored.find((x) => x.t.url === activeUrl);
  if (active) push(active.t, active.s.score);

  for (const { t, s } of scored) {
    if (chosen.length >= 6) break;
    if ((s.score == null ? 0 : s.score) < 25) continue;
    push(t, s.score);
  }

  if (!chosen.length) {
    const fallback = manual.length ? manual : all.filter((t) => t.url === activeUrl);
    return fallback.slice(0, 6);
  }
  return chosen.slice(0, 6);
}

// -------------------------------------------------------------- messaging ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((result) => sendResponse(result))
    .catch((err) => sendResponse({ ok: false, reason: 'internal-error', detail: (err && err.message) || String(err) }));
  return true; // async response
});

async function handleMessage(message, sender) {
  const type = message && message.type;

  switch (type) {
    case 'GET_ACTIVE_TAB_CONTEXT': {
      const tab = await activeTab(sender);
      if (!tab) return null;
      return { id: tab.id, title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl };
    }

    case 'GET_PAGE_TEXT': {
      const tab = await activeTab(sender);
      if (!tab || !tab.id) return { ok: false, reason: 'no-tab' };
      const result = await relayToTab(tab.id, { type: 'BOB_EXTRACT_PAGE_TEXT' });
      return result && result.ok ? result : { ok: false, reason: 'content-script-unavailable' };
    }

    case 'EXTRACT_TAB_TEXT': {
      // Deep-read a single tab in full (up to 100k chars) when asked.
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => (message.tabId ? t.id === message.tabId : t.url === message.url));
      if (!tab || !tab.id) return { ok: false, reason: 'tab-not-open' };
      if (!/^https?:/.test(tab.url || '')) return { ok: false, reason: 'unsupported-page' };
      return extractTabText(tab.id, 100000);
    }

    case 'GET_BRIDGE_STATUS':
      return { ok: true, status: await getBridgeStatus({ force: message.force }) };

    case 'GET_SETTINGS':
      return { ok: true, settings: await getSettings() };

    case 'SET_SETTINGS':
      return { ok: true, settings: await setSettings(message.patch || {}) };

    case 'GET_STATE': {
      const [status, notes, highlights, tabs, tasks, settings] = await Promise.all([
        getBridgeStatus(),
        readList(KEYS.notes),
        readList(KEYS.highlights),
        readList(KEYS.tabs),
        readList(KEYS.tasks),
        getSettings(),
      ]);
      return {
        ok: true,
        bridge: status,
        notes,
        highlights,
        tabs,
        tasks,
        settings: { ...settings, geminiKey: settings.geminiKey ? '••••' + settings.geminiKey.slice(-4) : '' },
        hasGeminiKey: Boolean((settings.geminiKey || '').trim()),
      };
    }

    case 'SAVE_NOTE':
      return saveNote(message.data || {});

    case 'DELETE_NOTE': {
      const notes = (await readList(KEYS.notes)).filter((n) => n.id !== message.id);
      await writeList(KEYS.notes, notes);
      broadcast({ type: 'BOB_NOTES_CHANGED', notes });
      return { ok: true, notes };
    }

    case 'GET_NOTES':
      return { ok: true, notes: await readList(KEYS.notes) };

    case 'SAVE_HIGHLIGHT': {
      const highlight = message.highlight;
      if (!highlight || !highlight.url) return { ok: false, reason: 'invalid' };
      const all = await readList(KEYS.highlights);
      const next = [highlight, ...all.filter((h) => h.id !== highlight.id)].slice(0, 2000);
      await writeList(KEYS.highlights, next);
      const delivery = await sendToBridge('/events/note', {
        selectedText: highlight.selectedText,
        url: highlight.url,
        title: highlight.pageTitle,
      });
      broadcast({ type: 'BOB_HIGHLIGHTS_CHANGED', url: highlight.url });
      return { ok: true, highlight, delivery };
    }

    case 'GET_HIGHLIGHTS': {
      const all = await readList(KEYS.highlights);
      const url = message.url;
      return { ok: true, highlights: url ? all.filter((h) => h.url === url) : all };
    }

    case 'DELETE_HIGHLIGHT': {
      const all = await readList(KEYS.highlights);
      const target = all.find((h) => h.id === message.id);
      await writeList(KEYS.highlights, all.filter((h) => h.id !== message.id));
      broadcast({ type: 'BOB_HIGHLIGHTS_CHANGED', url: target ? target.url : message.url });
      return { ok: true };
    }

    case 'CLEAR_PAGE_HIGHLIGHTS': {
      const all = await readList(KEYS.highlights);
      await writeList(KEYS.highlights, all.filter((h) => h.url !== message.url));
      broadcast({ type: 'BOB_HIGHLIGHTS_CHANGED', url: message.url });
      return { ok: true };
    }

    case 'SAVE_TAB':
      return saveTab(message.tab || {});

    case 'GET_TABS': {
      const tabs = await readList(KEYS.tabs);
      const openTabs = await chrome.tabs.query({});
      const known = new Set(tabs.map((t) => t.url));
      const live = openTabs
        .filter((t) => t.url && /^https?:/.test(t.url) && !known.has(t.url))
        .map((t) => ({
          id: nowId('tab'),
          tabId: t.id,
          title: t.title || t.url,
          url: t.url,
          domain: safeDomain(t.url),
          favIconUrl: t.favIconUrl || null,
          selected: false,
          live: true,
          addedAt: Date.now(),
        }));
      return { ok: true, tabs: [...tabs, ...live] };
    }

    case 'SET_TAB_SELECTED': {
      const tabs = await readList(KEYS.tabs);
      const target = tabs.find((t) => t.url === message.url);
      if (target) {
        target.selected = Boolean(message.selected);
        await writeList(KEYS.tabs, tabs);
      } else if (message.selected && message.tab) {
        await saveTab({ ...message.tab, selected: true });
        const after = await readList(KEYS.tabs);
        const saved = after.find((t) => t.url === message.url);
        if (saved) {
          saved.selected = true;
          await writeList(KEYS.tabs, after);
        }
      }
      // A hand-pick switches Bob out of auto-selection until the user re-enables it.
      await setSettings({ manualTabSelection: true });
      return { ok: true, tabs: await readList(KEYS.tabs), manualTabSelection: true };
    }

    case 'DELETE_TAB': {
      const tabs = (await readList(KEYS.tabs)).filter((t) => t.url !== message.url);
      await writeList(KEYS.tabs, tabs);
      return { ok: true, tabs };
    }

    case 'SET_ALL_TABS_SELECTED': {
      const selected = Boolean(message.selected);
      // When selecting everything, persist any live (not-yet-saved) tabs first
      // so the whole visible list can become primary context.
      if (selected && Array.isArray(message.tabs)) {
        const known = await readList(KEYS.tabs);
        const knownUrls = new Set(known.map((t) => t.url));
        for (const t of message.tabs) {
          if (t && t.url && !knownUrls.has(t.url)) {
            await saveTab({ id: t.tabId, title: t.title, url: t.url, favIconUrl: t.favIconUrl });
          }
        }
      }
      const tabs = (await readList(KEYS.tabs)).map((t) => ({ ...t, selected }));
      await writeList(KEYS.tabs, tabs);
      await setSettings({ manualTabSelection: true });
      broadcast({ type: 'BOB_TABS_CHANGED', tabs });
      return { ok: true, tabs, manualTabSelection: true };
    }

    case 'SET_AUTO_TABS': {
      // Hand control back to Bob: he re-reads every open tab and re-picks the
      // most relevant ones on the next sync.
      await setSettings({ manualTabSelection: false });
      const tabs = await autoSyncTabs({ force: true });
      return { ok: true, tabs, manualTabSelection: false };
    }

    case 'SCORE_TABS': {
      const settings = await getSettings();
      const { all } = await collectAllTabs();
      const focusText = [settings.researchFocus || '', message.pageTitle || ''].filter(Boolean).join(' ');
      const focus = focusKeywords(focusText);
      const scores = all.map((t) => {
        const s = scoreTabRelevance(t, focus, t.textSample || '');
        return { url: t.url, score: s.score, tier: s.tier, why: s.why };
      });
      return { ok: true, scores, manualTabSelection: Boolean(settings.manualTabSelection) };
    }

    case 'ADD_TASK': {
      const tasks = await readList(KEYS.tasks);
      const title = String((message.task && message.task.title) || '').trim();
      if (!title) return { ok: false, reason: 'empty' };
      const task = { id: nowId('task'), title, done: false, createdAt: Date.now() };
      await writeList(KEYS.tasks, [task, ...tasks].slice(0, 500));
      return { ok: true, tasks: [task, ...tasks] };
    }

    case 'TOGGLE_TASK': {
      const tasks = (await readList(KEYS.tasks)).map((t) => (t.id === message.id ? { ...t, done: !t.done } : t));
      await writeList(KEYS.tasks, tasks);
      return { ok: true, tasks };
    }

    case 'DELETE_TASK': {
      const tasks = (await readList(KEYS.tasks)).filter((t) => t.id !== message.id);
      await writeList(KEYS.tasks, tasks);
      return { ok: true, tasks };
    }

    case 'ASK_BOB': {
      const tab = await activeTab(sender);
      return startAsk({
        prompt: message.prompt || '',
        selection: message.selection || '',
        tab: tab || { title: message.source && message.source.title, url: message.source && message.source.url },
      });
    }

    case 'GET_PENDING_ASK': {
      const res = await getStore([KEYS.pendingAsk]);
      const pending = res[KEYS.pendingAsk] || null;
      if (pending) await chrome.storage.local.remove(KEYS.pendingAsk);
      return { ok: true, pending };
    }

    case 'CHAT': {
      const contextText = await buildContext(message.context || {});
      const prompt = String(message.prompt || '');
      const result = await callGemini(prompt, contextText);
      if (result && result.ok) {
        // Mirror the exchange into Bob Desktop so it shows in the session.
        sendToBridge('/events/chat', {
          prompt,
          reply: result.reply,
          url: (message.context && message.context.url) || '',
          title: (message.context && message.context.title) || '',
        }).catch(() => {});
      }
      return result;
    }

    case 'TEST_GEMINI_KEY': {
      const key = String(message.key || '').trim();
      if (!key) return { ok: false, reason: 'empty' };
      for (const model of GEMINI_MODELS) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: Ready' }] }] }),
          });
          if (res.ok) return { ok: true, model };
          if (res.status === 400 || res.status === 401 || res.status === 403) return { ok: false, reason: 'bad-key', status: res.status };
          if (res.status === 429) return { ok: false, reason: 'rate-limited' };
        } catch {
          /* try the next candidate model */
        }
      }
      return { ok: false, reason: 'unreachable' };
    }

    case 'HIGHLIGHT_SELECTION_IN_PAGE': {
      const tab = await activeTab(sender);
      if (!tab || !tab.id) return { ok: false, reason: 'no-tab' };
      return relayToTab(tab.id, { type: 'BOB_HIGHLIGHT_SELECTION', color: message.color || 'yellow' });
    }

    case 'AUTO_HIGHLIGHT_PAGE': {
      const tab = await activeTab(sender);
      if (!tab || !tab.id) return { ok: false, reason: 'no-tab' };
      const tabs = await readList(KEYS.tabs);
      const notes = await readList(KEYS.notes);
      const settings = await getSettings();
      const focus = [
        settings.researchFocus || '',
        message.focus || '',
        ...tabs.filter((t) => t.selected).map((t) => t.title),
        ...notes.slice(0, 5).map((n) => n.text),
      ]
        .filter(Boolean)
        .join('\n');
      return relayToTab(tab.id, { type: 'BOB_AUTO_HIGHLIGHT', focus });
    }

    case 'RESTORE_HIGHLIGHTS': {
      const tab = await activeTab(sender);
      if (!tab || !tab.id) return { ok: false, reason: 'no-tab' };
      const highlights = (await readList(KEYS.highlights)).filter((h) => h.url === tab.url);
      return relayToTab(tab.id, { type: 'BOB_RENDER_HIGHLIGHTS', highlights });
    }

    case 'OPEN_BOB_DESKTOP': {
      const status = await getBridgeStatus({ force: true });
      if (!status.connected) return { ok: false, reason: status.detail || 'desktop-not-running' };
      const res = await sendToBridge('/events/focus', { source: 'chrome-extension' });
      return res.delivered ? { ok: true } : { ok: false, reason: res.reason || 'desktop-rejected' };
    }

    case 'OPEN_SIDE_PANEL': {
      const tab = await activeTab(sender);
      return tab && tab.id ? openPanelForTab(tab.id) : { opened: false, reason: 'no-tab' };
    }

    default:
      return { ok: false, reason: 'unknown-message', type };
  }
}

async function activeTab(sender) {
  if (sender && sender.tab && sender.tab.id) return sender.tab;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab || null;
}

// Keep the desktop informed about the tab the user is actually reading.
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const settings = await getSettings();
  if (!settings.syncTabsToDesktop) return;
  const status = await getBridgeStatus();
  if (!status.connected) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !/^https?:/.test(tab.url)) return;
    await sendToBridge('/events/tab', { tabId: tab.id, title: tab.title, url: tab.url, favicon: tab.favIconUrl });
  } catch {
    /* tab closed before we could read it */
  }
});
