import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { fingerprintAnalyzeContext } from './analyze-context-fingerprint'
import { instantiateArtifactPlan } from './artifact-instantiator'
import { artifactPlanSchema } from './artifact-plan-schema'
import { compactArtifactPlanV2 } from './artifact-plan-v2-schema'
import { planArtifact } from './artifact-planner'
import { deckSpecSchema } from './deck-schema'
import { resolveOutcomeBrief } from './outcome-brief-resolver'
import { reportSpecSchema } from './spec-schema'

function context() {
  return analyzeDataset({
    file: 'sales.csv', columns: ['month', 'region', 'sales'], rows: [
      { month: '2026-01-01', region: 'East', sales: 10 },
      { month: '2026-02-01', region: 'West', sales: 20 },
      { month: '2026-03-01', region: 'East', sales: 30 }
    ]
  }, { intent: 'Review sales performance' })
}

function plan(form: 'report' | 'presentation' = 'report', ctx = context()) {
  return planArtifact(resolveOutcomeBrief({
    schemaVersion: '1', rawRequest: `Create a ${form}`, delivery: { form }
  }), ctx)
}

describe('instantiateArtifactPlan', () => {
  it('instantiates report scenes through the existing registry', () => {
    const ctx = context()
    const result = instantiateArtifactPlan(plan('report', ctx), ctx)
    expect('ok' in result ? result.ok : true).toBe(true)
    if ('ok' in result) return
    expect(result.adapter).toBe('report-scene')
    expect(reportSpecSchema.safeParse(result.spec).success).toBe(true)
    expect(result.appliedConstraints).toContain('catalog-compliance')
    expect(result.deferredConstraints).toContain('density-budget')
  })

  it('instantiates report templates through the existing registry', () => {
    const ctx = context()
    ctx.catalog.scenes = []
    const artifactPlan = plan('report', ctx)
    expect(artifactPlan.target?.adapter).toBe('report-template')
    const result = instantiateArtifactPlan(artifactPlan, ctx)
    expect('ok' in result ? result.ok : true).toBe(true)
    if ('ok' in result) return
    expect(result.adapter).toBe('report-template')
    expect(reportSpecSchema.safeParse(result.spec).success).toBe(true)
  })

  it('instantiates deck patterns through the existing registry', () => {
    const ctx = context()
    const result = instantiateArtifactPlan(plan('presentation', ctx), ctx)
    expect('ok' in result ? result.ok : true).toBe(true)
    if ('ok' in result) return
    expect(result.adapter).toBe('deck-pattern')
    expect(deckSpecSchema.safeParse(result.spec).success).toBe(true)
  })

  it('accepts compact V2 plans and remains deterministic', () => {
    const ctx = context()
    const compact = compactArtifactPlanV2(plan('report', ctx))
    expect(instantiateArtifactPlan(compact, ctx)).toEqual(instantiateArtifactPlan(compact, ctx))
  })

  it('rejects V1, invalid, blocked-status, confirmation, and stale plans', () => {
    const ctx = context()
    const v2 = plan('report', ctx)
    const v1 = artifactPlanSchema.parse({
      schemaVersion: '1', briefHash: v2.briefHash, status: 'ready', sourceKind: 'tabular',
      resolvedBrief: v2.resolvedBrief, assumptions: [], form: 'report', renderer: 'report',
      pattern: v2.target?.id, structureRoles: v2.structureRoles, densityBudget: v2.densityBudget,
      qualityGates: v2.qualityGates, formats: v2.formats,
      selectionReasons: v2.selectionReasons, warnings: [], clarification: null
    })
    expect(instantiateArtifactPlan(v1, ctx)).toMatchObject({ ok: false, code: 'PLAN_NOT_EXECUTABLE' })
    expect(instantiateArtifactPlan({}, ctx)).toMatchObject({ ok: false, code: 'INVALID_ARTIFACT_PLAN' })
    expect(instantiateArtifactPlan({
      ...v2, status: 'needs_clarification', nextAction: 'clarify', target: null,
      clarification: { field: 'delivery.form', question: 'Which?', options: ['A', 'B'], reasonCode: 'x', blocking: true }
    }, ctx)).toMatchObject({ ok: false, code: 'PLAN_STATUS_BLOCKED' })
    expect(instantiateArtifactPlan({ ...v2, nextAction: 'confirm' }, ctx))
      .toMatchObject({ ok: false, code: 'PLAN_CONFIRMATION_REQUIRED' })
    expect(instantiateArtifactPlan({ ...v2, contextHash: 'b'.repeat(64) }, ctx))
      .toMatchObject({ ok: false, code: 'PLAN_CONTEXT_MISMATCH' })
  })

  it('allows an explicitly confirmed plan', () => {
    const ctx = context()
    const result = instantiateArtifactPlan({ ...plan('report', ctx), nextAction: 'confirm' }, ctx, { confirmPlan: true })
    expect('ok' in result ? result.ok : true).toBe(true)
  })

  it('rejects blocked and unavailable targets without fallback', () => {
    const blockedContext = context()
    const blockedPlan = plan('report', blockedContext)
    const id = blockedPlan.target!.id
    blockedContext.catalog.scenes = blockedContext.catalog.scenes?.filter(item => item.id !== id)
    blockedContext.catalog.blockedScenes = [
      ...(blockedContext.catalog.blockedScenes ?? []), { id, reason: 'blocked for test' }
    ]
    blockedPlan.contextHash = fingerprintAnalyzeContext(blockedContext)
    expect(instantiateArtifactPlan(blockedPlan, blockedContext))
      .toMatchObject({ ok: false, code: 'PLAN_TARGET_BLOCKED' })

    const unavailableContext = context()
    const unavailablePlan = plan('report', unavailableContext)
    unavailableContext.catalog.scenes = []
    unavailableContext.catalog.blockedScenes = []
    unavailablePlan.contextHash = fingerprintAnalyzeContext(unavailableContext)
    expect(instantiateArtifactPlan(unavailablePlan, unavailableContext))
      .toMatchObject({ ok: false, code: 'PLAN_TARGET_UNAVAILABLE' })
  })
})
