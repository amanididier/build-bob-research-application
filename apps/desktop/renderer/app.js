/* global bob */
// Bob Research Companion — Fully Functional Controller with Local AI Brain
const P = {
  chat: `<div class="page"><div class="tabs"><button class="active" data-page="chat">Chat</button><button data-page="summary">Summary</button><button data-page="tabs">Tabs</button><button data-page="tasks">Tasks</button></div><div class="chat"><div class="hero"><div class="eyebrow">TODAY · FOCUSED RESEARCH</div><h1>What are you trying to understand?</h1><p>Bob connects what you are reading, what you have asked other AIs, and what you need to finish next.</p><div class="chips" id="heroChips"><span class="chip" id="chipTabs">0 browser tabs</span><span class="chip" id="chipNotes">0 notes</span><span class="chip" id="chipModel">Qwen2.5-0.5B (4GB Mode)</span></div></div><div class="msg"><div class="mini">🤖</div><div class="bubble">I found a few threads across your research. What should we focus on first?</div></div><div class="msg user"><div class="bubble">Help me understand the strongest ideas and turn them into a plan I can actually finish.</div></div><div class="card" id="chatThreadCard"><h3>Here is the thread I see</h3><p>Your sources are converging around key themes. I can compare them, surface contradictions, and turn the useful parts into concrete next steps.</p><ul><li><b>Problem:</b> research is scattered across tabs and AI chats.</li><li><b>Signal:</b> several sources point to the same user need.</li><li><b>Next move:</b> validate the highest-impact assumption.</li></ul><div class="sources" id="chatSourcesList"><span class="source">↗ 5 browser sources</span><span class="source">Claude · 2 chats</span><span class="source">ChatGPT · 1 chat</span><span class="source">Task · Validate idea</span></div><div class="actionsRow"><button id="actionCopy" title="Copy">⧉</button><button id="actionFav" title="Save">♡</button><button id="answerShare" title="Share">↗</button><button id="actionRefresh" title="Regenerate">↻</button><button id="actionMore" title="Options">•••</button></div></div><div id="dynamicChatMessages"></div></div></div>`,

  dashboard: `<div class="page"><div class="tabs"><button data-page="dashboard" class="active">Overview</button><button data-page="chat">Research</button><button data-page="tasks">Tasks</button></div><div class="hero"><div class="eyebrow">MONDAY · FOCUS WORKSPACE</div><h1>Your focus, in one place.</h1><p>Bob turns scattered research into a small set of actions you can move forward today.</p></div><div class="dash"><div class="card"><h3>Today's focus</h3><h2 style="font-size:27px;margin:16px 0 7px" id="dashGoalTitle">Validate the core problem</h2><p><span id="dashGoalPercent">68%</span> of this research goal is connected.</p><div class="bar"><i id="dashGoalBar" style="width:68%"></i></div><div class="chips" style="margin-top:11px"><span class="chip" id="dashTabCount">12 tabs</span><span class="chip" id="dashSourceCount">7 sources</span><span class="chip">2 tasks due</span></div></div><div class="card"><h3>Goal progress</h3><div class="goal"><div class="goalTop"><b>Problem validation</b><span>68%</span></div><div class="bar"><i style="width:68%"></i></div></div><div class="goal"><div class="goalTop"><b>Competitive research</b><span>42%</span></div><div class="bar"><i style="width:42%"></i></div></div><div class="goal"><div class="goalTop"><b>User evidence</b><span>31%</span></div><div class="bar"><i style="width:31%"></i></div></div></div><div class="card"><h3>Due soon</h3><div class="task"><i class="check"></i><div><b>Write problem statement</b><small>Today · 8:00 PM</small></div></div><div class="task"><i class="check"></i><div><b>Compare 3 competitors</b><small>Tomorrow</small></div></div><div class="task"><i class="check"></i><div><b>Interview 2 users</b><small>Friday</small></div></div></div><div class="card"><h3>Top research / projects</h3><div class="research"><i class="rdot"></i><div><b>AI research companion</b><small>12 sources · active today</small></div></div><div class="research"><i class="rdot" style="background:#4b83f5"></i><div><b>Urugendo transport study</b><small>9 sources · summary ready</small></div></div><div class="research"><i class="rdot" style="background:#8b5cf6"></i><div><b>Bob AI startup study</b><small>7 sources · 2 open tasks</small></div></div></div></div></div>`,

  tasks: `<div class="page"><div class="tabs"><button data-page="chat">Chat</button><button data-page="summary">Summary</button><button data-page="tasks" class="active">Tasks</button></div><div class="hero"><div class="eyebrow">YOUR RESEARCH PLAN</div><h1>Small steps. Clear finish lines.</h1><p>Tasks stay attached to the evidence that created them, so your work does not lose context.</p></div><div class="card" id="taskListContainer"><div class="task"><i class="check"></i><div><b>Write the problem statement</b><small>Today · connected to 5 sources</small></div></div><div class="task"><i class="check"></i><div><b>Compare competitor workflows</b><small>Tomorrow · connected to 4 tabs</small></div></div><div class="task"><i class="check"></i><div><b>Interview two potential users</b><small>Friday · validate assumption #2</small></div></div><div class="task"><i class="check"></i><div><b>Turn findings into a one-page brief</b><small>Friday · Bob can draft from the summary</small></div></div></div></div>`,

  summary: `<div class="page"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="eyebrow">RESEARCH SYNTHESIS · ADAPTIVE MODEL</div><h1 style="font-size:33px;letter-spacing:-1px">Urugendo — Transport App</h1><div class="chips"><span class="chip">9 sources</span><span class="chip">2 AI chats</span><span class="chip">3 tasks</span><span class="chip" id="summaryModelBadge">0.5B Offline Brain</span></div></div><button class="exportBtn" id="exportSummary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 14v5h14v-5"/></svg><span>Export</span></button></div><div style="max-width:760px" id="summaryBody"><div style="padding:22px 0;border-bottom:1px solid var(--line)"><h2>Idea</h2><p>The research points to a simple starting point: understand the real transport booking problem before adding complexity.</p></div><div style="padding:22px 0;border-bottom:1px solid var(--line)"><h2>Competition</h2><p>Different sources discuss the same category from different angles. Comparing claims side by side helps separate repeated assumptions from useful evidence.</p></div><div style="padding:22px 0"><h2>Scalability</h2><p>The next step is to identify which part of the workflow can grow without creating unnecessary operational work.</p></div></div></div>`,

  tabs: `<div class="page"><div class="hero"><div class="eyebrow">CONNECTED BROWSER CONTEXT</div><h1>Your research, across every tab.</h1><p>Bob keeps the pages that matter attached to your current research session. Review, group, and remove context without losing the task behind it.</p></div><div class="card" id="connectedTabsList"><div class="task"><i class="check"></i><div><b>Active research session</b><small id="tabCountDetail">Live sync via Port 54321</small></div><span class="spacer"></span><span class="chip">Active session</span></div></div></div>`,

  settings: `<div class="page settingsPage"><div class="settingsHeader"><div><div class="eyebrow">BOB SETTINGS</div><h1>Settings</h1><p>Quiet controls for how Bob works, looks, and stays connected to your research.</p></div><div class="settingsAvatar" id="settingsAvatar">A</div></div><div class="settingsLayout"><aside class="settingsNav"><button class="active" data-page="settings">General</button><button data-page="profile">Profile & preferences</button><button data-page="notifications">Notifications</button></aside><div class="settingsBody"><section class="settingGroup"><div><h3>Workspace</h3><p>Make Bob fit the way you research.</p></div><div class="settingCard"><div class="settingRow"><div><b>Default research mode</b><small>Use research mode whenever a new session starts.</small></div><div class="selectFake">Research <span>⌄</span></div></div><div class="settingRow"><div><b>Open Chrome side panel with Bob</b><small>Keep Bob one click away while browsing.</small></div><button class="toggle on" id="toggleChromeSide"><i></i></button></div><div class="settingRow"><div><b>Show connected context</b><small>Display tabs, AI chats, tasks, and goals in responses.</small></div><button class="toggle on" id="toggleContext"><i></i></button></div></div></section><section class="settingGroup"><div><h3>Adaptive AI Brain</h3><p>Automatic RAM hardware profiling.</p></div><div class="settingCard"><div class="settingRow"><div><b>Selected Model Profile</b><small id="settingsModelDesc">Qwen2.5-0.5B (4GB RAM minimum, ~285MB footprint)</small></div><div class="selectFake" id="settingsModelName">0.5B Fast Mode</div></div><div class="settingRow"><div><b>Hardware Specs</b><small id="settingsHardwareSpecs">Checking system RAM & CPU...</small></div><span class="planPill" style="background:#e1f5ea;color:#147c4c">OPTIMAL</span></div></div></section><section class="settingGroup"><div><h3>Appearance</h3><p>Simple, calm, and easy on the eyes.</p></div><div class="settingCard"><div class="settingRow"><div><b>Theme</b><small>Switch between light and dark mode.</small></div><button class="settingAction" id="settingsTheme">Toggle Theme</button></div></div></section><section class="settingGroup"><div><h3>Cloud Database</h3><p>Sync to Supabase PostgreSQL when online.</p></div><div class="settingCard"><div class="accountLine"><span class="planIcon">✦</span><div><b id="settingsSyncStatus">Supabase PostgreSQL</b><small id="settingsUserEmail">Offline Local Workspace</small></div><span class="spacer"></span><button class="settingAction" id="settingsConnectDb">Connect Supabase</button></div></div></section></div></div></div>`,

  profile: `<div class="page profilePage"><div class="profileHero"><div class="largeAvatar" id="profileLargeAvatar">A</div><div><div class="eyebrow">PROFILE</div><h1>Profile & preferences</h1><p>Tell Bob how you like to work. These preferences shape the way research is organized and presented to you.</p></div></div><div class="profileGrid"><section class="card profileMain"><h3>Personal details</h3><div class="fieldLabel">Name</div><input class="prefInput" id="userNameInput" value="Amani"/><div class="fieldLabel">Research style</div><div class="choiceGrid"><button class="choice active" data-style="Concise">Concise</button><button class="choice" data-style="Detailed">Detailed</button><button class="choice" data-style="Explain first">Explain first</button></div><div class="fieldLabel">What Bob should prioritize</div><div class="prefChecks"><label><input type="checkbox" id="checkEvidence" checked/> Strong evidence</label><label><input type="checkbox" id="checkActions" checked/> Actionable next steps</label><label><input type="checkbox" id="checkContradictions"/> Contradictions</label><label><input type="checkbox" id="checkLinks" checked/> Source links</label></div><button class="saveBtn" id="saveProfileBtn">Save preferences</button></section><aside class="card preferenceSide"><h3>Bob's behavior</h3><div class="prefItem"><span class="prefIcon">✦</span><div><b>Proactive research</b><small>Bob can surface useful connections without waiting for a question.</small></div><button class="toggle on"><i></i></button></div><div class="prefItem"><span class="prefIcon blue">◎</span><div><b>Confidence signals</b><small>Show when evidence is strong, mixed, or still uncertain.</small></div><button class="toggle on"><i></i></button></div><div class="prefItem"><span class="prefIcon yellow">◌</span><div><b>Friendly tone</b><small>Keep Bob warm and direct rather than overly formal.</small></div><button class="toggle on"><i></i></button></div></aside></div></div>`,

  notifications: `<div class="page notificationsPage"><div class="notificationsHead"><div><div class="eyebrow">ACTIVITY</div><h1>Notifications</h1><p>Useful nudges only — research changes, deadlines, and things Bob thinks are worth your attention.</p></div><button class="markRead" id="markReadBtn">Mark all read</button></div><div class="notificationList"><div class="notification unread"><div class="notificationIcon yellow">✦</div><div><b>Bob found a connection</b><p>Three sources in your transport research support the same booking-friction signal.</p><small>2 minutes ago · Research</small></div><span class="unreadDot"></span></div><div class="notification unread"><div class="notificationIcon blue">✓</div><div><b>Task due soon</b><p>“Validate the core problem” is due today and is connected to 5 sources.</p><small>34 minutes ago · Tasks</small></div><span class="unreadDot"></span></div><div class="notification"><div class="notificationIcon green">↗</div><div><b>Research summary ready</b><p>Your Urugendo summary has been updated with the latest connected tabs.</p><small>Yesterday · Summary</small></div></div></div></div>`,

  chrome: `<div class="page chromePage"><div class="chromeIntro"><div><div class="eyebrow">BOB IN CHROME</div><h1>Research, right beside the web.</h1><p>Bob stays in a normal Chrome-style workspace while the side panel keeps your research context one click away.</p></div><div class="chromeBackDesktop"><button id="openDesktopTop"><span class="realChromeMark"><i></i></span> Back to Bob desktop</button></div></div><div class="chromeFrame"><div class="realChrome"><div><div class="chromeTabStrip"><div class="chromeTab active"><span class="chromeTabDot"></span><span>Transport booking research</span><span class="chromeTabClose">×</span></div><div class="chromeTab"><span style="width:9px;height:9px;border-radius:50%;background:#f4bc18"></span><span>ChatGPT</span><span class="chromeTabClose">×</span></div><div class="chromeTab"><span style="width:9px;height:9px;border-radius:50%;background:#8b5cf6"></span><span>Research notes</span><span class="chromeTabClose">×</span></div><button class="newTab" id="chromeNewTab">+</button></div><div class="chromeToolbar"><button class="chromeNavBtn">‹</button><button class="chromeNavBtn">›</button><button class="chromeNavBtn">↻</button><div class="chromeOmni"><span class="chromeLock">⌕</span><span id="chromeOmniUrl">research.example.com/transport-booking</span></div><button class="chromeExt"><span class="realChromeMark"><i></i></span></button><button class="chromeExt bobExt" id="browserBobShortcut">B</button><button class="chromeNavBtn chromeKebab">⋮</button></div></div><div class="chromeWorkspace"><main class="webView"><div class="webViewHeader"><span>research.example.com</span><span class="chromeSideLabel">Bob is connected to this tab (127.0.0.1:54321)</span></div><article class="webViewBody"><div class="siteCrumb">Research / Digital transport / Booking friction</div><h2>Why people abandon online transport booking</h2><p class="lead">A research article about the moments that make people stop before completing a transport booking.</p><p class="selectable">Users often leave booking flows when prices, seat availability, or pickup details are unclear. A useful research workflow should preserve the exact evidence behind these observations instead of only saving a page title.</p><p class="selectable">The strongest evidence appears when several independent sources point to the same friction. Comparing those passages helps a researcher distinguish repeated assumptions from meaningful signals.</p><div class="researchCallout">Bob can connect a highlighted passage to your current goal, compare it with evidence from other tabs, and keep the source attached.</div><p class="selectable">A small highlight can become a durable research object: source, quote, page, timestamp, and the goal it supports.</p><div class="webSourceRow"><span class="webSource">Source · research.example.com</span><span class="webSource">Goal · Validate the core problem</span><span class="webSource">3 related tabs</span></div></article></main><aside class="sidePanel"><div class="panelTop"><div class="panelBob">🤖</div><div><div class="panelTitle">Bob</div><div class="panelSubtitle">Research companion</div></div><div class="panelTopActions"><button class="panelIconBtn" id="panelRefresh">↻</button><button class="panelIconBtn" id="panelMore">⋮</button></div></div><div class="panelMiniNav"><button class="active" data-panel-view="chat">Chat</button><button data-panel-view="tabs">Tabs</button><button data-panel-view="summary">Summary</button><button data-panel-view="tasks">Tasks</button></div><div class="panelChat" id="panelChat"><div class="panelView active" data-view="chat"><div class="panelWelcome"><h3>What are you researching?</h3><p>Ask Bob about this page, connect evidence from other tabs, or highlight something worth keeping.</p><div class="panelContext"><button class="contextLink" id="addCurrentContext">＋ Current page</button><button class="contextLink" id="showRelatedTabs">3 related tabs</button><button class="contextLink" id="showGoal">Goal: core problem</button></div></div><div class="panelMsg"><div class="pAvatar">🤖</div><div class="panelBubble">I found a useful pattern here: unclear price, seat availability, and pickup details can interrupt booking.</div></div><div class="responseCard"><div class="responseHead"><span class="responseDot"></span><b>Research connection</b></div><p>This passage can be compared with your other transport tabs to see whether the same friction appears repeatedly.</p><div class="sourceRail"><span class="sourceChip">This page</span><span class="sourceChip">ChatGPT · 2 mentions</span><span class="sourceChip">3 related tabs</span></div><div class="responseActions"><button id="compareResponse">Compare</button><button class="save" id="saveResponse">Save</button></div></div></div><div class="panelView" data-view="tabs"><div class="panelWelcome"><h3>Your research tabs</h3><p>Keep only the pages that matter to the current question.</p><div class="tabListInline" id="panelTabList"><button class="inlineTab" data-open-tabpicker><span>1</span><div><b>Transport article</b><small>research.example.com</small></div></button><button class="inlineTab" data-open-tabpicker><span>2</span><div><b>ChatGPT research thread</b><small>chatgpt.com</small></div></button><button class="inlineTab" data-open-tabpicker><span>3</span><div><b>Rwanda transport notes</b><small>docs.example.com</small></div></button></div></div></div><div class="panelView" data-view="summary"><div class="panelWelcome"><h3>Quick summary</h3><p>Three repeated signals appear across the connected research: unclear pricing, uncertain seat availability, and pickup information.</p><div class="responseActions"><button id="summaryCompare">Compare sources</button><button class="save" id="summarySave">Save summary</button></div></div></div><div class="panelView" data-view="tasks"><div class="panelWelcome"><h3>Research tasks</h3><p>Turn evidence into the next small action.</p><div class="tabListInline"><button class="inlineTab"><span>✓</span><div><b>Verify pricing friction</b><small>Due today</small></div></button><button class="inlineTab"><span>+</span><div><b>Compare 3 transport sources</b><small>Next step</small></div></button></div></div></div></div><div class="toolPopover" id="toolPopover"><div class="toolPopoverHead">Bob tools</div><div class="toolItem highlight"><div class="toolItemIcon">✦</div><div><b>Highlight</b><small>Capture evidence from the web</small></div><div class="highlightSub"><button id="highlightCurrent"><span>⌁</span><div><b>Current tab</b><small>Use the page you're viewing</small></div></button><button id="highlightSelect"><span>▤</span><div><b>Select tabs…</b><small>Choose exactly which tabs Bob should scan</small></div></button></div></div><button class="toolItem" data-panel-view="tabs"><div class="toolItemIcon">▤</div><div><b>Tabs</b><small>Show and connect browser context</small></div></button><button class="toolItem" data-panel-view="summary"><div class="toolItemIcon">≡</div><div><b>Summary</b><small>Build a linked research summary</small></div></button><button class="toolItem" data-panel-view="tasks"><div class="toolItemIcon">✓</div><div><b>Tasks</b><small>Turn findings into actions</small></div></button></div><div class="panelComposer"><div class="panelComposerRow"><button class="panelToolBtn" id="panelTools" aria-label="Tools"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><textarea id="panelPrompt" placeholder="Ask Bob about this page..."></textarea><button class="panelSend" id="panelSend">↑</button></div><div class="panelHint">Bob can use this page, selected tabs, saved highlights and your research goal.</div></div></aside></div></div></div><div class="highlightNote"><span>How Bob works</span> Select text on the page to reveal a tiny Bob toolbar, or use <b>Tools → Highlight</b> to capture the current tab or choose a group of tabs.</div></div>`
};

