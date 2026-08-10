import { describe, expect, it } from 'vitest'
import { artifactPlanSchema, compactArtifactPlan, compactArtifactPlanSchema } from './artifact-plan-schema'
import { resolveOutcomeBrief } from './outcome-brief-resolver'

function makePlan(status: 'ready' | 'ready_with_assumptions' | 'needs_clarification' | 'unsupported') {
  const resolved = resolveOutcomeBrief({
    schemaVersion: '1', rawRequest: 'Prepare an internal business review',
    audience: { scope: 'internal' }, delivery: { form: 'report' }
  })
  return {
    schemaVersion: '1' as const,
    briefHash: resolved.briefHash,
    status,
    sourceKind: 'tabular' as const,
    resolvedBrief: resolved.resolvedBrief,
    assumptions: status === 'ready' ? [] : resolved.assumptions,
    form: status === 'unsupported' ? null : 'report' as const,
    renderer: status === 'unsupported' ? null : 'report' as const,
    pattern: status === 'unsupported' ? null : 'business-overview',
    structureRoles: status === 'unsupported' ? [] : ['summary', 'evidence', 'detail'],
    densityBudget: { level: 'standard' as const, maxSections: 6, maxPrimaryVisuals: 4 },
    qualityGates: ['evidence_validation', 'catalog_compliance'] as const,
    formats: status === 'unsupported' ? [] : ['html'] as const,
    selectionReasons: [{ code: 'explicit_report', message: 'The requested form is report.' }],
    warnings: [],
    clarification: status === 'needs_clarification' ? {
      field: 'delivery.form', question: 'Will this be presented or read?',
      options: ['Present it', 'Read it'], reasonCode: 'ambiguous_delivery', blocking: true
    } : null
  }
}

describe('artifact plan schemas', () => {
  it.each(['ready', 'ready_with_assumptions', 'needs_clarification', 'unsupported'] as const)(
    'validates a %s plan and its compact projection', status => {
      const full = artifactPlanSchema.parse(makePlan(status))
      expect(compactArtifactPlanSchema.safeParse(compactArtifactPlan(full)).success).toBe(true)
    }
  )

  it('allows future infographic plans without claiming a V1 renderer', () => {
    const input = makePlan('unsupported')
    expect(artifactPlanSchema.parse({ ...input, form: 'infographic' }).form).toBe('infographic')
  })

  it('permits at most one clarification by construction', () => {
    const input = makePlan('needs_clarification')
    expect(artifactPlanSchema.safeParse({ ...input, clarification: [input.clarification] }).success).toBe(false)
  })

  it('rejects clarification state without a question', () => {
    expect(artifactPlanSchema.safeParse({
      ...makePlan('needs_clarification'), clarification: null
    }).success).toBe(false)
  })

  it('keeps compact plans below 2KB without raw requests or full context payloads', () => {
    const compact = compactArtifactPlan(artifactPlanSchema.parse(makePlan('ready_with_assumptions')))
    const serialized = JSON.stringify(compact)
    expect(Buffer.byteLength(serialized)).toBeLessThan(2048)
    expect(serialized).not.toContain('rawRequest')
    expect(serialized).not.toContain('resolvedBrief')
    expect(compact).not.toHaveProperty('catalog')
    expect(compact).not.toHaveProperty('evidence')
    expect(compact).not.toHaveProperty('evidenceRows')
  })
})
