import { describe, expect, it } from 'vitest'
import { buildPeriodOutcomeBrief } from './period-outcome-builder'
import type { EvidenceChangeSet } from './report-changes'
import type { ReportProfileV1 } from './report-profile'

const changes = (previous: number, current: number): EvidenceChangeSet => ({
  schemaVersion: 1, baselineRunId: '2026-07',
  metrics: [{
    evidenceId: 'total', metric: 'revenue', previous, current,
    absolute: current - previous, percent: previous === 0 ? null : (current - previous) / Math.abs(previous)
  }],
  rankings: [], anomalies: { added: [], removed: [] }, notComparable: []
})

const profile = (overrides: Record<string, unknown> = {}): ReportProfileV1 => ({
  schemaVersion: 1,
  metrics: [{
    evidenceId: 'total', metric: 'revenue', label: 'Revenue',
    desiredDirection: 'increase', materiality: { percent: 0.1 }, ...overrides
  }]
}) as ReportProfileV1

describe('period outcome builder', () => {
  it('applies absolute and percentage thresholds with OR semantics', () => {
    const result = buildPeriodOutcomeBrief({
      period: '2026-08', changes: changes(100, 106),
      profile: profile({ materiality: { absolute: 5, percent: 0.1 } })
    })
    expect(result.outcomes[0]).toMatchObject({ classification: 'favorable', materiality: { matchedAbsolute: true, matchedPercent: false } })
  })

  it('uses an absolute threshold for a zero baseline', () => {
    const result = buildPeriodOutcomeBrief({
      period: '2026-08', changes: changes(0, 5),
      profile: profile({ materiality: { absolute: 5, percent: 0.1 } })
    })
    expect(result.outcomes[0]).toMatchObject({ percent: null, materiality: { matchedAbsolute: true, matchedPercent: false } })
  })

  it('handles negative baselines with finite percentages', () => {
    const result = buildPeriodOutcomeBrief({ period: '2026-08', changes: changes(-100, -80), profile: profile() })
    expect(result.outcomes[0].percent).toBe(0.2)
  })

  it('never labels a neutral metric favorable or adverse', () => {
    const result = buildPeriodOutcomeBrief({
      period: '2026-08', changes: changes(100, 120), profile: profile({ desiredDirection: 'neutral' })
    })
    expect(result.outcomes[0].classification).toBe('neutral')
  })

  it('creates goal results only for explicit targets', () => {
    const without = buildPeriodOutcomeBrief({ period: '2026-08', changes: changes(100, 120), profile: profile() })
    const withTarget = buildPeriodOutcomeBrief({
      period: '2026-08', changes: changes(100, 120), profile: profile({ target: 110 })
    })
    expect(without.goals).toEqual([])
    expect(withTarget.goals[0]).toMatchObject({ status: 'met', current: 120, target: 110 })
  })

  it('produces a valid no-material-change result deterministically', () => {
    const input = { period: '2026-08', changes: changes(100, 101), profile: profile() }
    const first = buildPeriodOutcomeBrief(input)
    const second = buildPeriodOutcomeBrief(input)
    expect(first).toMatchObject({ noMaterialChange: true, outcomes: [] })
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
