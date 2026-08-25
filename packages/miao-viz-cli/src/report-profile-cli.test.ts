import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { beforeAll, describe, expect, it } from 'vitest'

const fixture = 'test_data/report_workflow_sales.csv'
const cliPath = join(mkdtempSync(join(tmpdir(), 'miao-profile-cli-')), 'cli.cjs')

beforeAll(() => {
  execFileSync('node_modules/esbuild/bin/esbuild', [
    'packages/miao-viz-cli/src/cli.ts', '--bundle', '--platform=node', '--format=cjs',
    '--target=node20', `--outfile=${cliPath}`, '--log-level=warning'
  ])
})

function runCli(args: string[]): any {
  const result = spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' })
  return JSON.parse(result.stdout.trim())
}

function setup(metric = 'total_sales', evidenceId = 'total') {
  const dir = mkdtempSync(join(tmpdir(), 'miao-profile-project-'))
  const context = join(dir, 'context.json')
  const spec = join(dir, 'report.yaml')
  const profile = join(dir, 'profile.yaml')
  const project = join(dir, 'project')
  expect(runCli(['data', 'analyze', fixture, '--intent', 'sales performance', '--output', context])).toMatchObject({ ok: true })
  expect(runCli(['spec', 'block', 'instantiate', 'trend-ranking', '--context', context, '--output', spec])).toMatchObject({ ok: true })
  writeFileSync(profile, `schemaVersion: 1\nmetrics:\n  - evidenceId: ${evidenceId}\n    metric: ${metric}\n    label: Sales\n    desiredDirection: increase\n    materiality:\n      percent: 0.1\n`)
  return { context, spec, profile, project }
}

function scaleSales(output: string, factor: number): void {
  const rows = readFileSync(fixture, 'utf8').trim().split('\n')
  const header = rows[0].split(',')
  const salesIndex = header.indexOf('sales')
  const scaled = rows.map((row, index) => {
    if (index === 0) return row
    const values = row.split(',')
    values[salesIndex] = String(Math.round(Number(values[salesIndex]) * factor))
    return values.join(',')
  })
  writeFileSync(output, `${scaled.join('\n')}\n`)
}

