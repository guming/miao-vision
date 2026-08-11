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

function memoryArgs(action: string, flags: CliArgs['flags']): CliArgs {
  return { command: 'artifact', subcommand: 'memory', positional: [action], flags }
}

function fixtures(compact = false) {
  const root = mkdtempSync(join(tmpdir(), 'miao-artifact-plan-'))
  const briefPath = join(root, 'brief.json')
  const contextPath = join(root, 'context.json')
  const inputPath = join(root, 'sales.csv')
  writeFileSync(briefPath, JSON.stringify({
    schemaVersion: '1', rawRequest: '给老板开会看',
    delivery: { context: 'meeting', form: 'presentation', tone: 'executive' }
  }))
  const analyzed = analyzeDataset({
    file: 'sales.csv', columns: ['region', 'sales'],
    rows: [{ region: 'East', sales: 10 }, { region: 'West', sales: 20 }]
  })
  writeFileSync(inputPath, 'region,sales\nEast,10\nWest,20\n')
  writeFileSync(contextPath, JSON.stringify(compact ? toCompactAnalyzeContext(analyzed) : analyzed))
  return { root, briefPath, contextPath, inputPath }
}

describe('runArtifactCommand', () => {
  it('creates, inspects, updates, forgets, and clears confirmed project memory', () => {
    const fixture = fixtures()
    const memoryPath = join(fixture.root, 'miao-vision', 'outcome-memory.json')
    const proposalPath = join(fixture.root, 'proposal.json')
    writeFileSync(proposalPath, JSON.stringify({
      schemaVersion: '1', preferences: [{
        field: 'delivery.tone', value: 'executive', source: 'confirmed',
        updatedAt: '2026-08-11T10:00:00.000Z'
      }]
    }))
    expect(runArtifactCommand(memoryArgs('update', { memory: memoryPath, proposal: proposalPath })))
      .toMatchObject({ ok: false, code: 'MEMORY_CONFIRMATION_REQUIRED' })
    expect(() => readFileSync(memoryPath)).toThrow()

    expect(runArtifactCommand(memoryArgs('update', {
      memory: memoryPath, proposal: proposalPath, confirm: true
    }))).toMatchObject({ ok: true, value: { preferences: [{ field: 'delivery.tone' }] } })
    expect(runArtifactCommand(memoryArgs('inspect', { memory: memoryPath })))
      .toMatchObject({ ok: true, value: { preferences: [{ value: 'executive' }] } })
    expect(runArtifactCommand(memoryArgs('forget', {
      memory: memoryPath, field: 'delivery.tone', confirm: true
    }))).toMatchObject({ ok: true, value: { preferences: [] } })
    expect(runArtifactCommand(memoryArgs('forget', { memory: memoryPath, confirm: true })))
      .toMatchObject({ ok: true, value: { preferences: [] } })
  })

  it('rejects invalid proposals and memory actions without writing', () => {
    const fixture = fixtures()
    const memoryPath = join(fixture.root, 'memory.json')
    const proposalPath = join(fixture.root, 'proposal.json')
    writeFileSync(proposalPath, JSON.stringify({
      schemaVersion: '1', preferences: [{
        field: 'rawRequest', value: 'secret', source: 'explicit', updatedAt: '2026-08-11T10:00:00.000Z'
      }]
    }))
    expect(runArtifactCommand(memoryArgs('update', {
      memory: memoryPath, proposal: proposalPath, confirm: true
    }))).toMatchObject({ ok: false, code: 'INVALID_OUTCOME_MEMORY_PROPOSAL' })
    expect(() => readFileSync(memoryPath)).toThrow()
    expect(runArtifactCommand(memoryArgs('guess', { memory: memoryPath })))
      .toMatchObject({ ok: false, code: 'UNKNOWN_SUBCOMMAND' })
  })

  it('plans with explicit memory while current Brief values remain authoritative', () => {
    const fixture = fixtures()
    const memoryPath = join(fixture.root, 'memory.json')
    writeFileSync(memoryPath, JSON.stringify({
      schemaVersion: '1', createdAt: '2026-08-11T10:00:00.000Z', updatedAt: '2026-08-11T10:00:00.000Z',
      preferences: [
        { field: 'delivery.form', value: 'report', source: 'confirmed', updatedAt: '2026-08-11T10:00:00.000Z' },
        { field: 'delivery.tone', value: 'analytical', source: 'confirmed', updatedAt: '2026-08-11T10:00:00.000Z' }
      ]
    }))
    const remembered = runArtifactCommand(args({
      brief: fixture.briefPath, context: fixture.contextPath, memory: memoryPath, compact: true
    })) as any
    expect(remembered.value.form).toBe('presentation')
    expect(remembered.value.assumptions?.some((item: any) => item.field === 'delivery.tone')).not.toBe(true)
  })

  it('fails explicitly for missing or invalid memory', () => {
    const fixture = fixtures()
    expect(runArtifactCommand(args({
      brief: fixture.briefPath, context: fixture.contextPath, memory: join(fixture.root, 'missing.json')
    }))).toMatchObject({ ok: false, code: 'MEMORY_NOT_FOUND' })
    const invalid = join(fixture.root, 'invalid-memory.json')
    writeFileSync(invalid, '{}')
    expect(runArtifactCommand(args({
      brief: fixture.briefPath, context: fixture.contextPath, memory: invalid
    }))).toMatchObject({ ok: false, code: 'INVALID_OUTCOME_MEMORY' })
  })

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

  it('returns user-facing plan guidance without changing the underlying decision', () => {
    const fixture = fixtures()
    const full = runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any
    const summary = runArtifactCommand(args({
      brief: fixture.briefPath, context: fixture.contextPath, summary: true
    })) as any
    expect(summary).toMatchObject({
      ok: true, value: { state: 'proceed', form: full.value.form, locale: 'zh-CN' }
    })
    expect(JSON.stringify(summary.value)).not.toMatch(/briefHash|contextHash|adapter|catalog|rawRequest/)
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

  it('validates a planned Spec and writes full or compact Verification JSON', () => {
    for (const compact of [false, true]) {
      const fixture = fixtures(compact)
      const planned = runArtifactCommand(args({
        brief: fixture.briefPath, context: fixture.contextPath, ...(compact ? { compact: true } : {})
      })) as any
      const planPath = join(fixture.root, 'plan.json')
      const specPath = join(fixture.root, 'spec.yaml')
      const verificationPath = join(fixture.root, 'verification.json')
      writeFileSync(planPath, JSON.stringify(planned.value))
      const instantiated = runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')) as any
      writeFileSync(specPath, YAML.stringify(instantiated.value.spec))
      const result = runArtifactCommand(args({
        plan: planPath, context: fixture.contextPath, input: fixture.inputPath, spec: specPath,
        output: verificationPath, ...(compact ? { compact: true } : {})
      }, 'validate')) as any
      expect(result).toMatchObject({ ok: true, value: { output: verificationPath, status: 'verified' } })
      const written = JSON.parse(readFileSync(verificationPath, 'utf8'))
      expect(written.value.status).toBe('verified')
      if (compact) expect(written.value.checks[0]).not.toHaveProperty('message')
    }
  })

  it('returns repair and blocked verification states without treating them as CLI crashes', () => {
    const fixture = fixtures()
    const planned = runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any
    const planPath = join(fixture.root, 'plan.json')
    const specPath = join(fixture.root, 'spec.yaml')
    writeFileSync(planPath, JSON.stringify(planned.value))
    const instantiated = runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')) as any
    const spec = instantiated.value.spec
    const encoding = Object.values(spec.slides[1].charts[0].encoding)[0] as any
    encoding.field = 'missing_field'
    writeFileSync(specPath, YAML.stringify(spec))
    expect(runArtifactCommand(args({
      plan: planPath, context: fixture.contextPath, input: fixture.inputPath, spec: specPath
    }, 'validate'))).toMatchObject({ ok: true, value: { status: 'needs_repair' } })

    writeFileSync(planPath, JSON.stringify({ ...planned.value, contextHash: 'b'.repeat(64) }))
    expect(runArtifactCommand(args({
      plan: planPath, context: fixture.contextPath, input: fixture.inputPath, spec: specPath
    }, 'validate'))).toMatchObject({ ok: true, value: { status: 'blocked' } })
  })

  it('returns user-facing verification guidance with --summary', () => {
    const fixture = fixtures()
    const planned = runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any
    const planPath = join(fixture.root, 'plan.json')
    const specPath = join(fixture.root, 'spec.yaml')
    writeFileSync(planPath, JSON.stringify(planned.value))
    const instantiated = runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')) as any
    writeFileSync(specPath, YAML.stringify(instantiated.value.spec))
    const result = runArtifactCommand(args({
      plan: planPath, context: fixture.contextPath, input: fixture.inputPath,
      spec: specPath, summary: true
    }, 'validate')) as any
    expect(result).toMatchObject({ ok: true, value: { state: 'ready', locale: 'zh-CN' } })
    expect(JSON.stringify(result.value)).not.toMatch(/specHash|contextHash|adapter|targetId/)
  })

  it('rejects missing inputs, unreadable Specs, V1 plans, and output overwrites', () => {
    const fixture = fixtures()
    expect(runArtifactCommand(args({}, 'validate'))).toMatchObject({ ok: false, code: 'MISSING_FLAG' })
    const planned = runArtifactCommand(args({ brief: fixture.briefPath, context: fixture.contextPath })) as any
    const planPath = join(fixture.root, 'plan.json')
    writeFileSync(planPath, JSON.stringify(planned.value))
    expect(runArtifactCommand(args({
      plan: planPath, context: fixture.contextPath, input: fixture.inputPath, spec: '/missing/spec.yaml'
    }, 'validate'))).toMatchObject({ ok: false, code: 'ARTIFACT_SPEC_READ_FAILED' })

    const specPath = join(fixture.root, 'spec.yaml')
    const instantiated = runArtifactCommand(args({ plan: planPath, context: fixture.contextPath }, 'instantiate')) as any
    writeFileSync(specPath, YAML.stringify(instantiated.value.spec))
    expect(runArtifactCommand(args({
      plan: planPath, context: fixture.contextPath, input: fixture.inputPath, spec: specPath, output: specPath
    }, 'validate'))).toMatchObject({ ok: false, code: 'ARTIFACT_VERIFICATION_WRITE_FAILED' })
  })
})