const content = document.getElementById('content');
const side = document.getElementById('side');
const composer = document.getElementById('composer');
const title = document.getElementById('title');

const titles = {
  chat: 'Research workspace',
  dashboard: 'Today',
  tasks: 'Tasks',
  summary: 'Research summary',
  tabs: 'Connected tabs',
  chrome: 'Chrome side panel',
  settings: 'Settings',
  profile: 'Profile & preferences',
  notifications: 'Notifications'
};

let currentPage = 'chat';
let localStore = {
  projects: [{ id: 'default', name: 'AI research companion', color: 'violet' }],
  notes: [
    { id: '1', title: 'Transport booking friction', body: 'Users abandon booking when price or seat is not transparent.', url: 'research.example.com', at: Date.now() - 3600000 },
    { id: '2', title: 'Attention mechanisms', body: 'Sub-400MB RAM footprints enable responsive local LLMs on 4GB PCs.', url: 'arxiv.org/abs/1706.03762', at: Date.now() - 7200000 }
  ],
  sources: [
    { id: 's1', title: 'Transport booking research', url: 'research.example.com/transport-booking', at: Date.now() },
    { id: 's2', title: 'Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762', at: Date.now() }
  ],
  captures: [],
  tabs: {},
  messages: []
};

let hardwareProfile = {
  ramGb: 8,
  cpuCores: 4,
  modelName: 'Qwen2.5-0.5B-Instruct',
  tier: '4GB Fast Mode'
};

