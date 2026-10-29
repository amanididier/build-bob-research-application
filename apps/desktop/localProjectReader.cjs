'use strict'

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_LIMITS = Object.freeze({
  maxFileBytes: 256 * 1024,
  maxReadLines: 200,
  maxSearchFiles: 250,
  maxSearchBytes: 3 * 1024 * 1024,
  maxResults: 40,
  maxListFiles: 200,
  maxDepth: 5,
})

const IGNORED_DIRECTORIES = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', 'coverage',
  '.venv', 'venv', 'vendor', 'target', 'out', '.turbo', '.cache',
  '.parcel-cache', '.vite', '.idea', '.vscode', '__pycache__',
  'bower_components', 'Pods', '.gradle', '.expo',
])

const IGNORED_FILE_NAMES = new Set([
  '.env', '.env.local', '.env.development', '.env.production',
  '.env.test', '.npmrc', '.pypirc', 'id_rsa', 'id_ed25519',
  'credentials', 'secrets.json', 'service-account.json',
])

const IGNORED_EXTENSIONS = new Set([
  '.pem', '.key', '.p12', '.pfx', '.keystore', '.jks',
  '.der', '.crt', '.cer', '.dll', '.exe', '.so', '.dylib',
  '.bin', '.db', '.sqlite', '.sqlite3', '.zip', '.7z', '.rar',
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
  '.mp3', '.mp4', '.mov', '.wav', '.woff', '.woff2', '.ttf',
  '.otf', '.class', '.jar', '.pyc', '.wasm',
])

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md',
  '.mdx', '.txt', '.html', '.css', '.scss', '.sass', '.less',
  '.yaml', '.yml', '.toml', '.xml', '.svg', '.sql', '.prisma',
  '.py', '.ipynb', '.java', '.kt', '.go', '.rs', '.c', '.h',
  '.cpp', '.hpp', '.cs', '.php', '.rb', '.sh', '.ps1', '.bat',
  '.dockerfile', '.graphql', '.gql', '.vue', '.svelte', '.astro',
  '.ini', '.conf', '.example', '.sample', '.gitignore', '.editorconfig',
])

function isIgnoredRelativePath(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.some((part) => IGNORED_DIRECTORIES.has(part.toLowerCase()))) return true
  const name = (parts[parts.length - 1] || '').toLowerCase()
  if (IGNORED_FILE_NAMES.has(name)) return true
  if (/^\.env(?:\..+)?$/.test(name) && !/^\.env\.(example|sample|template)$/.test(name)) return true
  const extension = path.extname(name)
  if (IGNORED_EXTENSIONS.has(extension)) return true
  return false
}

function isLikelyTextFile(filePath) {
  const base = path.basename(filePath).toLowerCase()
  if (base === 'dockerfile' || base === 'makefile' || base === '.gitignore' || base === '.editorconfig') return true
  if (base.startsWith('.env.') && /\.(example|sample|template)$/.test(base)) return true
  return TEXT_EXTENSIONS.has(path.extname(base))
}

function getRootPath(rootPath) {
  if (typeof rootPath !== 'string' || !rootPath.trim()) throw new Error('No local project folder is connected. Choose a folder in Settings first.')
  const realRoot = fs.realpathSync(rootPath)
  const stat = fs.statSync(realRoot)
  if (!stat.isDirectory()) throw new Error('The connected project path is not a directory.')
  return realRoot
}

function resolveSafePath(rootPath, relativePath, options = {}) {
  const allowRoot = options.allowRoot === true
  const root = getRootPath(rootPath)
  if (typeof relativePath !== 'string' || relativePath.length > 1000) throw new Error('Invalid project-relative path.')
  const normalized = relativePath.replace(/\\/g, '/')
  if (path.isAbsolute(relativePath) || /^[a-zA-Z]:/.test(relativePath) || normalized.startsWith('//')) {
    throw new Error('Only project-relative paths are allowed.')
  }
  const segments = normalized.split('/').filter(Boolean)
  if (segments.some((part) => part === '.' || part === '..' || part.includes('\0'))) {
    throw new Error('Path traversal is not allowed.')
  }
  if (!segments.length && !allowRoot) throw new Error('A project-relative file path is required.')
  if (segments.some((part) => IGNORED_DIRECTORIES.has(part.toLowerCase()))) {
    throw new Error('That path is excluded from project reading.')
  }

  let current = root
  for (const segment of segments) {
    current = path.join(current, segment)
    const stat = fs.lstatSync(current)
    if (stat.isSymbolicLink()) throw new Error('Symbolic links are not followed by Bob.')
  }
  const resolved = path.resolve(current)
  const relative = path.relative(root, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('The requested path is outside the connected project.')
  return { root, absolutePath: resolved, relativePath: relative.split(path.sep).join('/') }
}

function listProjectFiles(rootPath, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options }
  const root = getRootPath(rootPath)
  const startPath = options.relativePath
    ? resolveSafePath(root, options.relativePath, { allowRoot: true }).absolutePath
    : root
  if (!fs.statSync(startPath).isDirectory()) throw new Error('The requested project path is not a directory.')

  const results = []
  const walk = (directory, relativeDirectory, depth) => {
    if (depth > limits.maxDepth || results.length >= limits.maxListFiles) return
    let entries
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      return
    }
    for (const entry of entries) {
      if (results.length >= limits.maxListFiles) break
      const relative = [relativeDirectory, entry.name].filter(Boolean).join('/')
      if (isIgnoredRelativePath(relative)) continue
      const absolute = path.join(directory, entry.name)
      let stat
      try { stat = fs.lstatSync(absolute) } catch { continue }
      if (stat.isSymbolicLink()) continue
      if (stat.isDirectory()) {
        walk(absolute, relative, depth + 1)
      } else if (stat.isFile() && isLikelyTextFile(absolute) && stat.size <= limits.maxFileBytes) {
        results.push({
          path: relative.replace(/\\/g, '/'),
          sizeBytes: stat.size,
          extension: path.extname(entry.name).toLowerCase() || (entry.name.startsWith('.') ? 'dotfile' : ''),
          modifiedAt: stat.mtime.toISOString(),
        })
      }
    }
  }
  walk(startPath, options.relativePath || '', 0)
  return { rootName: path.basename(root), files: results, count: results.length, truncated: results.length >= limits.maxListFiles }
}

