import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { fingerprintAnalyzeContext } from './analyze-context-fingerprint'
import { instantiateArtifactPlan } from './artifact-instantiator'
import { artifactPlanSchema } from './artifact-plan-schema'
import { planArtifact } from './artifact-planner'
import { verifyArtifact } from './artifact-verifier'
import { resolveOutcomeBrief } from './outcome-brief-resolver'
import type { LoadedDataset } from './types'

function dataset(): LoadedDataset {
  return {
    file: 'sales.csv', columns: ['month', 'region', 'sales'], rows: [
      { month: '2026-01-01', region: 'East', sales: 10 },
      { month: '2026-02-01', region: 'West', sales: 20 },
      { month: '2026-03-01', region: 'East', sales: 30 }
    ]
  }
}

function setup(form: 'report' | 'presentation' = 'report', templateOnly = false) {
  const data = dataset()
  const context = analyzeDataset(data, { intent: 'Review sales performance' })
  if (templateOnly) context.catalog.scenes = []
  const plan = planArtifact(resolveOutcomeBrief({
    schemaVersion: '1', rawRequest: `Create a ${form}`, delivery: { form }
  }), context)
  const instantiated = instantiateArtifactPlan(plan, context)
  if ('ok' in instantiated) throw new Error(instantiated.message)
  return { data, context, plan, spec: instantiated.spec }
}

describe('verifyArtifact', () => {
  it.each([
    ['report scene', 'report', false, 'report-scene', 'verified'],
    ['report template', 'report', true, 'report-template', 'needs_repair'],
    ['deck pattern', 'presentation', false, 'deck-pattern', 'verified']
  ] as const)('checks %s through existing validators', (_label, form, templateOnly, adapter, status) => {
    const input = setup(form, templateOnly)
    const result = verifyArtifact({ ...input, dataset: input.data })
    expect('ok' in result ? result.ok : true).toBe(true)
    if ('ok' in result) return
    expect(result.status).toBe(status)
    expect(result.adapter).toBe(adapter)
    expect(result.renderReadiness.ready).toBe(status === 'verified')
    expect(result.evidenceCoverage).toBeDefined()
  })

  it('returns structured repair hints without changing an invalid Spec', () => {
    const input = setup()
    const spec = structuredClone(input.spec) as any
    const encoding = Object.values(spec.charts[0].encoding)[0] as { field: string }
    encoding.field = 'missing_field'
    const before = structuredClone(spec)
    const result = verifyArtifact({ ...input, dataset: input.data, spec })
    expect('ok' in result ? result.ok : true).toBe(true)
    if ('ok' in result) return
    expect(result.status).toBe('needs_repair')
    expect(result.renderReadiness.ready).toBe(false)
    expect(result.repairHints[0]).toMatchObject({ code: 'FIELD_NOT_FOUND' })
    expect(spec).toEqual(before)
  })

  it('rejects cross-kind Specs', () => {
    const report = setup('report')
    const deck = setup('presentation')
    expect(verifyArtifact({ ...report, dataset: report.data, spec: deck.spec }))
      .toMatchObject({ ok: false, code: 'SPEC_KIND_MISMATCH' })
  })

  it('blocks stale Context and schema-incompatible data', () => {
    const input = setup()
    const stale = structuredClone(input.context)
    stale.fields[0].role = 'measure'
    expect(verifyArtifact({ ...input, context: stale, dataset: input.data })).toMatchObject({
      status: 'blocked', renderReadiness: { blockingCodes: ['PLAN_CONTEXT_MISMATCH'] }
    })
    const changedData = { ...input.data, columns: [...input.data.columns, 'profit'], rows: input.data.rows.map(row => ({ ...row, profit: 1 })) }
    expect(verifyArtifact({ ...input, dataset: changedData })).toMatchObject({
      status: 'blocked', renderReadiness: { blockingCodes: ['DATA_CONTEXT_MISMATCH'] }
    })
  })

  it('blocks a Catalog target that became unavailable without fallback', () => {
    const input = setup()
    const id = input.plan.target!.id
    input.context.catalog.scenes = input.context.catalog.scenes?.filter(item => item.id !== id)
    input.context.catalog.blockedScenes = [...(input.context.catalog.blockedScenes ?? []), { id, reason: 'blocked' }]
    input.plan.contextHash = fingerprintAnalyzeContext(input.context)
    expect(verifyArtifact({ ...input, dataset: input.data })).toMatchObject({
      status: 'blocked', renderReadiness: { blockingCodes: ['ARTIFACT_TARGET_BLOCKED'] }
    })
  })

  it('rejects V1 plans and invalid plans', () => {
    const input = setup()
    const v1 = artifactPlanSchema.parse({
      schemaVersion: '1', briefHash: input.plan.briefHash, status: 'ready', sourceKind: 'tabular',
      resolvedBrief: input.plan.resolvedBrief, assumptions: [], form: 'report', renderer: 'report',
      pattern: input.plan.target?.id, structureRoles: input.plan.structureRoles,
      densityBudget: input.plan.densityBudget, qualityGates: input.plan.qualityGates,
      formats: input.plan.formats, selectionReasons: input.plan.selectionReasons,
      warnings: [], clarification: null
    })
    expect(verifyArtifact({ ...input, dataset: input.data, plan: v1 }))
      .toMatchObject({ ok: false, code: 'PLAN_NOT_EXECUTABLE' })
    expect(verifyArtifact({ ...input, dataset: input.data, plan: {} }))
      .toMatchObject({ ok: false, code: 'INVALID_ARTIFACT_PLAN' })
  })

  it('is deterministic and does not render or write output', () => {
    const input = setup('presentation')
    expect(verifyArtifact({ ...input, dataset: input.data })).toEqual(verifyArtifact({ ...input, dataset: input.data }))
  })
})