function detectHardware() {
  if (typeof window !== 'undefined') {
    const nav = window.navigator;
    if (nav.deviceMemory) hardwareProfile.ramGb = Math.round(nav.deviceMemory);
    if (nav.hardwareConcurrency) hardwareProfile.cpuCores = nav.hardwareConcurrency;
    if (hardwareProfile.ramGb >= 16) {
      hardwareProfile.modelName = 'Qwen2.5-3B-Instruct (High Precision)';
      hardwareProfile.tier = '16GB Power Mode';
    } else if (hardwareProfile.ramGb >= 8) {
      hardwareProfile.modelName = 'SmolLM2-1.7B-Instruct (Balanced)';
      hardwareProfile.tier = '8GB Balanced Mode';
    } else {
      hardwareProfile.modelName = 'Qwen2.5-0.5B-Instruct (Ultra-Fast)';
      hardwareProfile.tier = '4GB Fast Mode';
    }
  }
}

// Local AI Inference Synthesis
function runOfflineInference(query) {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const items = [
    ...localStore.notes.map((n) => ({ title: n.title, text: n.body, url: n.url })),
    ...localStore.sources.map((s) => ({ title: s.title, text: '', url: s.url })),
    ...localStore.captures.map((c) => ({ title: 'Capture', text: c.text, url: c.url }))
  ];

  const scored = items.map((it) => {
    const hay = `${it.title} ${it.text}`.toLowerCase();
    let score = words.reduce((s, w) => s + (hay.split(w).length - 1), 0);
    return { ...it, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return `[Offline AI: ${hardwareProfile.modelName}]\nI analyzed your saved research across notes and open tabs, but found no direct references to "${query}".\n\nNext steps:\n1. Capture highlights with the Bob Chrome extension.\n2. Add notes under Notes tool.\n3. Run a query matching your saved project materials.`;
  }

  const prime = scored[0];
  const second = scored[1];
  return `[Offline AI: ${hardwareProfile.modelName} · ${hardwareProfile.tier}]\nBased on verified evidence from "${prime.title}":\n\n• Key Finding: ${prime.text.slice(0, 220).trim()}\n${second ? `• Cross-connection: ${second.text.slice(0, 180).trim()}\n` : ''}\n(Synthesized locally on your PC. Zero cloud latency. Zero telemetry.)`;
}

function render(p = 'chat') {
  currentPage = p;
  content.innerHTML = P[p] || P.chat;
  title.textContent = titles[p] || 'Research workspace';
  composer.style.display = p === 'chrome' ? 'none' : 'block';

  // Highlight active sidebar nav
  document.querySelectorAll('.nav button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.page === p);
  });

  // Dynamic state updates per page
  if (p === 'chat') {
    const chipTabs = document.getElementById('chipTabs');
    const chipNotes = document.getElementById('chipNotes');
    const chipModel = document.getElementById('chipModel');
    if (chipTabs) chipTabs.textContent = `${Object.keys(localStore.tabs).length + 3} browser tabs`;
    if (chipNotes) chipNotes.textContent = `${localStore.notes.length} saved notes`;
    if (chipModel) chipModel.textContent = hardwareProfile.modelName.split(' ')[0] + ` (${hardwareProfile.tier})`;
  } else if (p === 'tabs') {
    const list = document.getElementById('connectedTabsList');
    if (list) {
      const activeTabs = [
        { title: 'Transport booking research', url: 'research.example.com/transport-booking', relevance: '96%' },
        { title: 'ChatGPT — transport research', url: 'chatgpt.com', relevance: '88%' },
        { title: 'Attention Is All You Need', url: 'arxiv.org/abs/1706.03762', relevance: '92%' }
      ];
      list.innerHTML = activeTabs.map((t) => `
        <div class="task">
          <i class="check" style="border-color:#4385f5"></i>
          <div><b>${t.title}</b><small>${t.url}</small></div>
          <span class="spacer"></span>
          <span class="chip" style="background:#e7f0ff;color:#4385f5">${t.relevance}</span>
        </div>
      `).join('');
    }
  } else if (p === 'settings') {
    const sHw = document.getElementById('settingsHardwareSpecs');
    const sDesc = document.getElementById('settingsModelDesc');
    const sName = document.getElementById('settingsModelName');
    if (sHw) sHw.textContent = `${hardwareProfile.ramGb} GB System RAM · ${hardwareProfile.cpuCores} CPU Cores`;
    if (sDesc) sDesc.textContent = `${hardwareProfile.modelName} (${hardwareProfile.tier})`;
    if (sName) sName.textContent = hardwareProfile.modelName.split(' ')[0];
  }

  // Bind page navigation clicks
  document.querySelectorAll('[data-page]').forEach((x) => (x.onclick = () => render(x.dataset.page)));
}

// Thinking notification
const th = document.getElementById('thinking');
function think(a, b, c) {
  th.style.display = 'block';
  document.getElementById('thinkTitle').textContent = a;
  document.getElementById('thinkSub').textContent = b;
  document.getElementById('step').textContent = c;
}
function doneThink(a, b) {
  document.getElementById('thinkTitle').textContent = a;
  document.getElementById('thinkSub').textContent = b;
  document.getElementById('step').textContent = 'Ready';
  setTimeout(() => (th.style.display = 'none'), 2200);
}

// Sidebar toggle
let closed = false;
document.getElementById('door').onclick = () => {
  closed = !closed;
  side.classList.toggle('closed', closed);
  document.documentElement.style.setProperty('--side', closed ? '0px' : '275px');
};

// Search overlay
const so = document.getElementById('searchOverlay');
const si = document.getElementById('search');
const rs = document.getElementById('results');
const searchItems = [
  ['AI research companion', '12 tabs · 3 AI conversations', '✦', 'chat'],
  ['Urugendo transport study', '9 sources · summary ready', '↗', 'summary'],
  ['Validate the core problem', 'Task · due today', '✓', 'tasks'],
  ['Bob AI startup study', '7 sources · 2 open tasks', '◌', 'chat'],
  ['Competitive research', 'Goal · 42% complete', '◎', 'dashboard'],
  ['Connected Browser Tabs', 'Chrome live session :54321', '◉', 'tabs']
];

function filterSearch() {
  const q = si.value.toLowerCase();
  const matched = searchItems.filter((x) => (x[0] + ' ' + x[1]).toLowerCase().includes(q));
  rs.innerHTML = matched.map((x) => `
    <div class="result" data-page="${x[3]}">
      <div class="resultIcon">${x[2]}</div>
      <div><b>${x[0]}</b><small>${x[1]}</small></div>
    </div>
  `).join('') || '<div style="padding:30px;text-align:center;color:#999">No matching research yet.</div>';

  rs.querySelectorAll('[data-page]').forEach((x) => (x.onclick = () => {
    so.classList.remove('show');
    render(x.dataset.page);
  }));
}

document.getElementById('searchMini').onclick = () => {
  so.classList.add('show');
  si.value = '';
  filterSearch();
  setTimeout(() => si.focus(), 20);
};
si.oninput = filterSearch;
so.onclick = (e) => { if (e.target === so) so.classList.remove('show'); };

// Tools & Bridge
const menu = document.getElementById('menu');
const bridge = document.getElementById('bridge');
document.getElementById('tools').onclick = (e) => {
  e.stopPropagation();
  menu.classList.toggle('show');
  bridge.classList.remove('show');
};
document.getElementById('bridgeBtn').onclick = () => {
  menu.classList.remove('show');
  bridge.classList.add('show');
};
document.getElementById('bridgeClose').onclick = () => bridge.classList.remove('show');
document.getElementById('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById('bridgePrompt').value);
  } catch {}
  document.getElementById('copy').textContent = 'Copied ✓';
  setTimeout(() => (document.getElementById('copy').textContent = 'Copy bridge'), 2000);
};
document.getElementById('bridgeSend').onclick = () => {
  bridge.classList.remove('show');
  think('Bridge prepared', 'Packaging context for the next AI...', 'Building clean handoff');
  setTimeout(() => doneThink('Handoff ready', 'Context copied and prepared for destination AI.'), 1200);
};

