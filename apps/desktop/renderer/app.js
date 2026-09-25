/* global bob */
const $ = (s) => document.querySelector(s)
let state = { notes: [], sources: [], captures: [] }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const when = (t) => new Date(t).toLocaleString()
const q = () => $('#search').value.toLowerCase().trim()
const match = (...f) => !q() || f.join(' ').toLowerCase().includes(q())

function link(url) { return url ? `<a href="#" data-open="${esc(url)}">${esc(url)}</a>` : '' }

function render() {
  $('#noteList').innerHTML = state.notes.filter((n) => match(n.title, n.body)).map((n) =>
    `<li><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><div class="meta">${when(n.at)}${link(n.url)}<button data-del="notes:${n.id}">Delete</button></div></li>`).join('') || '<p class="hint">No notes yet.</p>'
  $('#sourceList').innerHTML = state.sources.filter((s) => match(s.title, s.url)).map((s) =>
    `<li><h3>${esc(s.title)}</h3><div class="meta">${link(s.url)}<button data-del="sources:${s.id}">Delete</button></div></li>`).join('') || '<p class="hint">No sources yet.</p>'
  $('#captureList').innerHTML = state.captures.filter((c) => match(c.text, c.url)).map((c) =>
    `<li><p>${esc(c.text)}</p><div class="meta">${c.kind} · ${when(c.at)}${link(c.url)}<button data-save="${c.id}">Save as note</button></div></li>`).join('') || '<p class="hint">No captures yet.</p>'
}

async function refresh() { state = await bob.get(); render() }

function ask(question) {
  const words = question.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
  const items = [
    ...state.notes.map((n) => ({ title: n.title, text: n.body, url: n.url })),
    ...state.captures.map((c) => ({ title: 'Capture', text: c.text, url: c.url })),
    ...state.sources.map((s) => ({ title: s.title, text: '', url: s.url })),
  ]
  const trusted = /\.(gov|edu|org)(\/|$)|wikipedia\.org|nature\.com|who\.int/
  const scored = items.map((it) => {
    const hay = `${it.title} ${it.text}`.toLowerCase()
    let score = words.reduce((s, w) => s + (hay.split(w).length - 1), 0)
    if (score && it.url && trusted.test(it.url)) score += 1
    return { ...it, score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5)
  $('#answer').innerHTML = scored.length
    ? '<p class="hint">Most relevant items from your saved research (offline):</p><ul>' + scored.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text.slice(0, 400))}</p><div class="meta">${link(s.url)}</div></li>`).join('') + '</ul>'
    : '<p class="hint">Nothing in your saved research matches. For a full AI answer, use "Open Bob online".</p>'
}

document.addEventListener('click', async (e) => {
  const t = e.target
  if (t.dataset.tab) {
    document.querySelectorAll('nav button, .tab').forEach((el) => el.classList.remove('active'))
    t.classList.add('active'); $('#' + t.dataset.tab).classList.add('active')
  } else if (t.dataset.open) { e.preventDefault(); window.open(t.dataset.open) }
  else if (t.dataset.del) { const [k, id] = t.dataset.del.split(':'); state = await bob.remove(k, id); render() }
  else if (t.dataset.save) {
    const c = state.captures.find((x) => x.id === t.dataset.save)
    if (c) { state = await bob.add('notes', { title: c.text.slice(0, 60) || 'Capture', body: c.text, url: c.url }); render() }
  }
})

$('#noteForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = new FormData(e.target)
  state = await bob.add('notes', { title: f.get('title'), body: f.get('body') }); e.target.reset(); render()
})
$('#sourceForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = new FormData(e.target)
  state = await bob.add('sources', { title: f.get('title'), url: f.get('url') }); e.target.reset(); render()
})
$('#askForm').addEventListener('submit', (e) => { e.preventDefault(); ask(new FormData(e.target).get('q')) })
$('#search').addEventListener('input', render)
$('#cloud').addEventListener('click', () => bob.openWeb(''))

const setStatus = () => { $('#status').textContent = navigator.onLine ? 'Online · data saved on this computer' : 'Offline · data saved on this computer' }
window.addEventListener('online', setStatus); window.addEventListener('offline', setStatus); setStatus()
bob.info().then((i) => { $('#version').textContent = 'v' + i.version })
bob.onChange(refresh)
refresh()
