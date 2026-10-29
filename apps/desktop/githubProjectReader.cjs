'use strict'

const API_ROOT = 'https://api.github.com'
const MAX_TREE_FILES = 1200
const MAX_FILE_BYTES = 256 * 1024
const MAX_SEARCH_FILES = 35
const MAX_MATCHES = 40
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.mdx', '.txt',
  '.css', '.scss', '.html', '.htm', '.yml', '.yaml', '.toml', '.xml', '.svg',
  '.py', '.go', '.rs', '.java', '.kt', '.cs', '.php', '.rb', '.sh', '.sql',
  '.prisma', '.graphql', '.gql', '.vue', '.svelte', '.astro', '.env.example',
])
const IGNORED_DIRS = new Set([
  '.git', '.next', '.nuxt', '.output', '.turbo', '.vercel', 'node_modules',
  'dist', 'build', 'coverage', 'vendor', 'target', '__pycache__', '.venv',
  'venv', 'out', 'release', 'playwright-report', 'test-results',
])
const IGNORED_FILES = new Set([
  '.env', '.env.local', '.env.development', '.env.production', '.npmrc',
  '.pypirc', 'id_rsa', 'id_ed25519', 'credentials.json', 'secrets.json',
  'service-account.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
])

function parseRepositoryUrl(value) {
  let url
  try { url = new URL(String(value || '').trim()) } catch { throw new Error('Enter a valid GitHub repository URL.') }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') {
    throw new Error('Only https://github.com/owner/repository URLs are supported.')
  }
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length !== 2 || parts.some(part => part === '.' || part === '..')) {
    throw new Error('Use a repository URL like https://github.com/owner/repository.')
  }
  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/i, '')
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repo)) {
    throw new Error('That repository URL contains an invalid owner or repository name.')
  }
  return { owner, repo, fullName: owner + '/' + repo }
}

function isIgnored(pathname) {
  const segments = pathname.split('/')
  const name = segments[segments.length - 1].toLowerCase()
  if (segments.some(segment => IGNORED_DIRS.has(segment.toLowerCase()))) return true
  if (IGNORED_FILES.has(name)) return true
  if (/(?:^|[._-])(secret|secrets|credential|credentials|private[-_.]?key)(?:[._-]|$)/i.test(name)) return true
  if (/service[-_.]?account/i.test(name)) return true
  if (name === '.env' || /^\.env\.(?!example$|sample$|template$)/i.test(name)) return true
  return false
}

function isReadableTextPath(pathname) {
  if (isIgnored(pathname)) return false
  const name = pathname.split('/').pop().toLowerCase()
  if (name === 'dockerfile' || name === 'makefile' || name === 'gemfile' || name === 'procfile') return true
  const dot = name.lastIndexOf('.')
  return dot >= 0 && TEXT_EXTENSIONS.has(name.slice(dot))
}

async function githubRequest(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Bob-ReadOnly-Project-Companion',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    signal: AbortSignal.timeout(12000),
  })
  if (response.status === 404) throw new Error('Repository or file not found, or the connected GitHub account cannot access it.')
  if (response.status === 401 || response.status === 403) {
    if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') throw new Error('GitHub API rate limit reached. Connect a read-only GitHub token or try again later.')
    throw new Error('GitHub denied access. Check the repository visibility and read-only token permissions.')
  }
  if (!response.ok) throw new Error('GitHub request failed with status ' + response.status + '.')
  return response.json()
}

