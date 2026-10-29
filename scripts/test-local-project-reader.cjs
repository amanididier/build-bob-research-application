'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {
  listProjectFiles,
  readProjectFile,
  searchProjectFiles,
  isIgnoredRelativePath,
} = require('../apps/desktop/localProjectReader.cjs')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bob-local-project-'))

try {
  fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  fs.mkdirSync(path.join(root, 'node_modules', 'ignored-package'), { recursive: true })
  fs.writeFileSync(path.join(root, 'src', 'app.ts'), [
    'export function greet(name: string) {',
    "  return 'Hello ' + name",
    '}',
    '',
    '// Local project reader test marker',
  ].join('\n'))
  fs.writeFileSync(path.join(root, 'README.md'), '# Test project\n')
  fs.writeFileSync(path.join(root, '.env'), 'GEMINI_API_KEY=must-not-be-read\n')
  fs.writeFileSync(path.join(root, '.env.example'), 'PUBLIC_URL=https://example.test\n')
  fs.writeFileSync(path.join(root, 'node_modules', 'ignored-package', 'index.js'), 'secret package content\n')
  fs.writeFileSync(path.join(root, 'large.ts'), 'x'.repeat(300 * 1024))

  const listing = listProjectFiles(root)
  const paths = listing.files.map((file) => file.path)
  assert(paths.includes('src/app.ts'), 'source file should be listed')
  assert(paths.includes('README.md'), 'README should be listed')
  assert(paths.includes('.env.example'), 'safe environment template should be listed')
  assert(!paths.includes('.env'), 'real environment file must be excluded')
  assert(!paths.some((file) => file.includes('node_modules')), 'dependency files must be excluded')
  assert(!paths.includes('large.ts'), 'files over the size limit must not be listed')
  assert.equal(isIgnoredRelativePath('src/.env'), true)

  const read = readProjectFile(root, 'src/app.ts', { startLine: 2, endLine: 3 })
  assert.match(read.content, /^2: /, 'read result should include original line numbers')
  assert.match(read.content, /3: \}/, 'read result should include requested ending line')
  assert.equal(read.readOnly, true)

  assert.throws(() => readProjectFile(root, '../outside.txt'), /traversal|relative|outside/i)
  assert.throws(() => readProjectFile(root, '.env'), /excluded/i)
  assert.throws(() => readProjectFile(root, 'large.ts'), /too large/i)
  assert.throws(() => searchProjectFiles(root, 'x'), /at least two characters/i)

  const search = searchProjectFiles(root, 'Local project reader test marker')
  assert(search.matches.some((match) => match.path === 'src/app.ts' && match.line === 5), 'search should return path and line number')
  assert.equal(search.readOnly, true)

  try {
    fs.symlinkSync(path.join(root, 'src', 'app.ts'), path.join(root, 'src', 'linked.ts'))
    assert(!listProjectFiles(root).files.some((file) => file.path === 'src/linked.ts'), 'symlink files must not be listed')
    assert.throws(() => readProjectFile(root, 'src/linked.ts'), /symbolic link/i)
  } catch (error) {
    if (!/EPERM|EACCES|operation not permitted/i.test(String(error))) throw error
    console.warn('Symlink assertion skipped: this environment does not permit symlink creation.')
  }

  console.log('Local project reader tests passed.')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
