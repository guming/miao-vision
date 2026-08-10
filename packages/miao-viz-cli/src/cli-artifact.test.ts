import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { runArtifactCommand } from './cli-artifact'
import { toCompactAnalyzeContext } from './context-schema'
import type { CliArgs } from './cli-utils'
import { artifactPlanSchema } from './artifact-plan-schema'
import { parseDeckSpec } from './deck-validator'
import { reportSpecSchema } from './spec-schema'
import * as YAML from 'yaml'

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
    expect([compactResult.value.form, compactResult.value.renderer, compactResult.value.target])
      .toEqual([fullResult.value.form, fullResult.value.renderer, fullResult.value.target])
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
    expect(compact.value.target).toEqual(full.value.target)
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

  it('instantiates full and compact V2 plans from full and compact contexts', () => {
    for (const useCompact of [false, true]) {
      const fixture = fixtures(useCompact)
      const planned = runArtifactCommand(args({
        brief: fixture.briefPath, context: fixture.contextPath,
        ...(useCompact ? { compact: true } : {})
      })) as any
      const planPath = join(fixture.root, 'plan.json')
      writeFileSync(planPath, JSON.stringify(planned.value))
      const result = runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')) as any
      expect(result.ok).toBe(true)
      expect(parseDeckSpec(result.value.spec).ok).toBe(true)
    }
  })

  it('writes valid YAML only after successful instantiation', () => {
    const fixture = fixtures()
    writeFileSync(fixture.briefPath, JSON.stringify({
      schemaVersion: '1', rawRequest: 'Create a report', delivery: { form: 'report' }
    }))
    const planned = runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any
    const planPath = join(fixture.root, 'plan.json')
    const output = join(fixture.root, 'report.yaml')
    writeFileSync(planPath, JSON.stringify(planned.value))
    const result = runArtifactCommand(args({ plan: planPath, context: fixture.contextPath, output }, 'instantiate')) as any
    expect(result).toMatchObject({ ok: true, value: { output, specKind: 'report' } })
    expect(reportSpecSchema.safeParse(YAML.parse(readFileSync(output, 'utf8'))).success).toBe(true)
  })

  it('requires confirmation and accepts --confirm-plan', () => {
    const fixture = fixtures()
    writeFileSync(fixture.briefPath, JSON.stringify({
      schemaVersion: '1', rawRequest: 'Client report',
      audience: { scope: 'external' }, delivery: { form: 'report' }
    }))
    const planned = runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any
    const planPath = join(fixture.root, 'plan.json')
    writeFileSync(planPath, JSON.stringify(planned.value))
    expect(runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')))
      .toMatchObject({ ok: false, code: 'PLAN_CONFIRMATION_REQUIRED' })
    expect(runArtifactCommand(args({
      plan: planPath, context: fixture.contextPath, 'confirm-plan': true
    }, 'instantiate'))).toMatchObject({ ok: true })
  })

  it('rejects V1, blocked states, and mismatched context without writing output', () => {
    const fixture = fixtures()
    const planned = runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any
    const planPath = join(fixture.root, 'plan.json')
    const output = join(fixture.root, 'must-not-exist.yaml')
    const v2 = planned.value
    const v1 = artifactPlanSchema.parse({
      schemaVersion: '1', briefHash: v2.briefHash, status: 'ready', sourceKind: 'tabular',
      resolvedBrief: v2.resolvedBrief, assumptions: [], form: v2.form, renderer: v2.renderer,
      pattern: v2.target.id, structureRoles: v2.structureRoles, densityBudget: v2.densityBudget,
      qualityGates: v2.qualityGates, formats: v2.formats,
      selectionReasons: v2.selectionReasons, warnings: [], clarification: null
    })
    writeFileSync(planPath, JSON.stringify(v1))
    expect(runArtifactCommand(args({ plan: planPath, context: fixture.contextPath, output }, 'instantiate')))
      .toMatchObject({ ok: false, code: 'PLAN_NOT_EXECUTABLE' })
    expect(() => readFileSync(output)).toThrow()

    writeFileSync(planPath, JSON.stringify({ ...v2, contextHash: 'b'.repeat(64) }))
    expect(runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')))
      .toMatchObject({ ok: false, code: 'PLAN_CONTEXT_MISMATCH' })

    writeFileSync(planPath, JSON.stringify({
      ...v2, status: 'unsupported', nextAction: 'stop', target: null,
      form: null, renderer: null, clarification: null
    }))
    expect(runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')))
      .toMatchObject({ ok: false, code: 'PLAN_STATUS_BLOCKED' })
  })

  it('returns stable plan/context read and validation errors', () => {
    const fixture = fixtures()
    expect(runArtifactCommand(args({ plan: '/missing/plan.json', context: fixture.contextPath }, 'instantiate')))
      .toMatchObject({ ok: false, code: 'ARTIFACT_PLAN_READ_FAILED' })
    const planPath = join(fixture.root, 'bad-plan.json')
    writeFileSync(planPath, '{}')
    expect(runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')))
      .toMatchObject({ ok: false, code: 'INVALID_ARTIFACT_PLAN' })
    writeFileSync(fixture.contextPath, '{}')
    expect(runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')))
      .toMatchObject({ ok: false, code: 'INVALID_ANALYZE_CONTEXT' })
  })
})
