import { describe, expect, it } from 'vitest'
import {
  artifactPlanV2Schema, compactArtifactPlanV2, compactArtifactPlanV2Schema,
  type ArtifactPlanV2
} from './artifact-plan-v2-schema'
import { artifactPlanSchema, parseReadableArtifactPlan } from './artifact-plan-schema'
import { resolveOutcomeBrief } from './outcome-brief-resolver'

const hash = 'a'.repeat(64)

function makePlan(status: ArtifactPlanV2['status'], adapter: 'report-scene' | 'report-template' | 'deck-pattern' = 'report-scene') {
  const resolved = resolveOutcomeBrief({
    schemaVersion: '1', rawRequest: 'Plan a business artifact', delivery: { form: 'report' }
  })
  const executable = status === 'ready' || status === 'ready_with_assumptions'
  const target = adapter === 'deck-pattern'
    ? { adapter, id: 'executive-brief' as const }
    : { adapter, id: adapter === 'report-scene' ? 'business-overview' : 'executive-overview' }
  return {
    schemaVersion: '2' as const,
    briefHash: resolved.briefHash,
    contextHash: hash,
    status,
    nextAction: status === 'needs_clarification' ? 'clarify' as const
      : status === 'unsupported' ? 'stop' as const : 'instantiate' as const,
    sourceKind: 'tabular' as const,
    resolvedBrief: resolved.resolvedBrief,
    assumptions: status === 'ready_with_assumptions' ? resolved.assumptions : [],
    form: status === 'unsupported' ? null : adapter === 'deck-pattern' ? 'presentation' as const : 'report' as const,
    renderer: status === 'unsupported' ? null : adapter === 'deck-pattern' ? 'deck' as const : 'report' as const,
    target: executable ? target : null,
    structureRoles: executable ? ['summary'] : [],
    densityBudget: { level: 'standard' as const, maxSections: 7, maxPrimaryVisuals: 5 },
    qualityGates: ['evidence_validation', 'catalog_compliance'] as const,
    formats: executable ? ['html' as const] : [],
    selectionReasons: [{ code: 'test_route', message: 'Test route.' }],
    warnings: [],
    clarification: status === 'needs_clarification' ? {
      field: 'delivery.form', question: 'Present or read?', options: ['Present', 'Read'],
      reasonCode: 'ambiguous_form', blocking: true
    } : null
  }
}

describe('Artifact Plan V2 schemas', () => {
  it.each(['ready', 'ready_with_assumptions', 'needs_clarification', 'unsupported'] as const)(
    'validates %s state invariants', status => {
      expect(artifactPlanV2Schema.safeParse(makePlan(status)).success).toBe(true)
    }
  )

  it.each(['report-scene', 'report-template', 'deck-pattern'] as const)(
    'accepts the %s adapter', adapter => {
      expect(artifactPlanV2Schema.safeParse(makePlan('ready', adapter)).success).toBe(true)
    }
  )

  it('rejects unknown adapters and invalid state/action combinations', () => {
    expect(artifactPlanV2Schema.safeParse({
      ...makePlan('ready'), target: { adapter: 'report-pattern', id: 'x' }
    }).success).toBe(false)
    expect(artifactPlanV2Schema.safeParse({
      ...makePlan('ready'), nextAction: 'clarify'
    }).success).toBe(false)
    expect(artifactPlanV2Schema.safeParse({
      ...makePlan('unsupported'), target: { adapter: 'report-scene', id: 'x' }
    }).success).toBe(false)
  })

  it('keeps compact V2 independently valid and below 2KB', () => {
    const compact = compactArtifactPlanV2(artifactPlanV2Schema.parse(makePlan('ready_with_assumptions')))
    expect(compactArtifactPlanV2Schema.safeParse(compact).success).toBe(true)
    const serialized = JSON.stringify(compact)
    expect(Buffer.byteLength(serialized)).toBeLessThan(2048)
    expect(serialized).not.toContain('resolvedBrief')
    expect(serialized).not.toContain('rawRequest')
    expect(compact).not.toHaveProperty('catalog')
    expect(compact).not.toHaveProperty('evidence')
  })

  it('reads V1 as non-executable and V2 as executable', () => {
    const { contextHash: _contextHash, nextAction: _nextAction, target: _target, ...common } = makePlan('ready')
    const v1 = artifactPlanSchema.parse({
      ...common, schemaVersion: '1', pattern: 'business-overview'
    })
    expect(parseReadableArtifactPlan(v1)).toMatchObject({ schemaVersion: '1', executable: false })
    expect(parseReadableArtifactPlan(makePlan('ready'))).toMatchObject({ schemaVersion: '2', executable: true })
  })
})
