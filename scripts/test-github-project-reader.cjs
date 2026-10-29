'use strict'

const assert = require('node:assert/strict')
const {
  parseRepositoryUrl,
  isReadableTextPath,
} = require('../apps/desktop/githubProjectReader.cjs')

assert.deepEqual(parseRepositoryUrl('https://github.com/owner/repository'), {
  owner: 'owner',
  repo: 'repository',
  fullName: 'owner/repository',
})
assert.deepEqual(parseRepositoryUrl('https://github.com/owner/repository.git'), {
  owner: 'owner',
  repo: 'repository',
  fullName: 'owner/repository',
})
assert.throws(() => parseRepositoryUrl('http://github.com/owner/repo'), /Only https/)
assert.throws(() => parseRepositoryUrl('https://example.com/owner/repo'), /Only https/)
assert.throws(() => parseRepositoryUrl('https://github.com/owner'), /Use a repository URL/)
assert.throws(() => parseRepositoryUrl('https://github.com/owner/repo/issues'), /invalid owner|invalid/i)

assert.equal(isReadableTextPath('src/index.ts'), true)
assert.equal(isReadableTextPath('README.md'), true)
assert.equal(isReadableTextPath('package.json'), true)
assert.equal(isReadableTextPath('.env'), false)
assert.equal(isReadableTextPath('.env.local'), false)
assert.equal(isReadableTextPath('src/.env.production'), false)
assert.equal(isReadableTextPath('credentials.json'), false)
assert.equal(isReadableTextPath('config/private-key.json'), false)
assert.equal(isReadableTextPath('node_modules/package/index.js'), false)
assert.equal(isReadableTextPath('dist/app.js'), false)
assert.equal(isReadableTextPath('image.png'), false)
assert.equal(isReadableTextPath('src/.env.example'), false, 'environment templates remain excluded from GitHub reading in this phase')

console.log('GitHub project reader safety tests passed.')