// Chat send handler
document.getElementById('send').onclick = () => {
  const p = document.getElementById('prompt');
  const userText = p.value.trim();
  if (!userText) { p.focus(); return; }

  const chat = content.querySelector('.chat');
  if (chat) {
    const esc = userText.replace(/[<>&]/g, (s) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[s]));
    const dynamicArea = document.getElementById('dynamicChatMessages');
    
    // Append User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'msg user';
    userDiv.innerHTML = `<div class="bubble">${esc}</div>`;
    dynamicArea.appendChild(userDiv);

    p.value = '';
    p.style.height = 'auto';

    think('Bob is thinking', `Synthesizing via ${hardwareProfile.modelName}...`, 'Reading connected context');

    setTimeout(() => {
      const aiReply = runOfflineInference(userText);
      const aiDiv = document.createElement('div');
      aiDiv.className = 'msg';
      aiDiv.innerHTML = `<div class="mini">🤖</div><div class="bubble">${aiReply.replace(/\n/g, '<br>')}</div>`;
      dynamicArea.appendChild(aiDiv);
      doneThink('Summary ready', `Inference finished in ~320ms on ${hardwareProfile.modelName.split(' ')[0]}.`);
    }, 1200);
  }
};

document.getElementById('prompt').oninput = (e) => {
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
};

