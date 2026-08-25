import { describe, expect, it } from 'vitest'
import { periodOutcomeBriefSchema } from './period-outcome-schema'
import { reportReviewSchema } from './report-review'

const outcome = {
  schemaVersion: 1 as const,
  period: '2026-08', baselineRunId: '2026-07', noMaterialChange: false,
  outcomes: [{
    id: 'metric:total:revenue', classification: 'favorable' as const,
    evidenceId: 'total', metric: 'revenue', label: 'Revenue', previous: 100,
    current: 120, absolute: 20, percent: 0.2,
    materiality: { matchedAbsolute: false, matchedPercent: true }, evidenceRefs: ['total']
  }],
  goals: [], rankings: [], anomalies: { added: [], removed: [] }, warnings: [], recommendations: []
}

describe('period outcome contracts', () => {
  it('parses an evidence-backed outcome and review', () => {
    expect(periodOutcomeBriefSchema.parse(outcome)).toEqual(outcome)
    expect(reportReviewSchema.parse({
      schemaVersion: 1, status: 'ready', reasons: [], materialChanges: 1, warnings: 0, blockingIssues: 0
    })).toMatchObject({ status: 'ready' })
  })

  it('rejects factual outcomes without evidence references', () => {
    const invalid = structuredClone(outcome) as any
    invalid.outcomes[0].evidenceRefs = []
    expect(periodOutcomeBriefSchema.safeParse(invalid).success).toBe(false)
  })

  it('keeps recommendations distinct and evidence-backed', () => {
    const valid = structuredClone(outcome) as any
    valid.recommendations = [{ id: 'action:1', text: 'Review pricing', evidenceRefs: ['total'] }]
    expect(periodOutcomeBriefSchema.parse(valid).recommendations).toHaveLength(1)
    valid.recommendations[0].evidenceRefs = []
    expect(periodOutcomeBriefSchema.safeParse(valid).success).toBe(false)
  })

  it('rejects unstable empty identifiers', () => {
    const invalid = structuredClone(outcome) as any
    invalid.outcomes[0].id = ''
    expect(periodOutcomeBriefSchema.safeParse(invalid).success).toBe(false)
  })
})
