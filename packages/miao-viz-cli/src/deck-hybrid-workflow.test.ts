import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function run(args: string[]) {
  const result = spawnSync(process.execPath, ['scripts/miao-viz.mjs', ...args], { encoding: 'utf8' })
  return { status: result.status, body: JSON.parse(result.stdout) }
}

describe('Hybrid deck workflow', () => {
  it.each(['project-update', 'proposal'] as const)('runs the complete grounded %s workflow', pattern => {
    const dir = mkdtempSync(join(tmpdir(), `miao-hybrid-${pattern}-`))
    const context = join(dir, 'context.json')
    const spec = join(dir, 'deck.yaml')
    const output = join(dir, 'deck.html')
    const markdown = pattern === 'proposal' ? 'test_data/deck-context/proposal.md' : 'test_data/deck-context/project-update.md'
    const intent = pattern === 'proposal' ? 'Compare rollout approaches and choose one' : 'Project update and measured impact'
    expect(run(['deck', 'analyze', markdown, '--data', 'packages/miao-viz-cli/examples/sales.csv', '--intent', intent, '--output', context]).status).toBe(0)
    const contextValue = JSON.parse(readFileSync(context, 'utf8'))
    expect(contextValue.data.intent.raw).toBe(intent)
    expect(contextValue.metadata.requestFingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(run(['deck', 'instantiate', pattern, '--context', context, '--output', spec]).status).toBe(0)
    const validated = run(['deck', 'validate', '--spec', spec, '--context', context, '--strict'])
    expect(validated.status).toBe(0)
    expect(validated.body.value.coverage).toMatchObject({ objectCoverage: 1, claimCheckCoverage: 1 })
    const rendered = run(['render', 'deck', '--input', 'packages/miao-viz-cli/examples/sales.csv', '--spec', spec, '--context', context, '--strict', '--output', output])
    expect(rendered.status).toBe(0)
    expect(rendered.body.value.coverage).toMatchObject({ objectCoverage: 1, claimCheckCoverage: 1 })
  })

  it('rejects a render input different from the analyzed data source', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-hybrid-mismatch-'))
    const context = join(dir, 'context.json')
    const spec = join(dir, 'deck.yaml')
    run(['deck', 'analyze', 'test_data/deck-context/project-update.md', '--data', 'packages/miao-viz-cli/examples/sales.csv', '--intent', 'Project update and decision', '--output', context])
    run(['deck', 'instantiate', 'project-update', '--context', context, '--output', spec])
    const rendered = run(['render', 'deck', '--input', 'packages/miao-viz-cli/examples/product-metrics.csv', '--spec', spec, '--context', context, '--strict', '--output', join(dir, 'deck.html')])
    expect(rendered.body).toMatchObject({ ok: false, code: 'DECK_DATA_SOURCE_MISMATCH' })
  })

  it('rejects data changed in place after analysis', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-hybrid-fingerprint-'))
    const data = join(dir, 'sales.csv')
    const context = join(dir, 'context.json')
    const spec = join(dir, 'deck.yaml')
    copyFileSync('packages/miao-viz-cli/examples/sales.csv', data)
    run(['deck', 'analyze', 'test_data/deck-context/project-update.md', '--data', data, '--intent', 'Project update and decision', '--output', context])
    run(['deck', 'instantiate', 'project-update', '--context', context, '--output', spec])
    writeFileSync(data, `${readFileSync(data, 'utf8')}2025-03-01,West,Software,999,9\n`)
    const rendered = run(['render', 'deck', '--input', data, '--spec', spec, '--context', context, '--strict', '--output', join(dir, 'deck.html')])
    expect(rendered.body).toMatchObject({ ok: false, code: 'DECK_DATA_SOURCE_MISMATCH' })
    expect(rendered.body.expectedFingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(rendered.body.actualFingerprint).toMatch(/^[a-f0-9]{64}$/)
  })
})