describe('report profile CLI', () => {
  it('previews and persists a valid profile without changing legacy behavior', () => {
    const item = setup()
    expect(runCli(['report', 'init', item.project, '--input', fixture, '--spec', item.spec, '--context', item.context,
      '--profile', item.profile, '--period', '2026-07', '--dry-run']))
      .toMatchObject({ ok: true, value: { dryRun: true, profile: { metrics: 1 }, hashes: { reportProfile: expect.any(String) } } })
    expect(existsSync(item.project)).toBe(false)

    expect(runCli(['report', 'init', item.project, '--input', fixture, '--spec', item.spec, '--context', item.context,
      '--profile', item.profile, '--period', '2026-07'])).toMatchObject({ ok: true })
    expect(JSON.parse(readFileSync(join(item.project, 'project.json'), 'utf8'))).toMatchObject({ schemaVersion: 2 })
    expect(JSON.parse(readFileSync(join(item.project, 'report-profile.json'), 'utf8'))).toMatchObject({ schemaVersion: 1 })
  })

  it.each([
    ['missing', 'total_sales', 'unknown_evidence'],
    ['total', 'missing_metric', 'non_numeric_metric'],
    ['by_dimension', 'total_sales', 'non_scalar_metric']
  ])('rejects invalid evidence references', (evidenceId, metric, reason) => {
    const item = setup(metric, evidenceId)
    const result = runCli(['report', 'init', item.project, '--input', fixture, '--spec', item.spec, '--context', item.context,
      '--profile', item.profile, '--period', '2026-07'])
    expect(result).toMatchObject({ ok: false, code: 'REPORT_PROFILE_EVIDENCE_INVALID' })
    expect(JSON.stringify(result)).toContain(reason)
  })

  it('creates profile-aware outcome and review artifacts on update', () => {
    const item = setup()
    expect(runCli(['report', 'init', item.project, '--input', fixture, '--spec', item.spec, '--context', item.context,
      '--profile', item.profile, '--period', '2026-07'])).toMatchObject({ ok: true, value: { status: 'ready' } })
    expect(runCli(['report', 'update', item.project, '--input', fixture, '--period', '2026-08']))
      .toMatchObject({ ok: true, value: { status: 'ready', review: { status: 'ready' } } })
    const run = join(item.project, 'runs', '2026-08')
    expect(existsSync(join(run, 'period-outcome-brief.json'))).toBe(true)
    expect(existsSync(join(run, 'review.json'))).toBe(true)
    expect(JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8')))
      .toMatchObject({ schemaVersion: 3, reportProfileHash: expect.any(String), review: { status: 'ready' } })
  })

  it.each([
    ['favorable', 1.2, 'ready', 'favorable', false],
    ['adverse', 0.8, 'needs_review', 'adverse', false],
    ['no material change', 1, 'ready', undefined, true]
  ])('runs the complete two-period workflow for %s data', (_name, factor, status, classification, noMaterialChange) => {
    const item = setup()
    const current = join(item.project + '-input.csv')
    scaleSales(current, factor)
    expect(runCli(['report', 'init', item.project, '--input', fixture, '--spec', item.spec, '--context', item.context,
      '--profile', item.profile, '--period', '2026-07'])).toMatchObject({ ok: true })
    const updated = runCli(['report', 'update', item.project, '--input', current, '--period', '2026-08'])
    expect(updated).toMatchObject({ ok: true, value: { status, review: { status } } })
    const run = join(item.project, 'runs', '2026-08')
    const brief = JSON.parse(readFileSync(join(run, 'period-outcome-brief.json'), 'utf8'))
    expect(brief.noMaterialChange).toBe(noMaterialChange)
    if (classification) expect(brief.outcomes[0]).toMatchObject({ classification, evidenceRefs: ['total'] })
    expect(readFileSync(join(run, 'report.html'), 'utf8')).toContain('Period outcomes')
  })

  it('blocks a profile lineage change before creating a new run', () => {
    const item = setup()
    expect(runCli(['report', 'init', item.project, '--input', fixture, '--spec', item.spec, '--context', item.context,
      '--profile', item.profile, '--period', '2026-07'])).toMatchObject({ ok: true })
    const stored = join(item.project, 'report-profile.json')
    const profile = JSON.parse(readFileSync(stored, 'utf8'))
    profile.metrics[0].label = 'Changed label'
    writeFileSync(stored, JSON.stringify(profile, null, 2))
    expect(runCli(['report', 'update', item.project, '--input', fixture, '--period', '2026-08']))
      .toMatchObject({ ok: false, code: 'REPORT_PROJECT_INVALID' })
    expect(existsSync(join(item.project, 'runs', '2026-08'))).toBe(false)
  })

  it('degrades a missing optional logo to a review warning', () => {
    const item = setup()
    const profile = readFileSync(item.profile, 'utf8')
    writeFileSync(item.profile, `${profile}presentation:\n  logo: ./missing.png\n`)
    expect(runCli(['report', 'init', item.project, '--input', fixture, '--spec', item.spec, '--context', item.context,
      '--profile', item.profile, '--period', '2026-07']))
      .toMatchObject({ ok: true, value: { status: 'needs_review', review: { status: 'needs_review' } } })
    const stored = JSON.parse(readFileSync(join(item.project, 'report-profile.json'), 'utf8'))
    expect(stored.presentation.logo).toBeUndefined()
    expect(JSON.parse(readFileSync(join(item.project, 'runs/2026-07/review.json'), 'utf8')).reasons)
      .toContainEqual(expect.objectContaining({ code: 'OPTIONAL_LOGO_MISSING' }))
  })
})