function readProjectFile(rootPath, relativePath, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options }
  const resolved = resolveSafePath(rootPath, relativePath)
  if (isIgnoredRelativePath(resolved.relativePath)) throw new Error('This file is excluded from project reading.')
  if (!isLikelyTextFile(resolved.absolutePath)) throw new Error('Bob only reads supported text and source files in this phase.')
  const stat = fs.statSync(resolved.absolutePath)
  if (!stat.isFile()) throw new Error('The requested path is not a file.')
  if (stat.size > limits.maxFileBytes) throw new Error('This file is too large for safe reading (limit: 256 KB).')
  const content = fs.readFileSync(resolved.absolutePath, 'utf8')
  if (content.includes('\0')) throw new Error('This file appears to be binary and cannot be read as text.')
  const lines = content.split(/\r?\n/)
  const startLine = Math.max(1, Number.isInteger(options.startLine) ? options.startLine : 1)
  const requestedEnd = Number.isInteger(options.endLine) ? options.endLine : startLine + limits.maxReadLines - 1
  const endLine = Math.min(lines.length, requestedEnd, startLine + limits.maxReadLines - 1)
  const selected = lines.slice(startLine - 1, Math.max(startLine - 1, endLine))
  const numberedContent = selected.map((line, index) => String(startLine + index) + ': ' + line).join('\n').slice(0, 48 * 1024)
  return {
    path: resolved.relativePath,
    totalLines: lines.length,
    startLine,
    endLine: Math.min(endLine, startLine + selected.length - 1),
    truncated: endLine < lines.length || selected.length < Math.max(0, requestedEnd - startLine + 1),
    content: numberedContent,
    modifiedAt: stat.mtime.toISOString(),
    readOnly: true,
  }
}

function searchProjectFiles(rootPath, query, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options }
  const needle = typeof query === 'string' ? query.trim().slice(0, 120) : ''
  if (needle.length < 2) throw new Error('Enter at least two characters to search the project.')
  const terms = needle.toLowerCase().split(/\s+/).filter(Boolean)
  const inventory = listProjectFiles(rootPath, { ...limits, maxListFiles: Math.min(limits.maxListFiles, limits.maxSearchFiles) })
  const matches = []
  let scannedBytes = 0
  let scannedFiles = 0
  for (const file of inventory.files) {
    if (matches.length >= limits.maxResults || scannedFiles >= limits.maxSearchFiles || scannedBytes >= limits.maxSearchBytes) break
    let content
    try {
      const absolute = resolveSafePath(rootPath, file.path).absolutePath
      const stat = fs.statSync(absolute)
      if (stat.size > limits.maxFileBytes || scannedBytes + stat.size > limits.maxSearchBytes) continue
      content = fs.readFileSync(absolute, 'utf8')
      if (content.includes('\0')) continue
      scannedBytes += stat.size
      scannedFiles += 1
    } catch {
      continue
    }
    const lines = content.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      if (!terms.every((term) => lines[index].toLowerCase().includes(term))) continue
      matches.push({ path: file.path, line: index + 1, excerpt: lines[index].trim().slice(0, 280) })
      if (matches.length >= limits.maxResults) break
    }
  }
  return {
    query: needle,
    matches,
    count: matches.length,
    scannedFiles,
    scannedBytes,
    truncated: scannedFiles < inventory.files.length || matches.length >= limits.maxResults,
    readOnly: true,
  }
}

module.exports = {
  DEFAULT_LIMITS,
  isIgnoredRelativePath,
  isLikelyTextFile,
  listProjectFiles,
  readProjectFile,
  searchProjectFiles,
}
