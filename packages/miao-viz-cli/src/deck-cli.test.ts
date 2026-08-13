import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import type { AnalyzeContext } from './context-schema'

function writeJson(dir: string, name: string, value: unknown): string {
  const path = join(dir, name)
  writeFileSync(path, JSON.stringify(value), 'utf8')
  return path
}

function runCli(args: string[]): { status: number | null; output: any } {
  const result = spawnSync(process.execPath, ['scripts/miao-viz.mjs', ...args], { encoding: 'utf8' })
  return { status: result.status, output: JSON.parse(result.stdout) }
}

function context(): AnalyzeContext {
  return {
    intent: { raw: 'executive brief', coverage: 'full', assumptions: [] },
    fields: [{ name: 'sales', role: 'measure', type: 'number' }],
    evidence: [{ id: 'total', query: 'total sales', values: { sales: 650 } }],
    catalog: { charts: ['bigvalue'], blockedCharts: [], recommendedPlan: [] },
    sampleWarnings: [],
    promptRules: []
  }
}

describe('deck CLI knowledge validation', () => {
  it('analyzes Markdown into machine-readable DeckContext', () => {
    const result = runCli(['deck', 'analyze', 'test_data/deck-context/project-update.md', '--intent', '项目更新，10 分钟'])
    expect(result.status).toBe(0)
    expect(result.output).toMatchObject({ ok: true, value: { context: { version: 1, request: { durationMinutes: 10 } } } })
  })

  it('strictly validates a sourced narrative deck without data', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const contextValue = JSON.parse(readFileSync('test_data/deck-context/narrative.json', 'utf8'))
    const spec = writeJson(dir, 'deck.json', {
      pattern: 'topic-explainer',
      slides: [
        { layout: 'cover', slideRole: 'narrative-cover', title: 'Project' },
        { layout: 'text-points', slideRole: 'section-summary', purpose: 'Summarize sourced progress.', title: 'Progress', claimStatus: 'source-text', sourceRefs: [{ sourceId: 'src:8f41c2d0', sectionId: 'src:8f41c2d0:sec:1', paragraphIds: ['src:8f41c2d0:p:1'], kind: 'source-text' }] }
      ]
    })
    const ctx = writeJson(dir, 'context.json', contextValue)
    const result = runCli(['deck', 'validate', '--spec', spec, '--context', ctx, '--strict'])
    expect(result.status).toBe(0)
    expect(result.output.value.sourceValidated).toBe(true)
  })

  it('renders a narrative deck without --input', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const output = join(dir, 'narrative.html')
    const spec = writeJson(dir, 'deck.json', {
      pattern: 'topic-explainer',
      slides: [
        { layout: 'cover', slideRole: 'narrative-cover', title: 'Project' },
        { layout: 'section-summary', slideRole: 'section-summary', purpose: 'Summarize sourced progress.', title: 'Progress', bullets: ['Adoption reached 42%.'], claimStatus: 'source-text', sourceRefs: [{ sourceId: 'src:8f41c2d0', sectionId: 'src:8f41c2d0:sec:1', paragraphIds: ['src:8f41c2d0:p:1'], kind: 'source-text' }] }
      ]
    })
    const ctx = writeJson(dir, 'context.json', JSON.parse(readFileSync('test_data/deck-context/narrative.json', 'utf8')))
    const result = runCli(['render', 'deck', '--spec', spec, '--context', ctx, '--strict', '--output', output])
    expect(result.status).toBe(0)
    expect(result.output.value.slides).toBe(2)
    expect(readFileSync(output, 'utf8').match(/class="slide(?: |")/g)).toHaveLength(2)
  })

  it('instantiates a narrative pattern from DeckContext', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const contextPath = join(dir, 'context.json')
    const analyzed = runCli(['deck', 'analyze', 'test_data/deck-context/project-update.md', '--intent', 'Project update and decision', '--output', contextPath])
    expect(analyzed.status).toBe(0)
    const result = runCli(['deck', 'instantiate', 'project-update', '--context', contextPath])
    expect(result.status).toBe(0)
    expect(result.output.value.spec).toMatchObject({ pattern: 'project-update', slides: expect.any(Array) })
  })

  it('validates a grounded deck', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const spec = writeJson(dir, 'deck.json', {
      slides: [{
        layout: 'title-only',
        claim: 'Total sales were 650.',
        claimType: 'descriptive',
        evidence: ['total'],
        derivedFrom: ['$evidence:total.values.sales'],
        check: 'value_match'
      }]
    })
    const ctx = writeJson(dir, 'context.json', context())
    const result = runCli(['deck', 'validate', '--spec', spec, '--context', ctx, '--verify', '--strict'])
    expect(result.status).toBe(0)
    expect(result.output.ok).toBe(true)
  })

  it('returns warnings in non-strict mode and fails in strict mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const spec = writeJson(dir, 'deck.json', {
      slides: [{ layout: 'title-only', claim: 'Sales increased 20%.' }]
    })
    const ctx = writeJson(dir, 'context.json', context())

    const normal = runCli(['deck', 'validate', '--spec', spec, '--context', ctx])
    expect(normal.status).toBe(0)
    expect(normal.output.value.issues.some((item: { code: string }) => item.code === 'DECK_NUMERIC_CLAIM_UNGROUNDED')).toBe(true)

    const strict = runCli(['deck', 'validate', '--spec', spec, '--context', ctx, '--strict'])
    expect(strict.status).toBe(1)
    expect(strict.output.code).toBe('DECK_NUMERIC_CLAIM_UNGROUNDED')
  })

  it('keeps legacy render and reports skipped checks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const output = join(dir, 'deck.html')
    const result = runCli([
      'render', 'deck',
      '--input', 'packages/miao-viz-cli/examples/sales.csv',
      '--spec', 'packages/miao-viz-cli/examples/sales-deck.yaml',
      '--output', output
    ])
    expect(result.status).toBe(0)
    expect(result.output.value.skippedChecks).toContain('claim grounding')
    expect(result.output.value.delivery).toMatchObject({
      kind: 'deck', status: 'needs_review', summary: { metrics: [], highlights: [] }
    })
    expect(readFileSync(output, 'utf8')).toContain('class="slide-nav"')
  })

  it('requires context for strict rendering', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const result = runCli([
      'render', 'deck',
      '--input', 'packages/miao-viz-cli/examples/sales.csv',
      '--spec', 'packages/miao-viz-cli/examples/sales-deck.yaml',
      '--strict',
      '--output', join(dir, 'deck.html')
    ])
    expect(result.status).toBe(1)
    expect(result.output.code).toBe('DECK_CONTEXT_REQUIRED')
  })

  it('renders successfully with context verification in strict mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const output = join(dir, 'deck.html')
    const spec = writeJson(dir, 'deck.json', {
      slides: [{
        layout: 'title-only',
        claim: 'Total sales were 650.',
        claimType: 'descriptive',
        evidence: ['total'],
        derivedFrom: ['$evidence:total.values.sales'],
        check: 'value_match'
      }]
    })
    const ctx = writeJson(dir, 'context.json', context())
    const result = runCli([
      'render', 'deck',
      '--input', 'packages/miao-viz-cli/examples/sales.csv',
      '--spec', spec,
      '--context', ctx,
      '--verify',
      '--strict',
      '--output', output
    ])
    expect(result.status).toBe(0)
    expect(result.output.value.issues).toEqual([])
    expect(result.output.value.skippedChecks).toBeUndefined()
  })
})
