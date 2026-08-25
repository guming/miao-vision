import { describe, expect, it } from 'vitest'
import { evaluateReportReview } from './report-review'
import type { PeriodOutcomeBrief } from './period-outcome-schema'

const base = (): PeriodOutcomeBrief => ({
  schemaVersion: 1, period: '2026-08', baselineRunId: '2026-07', noMaterialChange: true,
  outcomes: [], goals: [], rankings: [], anomalies: { added: [], removed: [] }, warnings: [], recommendations: []
})

describe('report review evaluation', () => {
  it('returns ready for a clean brief and an expected first-run baseline warning', () => {
    expect(evaluateReportReview(base()).status).toBe('ready')
    const first = base()
    first.baselineRunId = null
    first.warnings = [{ code: 'NO_BASELINE', message: 'no successful baseline run' }]
    expect(evaluateReportReview(first).status).toBe('ready')
  })

  it.each([
    ['adverse', (brief: PeriodOutcomeBrief) => brief.outcomes.push({
      id: 'metric:total:sales', classification: 'adverse', evidenceId: 'total', metric: 'sales', label: 'Sales',
      previous: 100, current: 80, absolute: -20, percent: -0.2,
      materiality: { matchedAbsolute: false, matchedPercent: true }, evidenceRefs: ['total']
    })],
    ['anomaly', (brief: PeriodOutcomeBrief) => brief.anomalies.added.push('quality:new')],
    ['ranking entry', (brief: PeriodOutcomeBrief) => brief.rankings.push({
      id: 'ranking:region:A', evidenceId: 'region', item: 'A', kind: 'entered',
      previousRank: null, currentRank: 1, movement: null, evidenceRefs: ['region']
    })],
    ['unavailable comparison', (brief: PeriodOutcomeBrief) => brief.warnings.push({
      code: 'EVIDENCE_NOT_COMPARABLE', message: 'recipe changed', evidenceId: 'total'
    })]
  ])('returns needs_review for %s', (_name, mutate) => {
    const brief = base()
    mutate(brief)
    expect(evaluateReportReview(brief).status).toBe('needs_review')
  })

  it('returns blocked for blocking failures and deduplicates reasons', () => {
    const reason = { code: 'CLAIM_UNVERIFIED', message: 'Claim failed verification.', evidenceRefs: ['total'] }
    const review = evaluateReportReview(base(), [reason, reason])
    expect(review).toMatchObject({ status: 'blocked', blockingIssues: 1 })
    expect(review.reasons).toHaveLength(1)
  })
})
