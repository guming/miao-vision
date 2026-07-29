import assert from 'node:assert/strict'
import test from 'node:test'
import { cliCandidates, compareVersions, isCompatibleVersion } from './cli-runtime.mjs'

test('resolves custom, default, PATH, then legacy candidates', () => {
  assert.deepEqual(cliCandidates({
    env: { MIAO_VISION_HOME: '/custom/miao' },
    home: '/users/test',
    platform: 'linux',
    root: '/skill'
  }), [
    '/custom/miao/bin/miao-viz',
    '/users/test/.miao-vision/bin/miao-viz',
    'miao-viz',
    '/skill/bin/miao-viz'
  ])
})

test('does not duplicate the default home candidate', () => {
  assert.deepEqual(cliCandidates({
    env: {},
    home: '/users/test',
    platform: 'win32',
    root: '/skill'
  }), [
    '/users/test/.miao-vision/bin/miao-viz.exe',
    'miao-viz.exe',
    '/skill/bin/miao-viz.exe'
  ])
})

test('compares semantic versions and enforces the compatibility range', () => {
  const compatibility = {
    minimumCliVersion: '0.2.0',
    maximumCliVersionExclusive: '0.3.0'
  }
  assert.equal(compareVersions('0.2.0', '0.2.0'), 0)
  assert.equal(compareVersions('0.2.1', '0.2.0'), 1)
  assert.equal(isCompatibleVersion('0.2.0', compatibility), true)
  assert.equal(isCompatibleVersion('0.2.9', compatibility), true)
  assert.equal(isCompatibleVersion('0.1.30', compatibility), false)
  assert.equal(isCompatibleVersion('0.3.0', compatibility), false)
  assert.equal(isCompatibleVersion('unknown', compatibility), false)
})
