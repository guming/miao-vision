import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { runArtifactCommand } from './cli-artifact'
import { toCompactAnalyzeContext } from './context-schema'
import type { CliArgs } from './cli-utils'

const originalExitCode = process.exitCode
afterEach(() => { process.exitCode = originalExitCode })

function args(flags: CliArgs['flags'], subcommand = 'plan'): CliArgs {
  return { command: 'artifact', subcommand, positional: [], flags }
}

function fixtures(compact = false) {
  const root = mkdtempSync(join(tmpdir(), 'miao-artifact-plan-'))
  const briefPath = join(root, 'brief.json')
  const contextPath = join(root, 'context.json')
  writeFileSync(briefPath, JSON.stringify({
    schemaVersion: '1', rawRequest: '给老板开会看',
    delivery: { context: 'meeting', form: 'presentation', tone: 'executive' }
  }))
  const analyzed = analyzeDataset({
    file: 'sales.csv', columns: ['region', 'sales'],
    rows: [{ region: 'East', sales: 10 }, { region: 'West', sales: 20 }]
  })
  writeFileSync(contextPath, JSON.stringify(compact ? toCompactAnalyzeContext(analyzed) : analyzed))
  return { root, briefPath, contextPath }
}

describe('runArtifactCommand', () => {
  it('plans from full and compact Analyze Context without changing the decision', () => {
    const full = fixtures(false)
    const compact = fixtures(true)
    const fullResult = runArtifactCommand(args({ brief: full.briefPath, context: full.contextPath })) as any
    const compactResult = runArtifactCommand(args({ brief: compact.briefPath, context: compact.contextPath })) as any
    expect(fullResult.ok).toBe(true)
    expect(compactResult.ok).toBe(true)
    expect([compactResult.value.form, compactResult.value.renderer, compactResult.value.pattern])
      .toEqual([fullResult.value.form, fullResult.value.renderer, fullResult.value.pattern])
  })

  it('returns compact output without changing planning fields', () => {
    const fixture = fixtures()
    const full = runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any
    const compact = runArtifactCommand(args({
      brief: fixture.briefPath, context: fixture.contextPath, compact: true
    })) as any
    expect(compact.value).not.toHaveProperty('resolvedBrief')
    expect(compact.value.briefHash).toBe(full.value.briefHash)
    expect(compact.value.status).toBe(full.value.status)
    expect(compact.value.pattern).toBe(full.value.pattern)
  })

  it('writes the selected representation to --output', () => {
    const fixture = fixtures()
    const output = join(fixture.root, 'plan.json')
    const result = runArtifactCommand(args({
      brief: fixture.briefPath, context: fixture.contextPath, output, compact: true
    })) as any
    expect(result).toMatchObject({ ok: true, value: { output } })
    const written = JSON.parse(readFileSync(output, 'utf8'))
    expect(written.ok).toBe(true)
    expect(written.value).not.toHaveProperty('resolvedBrief')
  })

  it.each([
    [{ context: '/tmp/context.json' }, 'MISSING_FLAG'],
    [{ brief: '/missing/brief.json', context: '/tmp/context.json' }, 'OUTCOME_BRIEF_READ_FAILED']
  ])('returns stable file and flag errors', (flags, code) => {
    expect(runArtifactCommand(args(flags))).toMatchObject({ ok: false, code })
  })

  it('returns structured validation issues for invalid Brief and Context', () => {
    const fixture = fixtures()
    writeFileSync(fixture.briefPath, JSON.stringify({ schemaVersion: '1', rawRequest: '' }))
    const invalidBrief = runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any
    expect(invalidBrief).toMatchObject({ ok: false, code: 'INVALID_OUTCOME_BRIEF' })
    expect(invalidBrief.issues[0].path).toBe('rawRequest')

    writeFileSync(fixture.briefPath, JSON.stringify({ schemaVersion: '1', rawRequest: 'x' }))
    writeFileSync(fixture.contextPath, '{}')
    expect(runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })))
      .toMatchObject({ ok: false, code: 'INVALID_ANALYZE_CONTEXT' })
  })

  it('returns unsupported and clarification as successful plan states', () => {
    const fixture = fixtures()
    writeFileSync(fixture.briefPath, JSON.stringify({
      schemaVersion: '1', rawRequest: 'public', audience: { scope: 'public' }
    }))
    expect((runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any).value.status)
      .toBe('unsupported')

    writeFileSync(fixture.briefPath, JSON.stringify({ schemaVersion: '1', rawRequest: 'x' }))
    expect((runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any).value.status)
      .toBe('needs_clarification')
  })

  it('returns a stable error for unknown artifact subcommands', () => {
    expect(runArtifactCommand(args({}, 'render'))).toMatchObject({ ok: false, code: 'UNKNOWN_SUBCOMMAND' })
  })
})