async function getRepo(repoRef, token) {
  const { owner, repo } = parseRepositoryUrl(repoRef.url || ('https://github.com/' + repoRef.owner + '/' + repoRef.repo))
  const info = await githubRequest(API_ROOT + '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo), token)
  const branch = String(repoRef.branch || info.default_branch || 'main')
  return { owner, repo, fullName: owner + '/' + repo, branch, private: Boolean(info.private), description: String(info.description || '').slice(0, 500), htmlUrl: info.html_url }
}

async function listProjectFiles(repoRef, token, relativePath = '') {
  const repo = await getRepo(repoRef, token)
  const branch = encodeURIComponent(repo.branch)
  const tree = await githubRequest(API_ROOT + '/repos/' + encodeURIComponent(repo.owner) + '/' + encodeURIComponent(repo.repo) + '/git/trees/' + branch + '?recursive=1', token)
  const items = Array.isArray(tree.tree) ? tree.tree : []
  const files = items
    .filter(item => item.type === 'blob' && typeof item.path === 'string' && isReadableTextPath(item.path))
    .filter(item => !relativePath || item.path.startsWith(relativePath.replace(/^\/+|\/+$/g, '') + '/'))
    .filter(item => Number(item.size || 0) <= MAX_FILE_BYTES)
    .slice(0, MAX_TREE_FILES)
    .map(item => ({
      path: item.path,
      sizeBytes: Number(item.size) || 0,
      sha: item.sha,
      extension: item.path.includes('.') ? '.' + item.path.split('.').pop().toLowerCase() : '',
    }))
  return { ...repo, files, count: files.length, truncated: items.length > MAX_TREE_FILES || Boolean(tree.truncated), readOnly: true }
}

async function readProjectFileFromRepo(repo, token, relativePath, options = {}) {
  if (typeof relativePath !== 'string' || !relativePath.trim() || relativePath.startsWith('/') || relativePath.includes('..') || relativePath.includes('\\')) {
    throw new Error('Use a valid repository-relative file path.')
  }
  if (!isReadableTextPath(relativePath)) throw new Error('This file is excluded from GitHub project reading.')
  const data = await githubRequest(API_ROOT + '/repos/' + encodeURIComponent(repo.owner) + '/' + encodeURIComponent(repo.repo) + '/contents/' + relativePath.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(repo.branch), token)
  if (!data || data.type !== 'file' || typeof data.content !== 'string') throw new Error('GitHub did not return a readable text file.')
  if (Number(data.size || 0) > MAX_FILE_BYTES) throw new Error('This file exceeds the 256 KB safe reading limit.')
  const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
  if (content.includes('\u0000')) throw new Error('This file appears to be binary and cannot be read as text.')
  const lines = content.split(/\r?\n/)
  const startLine = Math.max(1, Number.isInteger(options.startLine) ? options.startLine : 1)
  const endLine = Math.min(lines.length, startLine + 199, Number.isInteger(options.endLine) ? Math.max(startLine, options.endLine) : startLine + 119)
  return {
    path: relativePath,
    content: lines.slice(startLine - 1, endLine).map((line, index) => String(startLine + index) + ': ' + line).join('\n').slice(0, 48000),
    totalLines: lines.length,
    startLine,
    endLine,
    truncated: endLine < lines.length,
    readOnly: true,
    repository: repo.fullName,
    branch: repo.branch,
    htmlUrl: data.html_url,
  }
}

async function readProjectFile(repoRef, token, relativePath, options = {}) {
  const repo = await getRepo(repoRef, token)
  return readProjectFileFromRepo(repo, token, relativePath, options)
}

async function searchProjectFiles(repoRef, token, query) {
  const term = String(query || '').trim()
  if (term.length < 2) throw new Error('Enter at least two characters to search the GitHub project.')
  const listing = await listProjectFiles(repoRef, token)
  const matches = []
  let scannedFiles = 0
  const needle = term.toLowerCase()
  const filesToScan = listing.files.slice(0, MAX_SEARCH_FILES)
  for (const file of filesToScan) {
    if (matches.length >= MAX_MATCHES) break
    if (file.sizeBytes > MAX_FILE_BYTES) continue
    try {
      const read = await readProjectFileFromRepo(listing, token, file.path, { startLine: 1, endLine: 200 })
      scannedFiles += 1
      const lines = read.content.split('\n')
      for (const line of lines) {
        const colon = line.indexOf(': ')
        const lineNumber = Number(line.slice(0, colon))
        const text = line.slice(colon + 2)
        if (text.toLowerCase().includes(needle)) {
          matches.push({ path: file.path, line: lineNumber, excerpt: text.slice(0, 280) })
          if (matches.length >= MAX_MATCHES) break
        }
      }
    } catch {}
  }
  return { query: term, matches, count: matches.length, scannedFiles, truncated: listing.files.length > MAX_SEARCH_FILES || matches.length >= MAX_MATCHES, repository: listing.fullName, branch: listing.branch, readOnly: true }
}

module.exports = { parseRepositoryUrl, listProjectFiles, readProjectFile, searchProjectFiles, isReadableTextPath }
