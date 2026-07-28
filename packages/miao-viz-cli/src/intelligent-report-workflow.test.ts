import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { beforeAll, describe, expect, it } from 'vitest'
import { compareEvidence } from './report-changes'
import { loadDatasets } from './data-loader'

const fixture = 'test_data/report_workflow_sales.csv'
const cliPath = join(mkdtempSync(join(tmpdir(), 'miao-intelligent-report-')), 'cli.cjs')

beforeAll(() => {
  execFileSync('node_modules/esbuild/bin/esbuild', [
    'packages/miao-viz-cli/src/cli.ts', '--bundle', '--platform=node', '--format=cjs',
    '--target=node20', `--outfile=${cliPath}`, '--log-level=warning'
  ])
})

function runCli(args: string[]): any {
  const result = spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' })
  const output = result.stdout.trim()
  if (!output) throw new Error(result.stderr || `CLI exited ${result.status}`)
  return JSON.parse(output)
}

describe('intelligent report workflow', () => {
  it('catalogs scenes and instantiates a strictly valid sales scene', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-scene-'))
    const context = join(dir, 'context.json')
    const profile = join(dir, 'profile.json')
    const spec = join(dir, 'report.yaml')
    expect(runCli(['data', 'analyze', fixture, '--intent', 'sales performance', '--output', context])).toMatchObject({ ok: true })
    const analyzed = JSON.parse(readFileSync(context, 'utf8'))
    expect(analyzed.value.catalog.scenes.some((scene: { id: string }) => scene.id === 'sales-analysis')).toBe(true)
    expect(runCli(['spec', 'scene', 'instantiate', 'sales-analysis', '--context', context, '--output', spec])).toMatchObject({
      ok: true, value: { sceneId: 'sales-analysis' }
    })
    writeFileSync(profile, JSON.stringify(runCli(['data', 'profile', fixture]), null, 2))
    expect(runCli(['spec', 'validate', '--spec', spec, '--profile', profile, '--context', context, '--verify', '--strict']))
      .toMatchObject({ ok: true })
  })

  it.each([
    ['business-overview', 'test_data/scene_business_overview.csv'],
    ['marketing-performance', 'test_data/scene_marketing_performance.csv'],
    ['financial-summary', 'test_data/scene_financial_summary.csv'],
    ['survey-analysis', 'test_data/scene_survey_analysis.csv'],
    ['ab-test', 'test_data/scene_ab_test.csv'],
    ['data-quality-audit', 'test_data/scene_data_quality.csv']
  ])('runs the complete strict pipeline for %s', (scene, input) => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-scene-pipeline-'))
    const context = join(dir, 'context.json')
    const profile = join(dir, 'profile.json')
    const spec = join(dir, 'report.yaml')
    const html = join(dir, 'report.html')
    expect(runCli(['data', 'analyze', input, '--intent', scene, '--output', context])).toMatchObject({ ok: true })
    expect(runCli(['spec', 'scene', 'instantiate', scene, '--context', context, '--output', spec])).toMatchObject({ ok: true })
    writeFileSync(profile, JSON.stringify(runCli(['data', 'profile', input]), null, 2))
    expect(runCli(['spec', 'validate', '--spec', spec, '--profile', profile, '--context', context, '--verify', '--strict'])).toMatchObject({ ok: true })
    expect(runCli(['render', 'report', '--input', input, '--spec', spec, '--context', context, '--output', html])).toMatchObject({ ok: true })
    expect(existsSync(html)).toBe(true)
  })

  it('blocks semantic scenes instead of guessing fields', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-scene-blocked-'))
    const input = join(dir, 'generic.csv')
    const context = join(dir, 'context.json')
    writeFileSync(input, 'category,value\nA,10\nB,20\n')
    expect(runCli(['data', 'analyze', input, '--intent', 'marketing report', '--output', context])).toMatchObject({ ok: true })
    const result = runCli(['spec', 'scene', 'instantiate', 'marketing-performance', '--context', context])
    expect(result).toMatchObject({ ok: false, code: 'SCENE_NOT_APPLICABLE' })
    expect(result.clarificationQuestions.length).toBeGreaterThan(0)
  })

  it('derives a summary with chart and evidence provenance', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-summary-'))
    const context = join(dir, 'context.json')
    const spec = join(dir, 'report.yaml')
    const summary = join(dir, 'summary.yaml')
    runCli(['data', 'analyze', fixture, '--intent', 'sales performance', '--output', context])
    runCli(['spec', 'scene', 'instantiate', 'sales-analysis', '--context', context, '--output', spec])
    const result = runCli(['spec', 'summary', 'instantiate', '--spec', spec, '--context', context, '--output', summary])
    expect(result).toMatchObject({ ok: true })
    expect(result.value.provenance.sourceChartIds.length).toBeGreaterThan(0)
    expect(result.value.provenance.evidenceIds.length).toBeGreaterThan(0)
    expect(existsSync(result.value.provenanceOutput)).toBe(true)
  })

  it('reports minimal edit impact and unchanged nodes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-diff-'))
    const context = join(dir, 'context.json')
    const before = join(dir, 'before.json')
    const after = join(dir, 'after.json')
    runCli(['data', 'analyze', fixture, '--intent', 'sales performance', '--output', context])
    const spec = {
      title: 'Before',
      insights: [{ text: 'Total is $evidence:total.values.total_sales.', evidence: ['total'] }],
      charts: [{ id: 'sales', type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'sales' } } }]
    }
    writeFileSync(before, JSON.stringify(spec))
    writeFileSync(after, JSON.stringify({ ...spec, title: 'After' }))
    const result = runCli(['spec', 'diff', '--before', before, '--after', after, '--context', context])
    expect(result).toMatchObject({
      ok: true,
      value: { changes: [{ op: 'replace', path: '/title' }], requiresRecompute: false, unchanged: { charts: 1, insights: 1 } }
    })
  })

  it('compares numeric evidence, ranks, and zero baselines safely', () => {
    const previous = [
      { id: 'total', query: 'total', recipe: { schemaVersion: 1 as const, measures: [{ operation: 'sum' as const, field: 'sales', alias: 'sales' }] }, values: { sales: 0 } },
      { id: 'rank', query: 'rank', recipe: { schemaVersion: 1 as const, groupBy: ['region'], measures: [{ operation: 'sum' as const, field: 'sales', alias: 'sales' }] }, rows: [{ region: 'A', sales: 10 }, { region: 'B', sales: 5 }] }
    ]
    const current = [
      { ...previous[0], values: { sales: 25 } },
      { ...previous[1], rows: [{ region: 'B', sales: 20 }, { region: 'A', sales: 10 }] }
    ]
    const changes = compareEvidence(previous, current, 'p1')
    expect(changes.metrics[0]).toMatchObject({ absolute: 25, percent: null })
    expect(changes.rankings).toHaveLength(2)
  })

  it('computes A/B significance only when variant, sample, and rate fields are present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-ab-'))
    const context = join(dir, 'context.json')
    runCli(['data', 'analyze', 'test_data/scene_ab_test.csv', '--intent', 'A/B experiment', '--output', context])
    const analyzed = JSON.parse(readFileSync(context, 'utf8'))
    const evidence = analyzed.value.evidence.find((item: { id: string }) => item.id === 'ab_test_significance')
    expect(evidence.values).toMatchObject({
      baseline_variant: 'control',
      treatment_variant: 'treatment',
      significant_at_0_05: true
    })
  })

  it('appends schema-compatible files and rejects incompatible files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-multi-'))
    const a = join(dir, 'a.csv')
    const b = join(dir, 'b.csv')
    const bad = join(dir, 'bad.csv')
    writeFileSync(a, 'region,sales\nA,10\n')
    writeFileSync(b, 'area,amount\nB,20\n')
    writeFileSync(bad, 'region,label\nC,x\n')
    const merged = loadDatasets([a, b], { fieldMap: { area: 'region', amount: 'sales' } })
    expect(merged).toMatchObject({ ok: true, value: { rows: [{ region: 'A', sales: 10 }, { region: 'B', sales: 20 }] } })
    expect(loadDatasets([a, bad])).toMatchObject({ ok: false, code: 'MULTI_FILE_SCHEMA_MISMATCH' })
    const mapping = join(dir, 'field-map.json')
    const context = join(dir, 'context.json')
    writeFileSync(mapping, JSON.stringify({ area: 'region', amount: 'sales' }))
    expect(runCli(['data', 'analyze', '--inputs', `${a},${b}`, '--field-map', mapping, '--intent', 'sales', '--output', context]))
      .toMatchObject({ ok: true })
    const analyzed = JSON.parse(readFileSync(context, 'utf8'))
    expect(analyzed.value.evidence.find((item: { id: string }) => item.id === 'total').values.total_sales).toBe(30)
  })
})
