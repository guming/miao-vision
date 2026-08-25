import type { EvidenceChangeSet, MetricChange } from './report-changes'
import type { ReportMetricProfile, ReportProfileV1 } from './report-profile'
import { periodOutcomeBriefSchema, type PeriodMetricOutcome, type PeriodOutcomeBrief } from './period-outcome-schema'

export function buildPeriodOutcomeBrief(options: {
  period: string
  changes: EvidenceChangeSet
  profile: ReportProfileV1
}): PeriodOutcomeBrief {
  const changesByMetric = new Map(options.changes.metrics.map(change => [metricKey(change.evidenceId, change.metric), change]))
  const outcomes: PeriodMetricOutcome[] = []
  const goals: PeriodOutcomeBrief['goals'] = []

  for (const metric of options.profile.metrics) {
    const change = changesByMetric.get(metricKey(metric.evidenceId, metric.metric))
    if (!change) continue
    if (metric.target !== undefined) goals.push(goalOutcome(metric, change))
    const matchedAbsolute = metric.materiality?.absolute !== undefined
      && Math.abs(change.absolute) >= metric.materiality.absolute
    const matchedPercent = metric.materiality?.percent !== undefined && change.percent !== null
      && Math.abs(change.percent) >= metric.materiality.percent
    if (!matchedAbsolute && !matchedPercent) continue
    outcomes.push({
      id: `metric:${metric.evidenceId}:${metric.metric}`,
      classification: classify(metric.desiredDirection, change.absolute),
      evidenceId: metric.evidenceId,
      metric: metric.metric,
      label: metric.label,
      previous: change.previous,
      current: change.current,
      absolute: change.absolute,
      percent: change.percent,
      materiality: { matchedAbsolute, matchedPercent },
      evidenceRefs: [metric.evidenceId]
    })
  }

  const brief: PeriodOutcomeBrief = {
    schemaVersion: 1,
    period: options.period,
    baselineRunId: options.changes.baselineRunId,
    noMaterialChange: outcomes.length === 0,
    outcomes: outcomes.sort((a, b) => a.id.localeCompare(b.id)),
    goals: goals.sort((a, b) => a.id.localeCompare(b.id)),
    rankings: options.changes.rankings.map(change => ({
      id: `ranking:${change.evidenceId}:${change.item}`,
      evidenceId: change.evidenceId,
      item: change.item,
      kind: change.kind,
      previousRank: change.previousRank,
      currentRank: change.currentRank,
      movement: change.movement,
      evidenceRefs: [change.evidenceId]
    })).sort((a, b) => a.id.localeCompare(b.id)),
    anomalies: {
      added: [...options.changes.anomalies.added].sort(),
      removed: [...options.changes.anomalies.removed].sort()
    },
    warnings: options.changes.notComparable.map(item => ({
      code: item.evidenceId === '*' ? 'NO_BASELINE' : 'EVIDENCE_NOT_COMPARABLE',
      message: item.reason, evidenceId: item.evidenceId === '*' ? undefined : item.evidenceId
    })).sort((a, b) => `${a.evidenceId ?? ''}:${a.message}`.localeCompare(`${b.evidenceId ?? ''}:${b.message}`)),
    recommendations: []
  }
  return periodOutcomeBriefSchema.parse(brief)
}

function metricKey(evidenceId: string, metric: string): string {
  return `${evidenceId}\u0000${metric}`
}

function classify(direction: ReportMetricProfile['desiredDirection'], absolute: number): PeriodMetricOutcome['classification'] {
  if (!direction || direction === 'neutral' || absolute === 0) return 'neutral'
  const favorable = direction === 'increase' ? absolute > 0 : absolute < 0
  return favorable ? 'favorable' : 'adverse'
}

function goalOutcome(metric: ReportMetricProfile, change: MetricChange): PeriodOutcomeBrief['goals'][number] {
  const target = metric.target as number
  const met = metric.desiredDirection === 'decrease'
    ? change.current <= target
    : metric.desiredDirection === 'neutral'
      ? change.current === target
      : change.current >= target
  return {
    id: `goal:${metric.evidenceId}:${metric.metric}`,
    evidenceId: metric.evidenceId,
    metric: metric.metric,
    label: metric.label,
    status: met ? 'met' : 'missed',
    current: change.current,
    target,
    evidenceRefs: [metric.evidenceId]
  }
}