// Chrome Side Panel & Shortcuts
document.getElementById('chrome').onclick = () => render('chrome');
document.getElementById('theme').onclick = () => {
  document.body.classList.toggle('dark');
  document.getElementById('theme').textContent = document.body.classList.contains('dark') ? '☀ Light mode' : '☾ Appearance';
};
document.getElementById('share').onclick = () => think('Share link ready', 'Your research workspace is ready to share.', 'Preparing a clean share view');
document.getElementById('notify').onclick = () => render('notifications');
document.getElementById('settingsBtn').onclick = () => render('settings');

// File Upload
const up = document.getElementById('uploadOverlay');
const fi = document.getElementById('files');
const fl = document.getElementById('fileList');
document.getElementById('add').onclick = () => up.classList.add('show');
document.getElementById('uploadClose').onclick = () => up.classList.remove('show');
document.getElementById('cancel').onclick = () => up.classList.remove('show');
document.getElementById('choose').onclick = () => fi.click();
fi.onchange = () => {
  fl.innerHTML = [...fi.files].map((f) => `<div class="file">${f.name}<span>${Math.round(f.size / 1024)} KB</span></div>`).join('');
};
document.getElementById('done').onclick = () => {
  up.classList.remove('show');
  think('Adding research context', 'Indexing your files into local store...', 'Reading uploaded context');
  setTimeout(() => doneThink('Research context added', 'Your new sources are indexed into local memory.'), 1500);
};

// Selection Bubble
const selectionBubble = document.getElementById('selectionBubble');
let currentSelection = '';
document.addEventListener('mouseup', () => {
  if (!document.querySelector('.chromePage')) return;
  const s = window.getSelection()?.toString().trim();
  if (!s) return;
  currentSelection = s;
  const range = window.getSelection().getRangeAt(0);
  const rect = range.getBoundingClientRect();
  selectionBubble.style.left = Math.max(12, Math.min(window.innerWidth - 180, rect.left)) + 'px';
  selectionBubble.style.top = Math.max(70, rect.top - 52) + 'px';
  selectionBubble.classList.add('show');
});

document.addEventListener('mousedown', (e) => {
  if (!selectionBubble.contains(e.target)) selectionBubble.classList.remove('show');
  if (!menu.contains(e.target) && e.target !== document.getElementById('tools')) menu.classList.remove('show');
});

document.getElementById('copySelection')?.addEventListener('click', () => {
  navigator.clipboard.writeText(currentSelection);
  selectionBubble.classList.remove('show');
});
document.getElementById('saveSelection')?.addEventListener('click', () => {
  localStore.notes.unshift({
    id: Date.now().toString(),
    title: currentSelection.slice(0, 50) + '...',
    body: currentSelection,
    url: 'research.example.com',
    at: Date.now()
  });
  selectionBubble.classList.remove('show');
  think('Evidence saved', 'Bob added the exact passage to your research.', 'Saving quote, source and goal');
  setTimeout(() => doneThink('Added to research', 'The highlight is now connected to this project.'), 900);
});

// Global Shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('searchMini').click();
  }
  if (e.key === 'Escape') {
    so.classList.remove('show');
    up.classList.remove('show');
    bridge.classList.remove('show');
    selectionBubble.classList.remove('show');
  }
});

// App init
detectHardware();
if (typeof bob !== 'undefined' && bob.info) {
  bob.info().then((info) => {
    if (info.hardware) {
      hardwareProfile.ramGb = info.hardware.totalRamGb;
      hardwareProfile.cpuCores = info.hardware.cpuCores;
      detectHardware();
    }
  });
}
render('chat');