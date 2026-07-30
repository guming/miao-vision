import type { AgentInsight } from './types'
import type { MetricCandidate } from './context-schema'

export function insightTotal(measure: string): AgentInsight {
  const value = `$evidence:total.values.total_${measure}`
  return {
    type: 'total',
    text: `Total ${measure}: ${value}`,
    evidence: ['total'], derivedFrom: ['total'], check: 'evidence_ref_exists',
    provenance: {
      evidence: ['total'], derivedFrom: [value], check: 'value_match',
      claimArgs: { value, expected: value }
    }
  }
}

export function insightTrend(
  timeField: string,
  measure: string,
  candidate?: MetricCandidate
): AgentInsight | null {
  const text = `${measure} trend (by ${timeField}): ` +
    `from $evidence:by_time.rows[0].total_${measure} ` +
    `to $evidence:by_time.rows[last].total_${measure}`
  const insight: AgentInsight = {
    type: 'trend',
    text,
    evidence: ['by_time'], derivedFrom: ['by_time'], check: 'evidence_ref_exists',
    provenance: {
      evidence: ['by_time'],
      derivedFrom: [
        `$evidence:by_time.rows[0].total_${measure}`,
        `$evidence:by_time.rows[last].total_${measure}`
      ],
      check: 'trend_periods',
      claimArgs: { series: '$evidence:by_time.rows', valueField: `total_${measure}`, minimumPeriods: 3 }
    }
  }

  if (candidate?.value !== undefined) {
    const pct = Math.abs(candidate.value * 100).toFixed(1)
    const direction = candidate.value > 0 ? 'increased' : candidate.value < 0 ? 'decreased' : 'unchanged'
    const suffix = candidate.value !== 0
      ? `. Period-over-period ${direction} ${pct}%`
      : '. Period-over-period unchanged'
    insight.text += suffix
  }

  return insight
}

export function insightTopN(
  dimension: string,
  measure: string,
  topN: number
): AgentInsight {
  const subject = `$evidence:by_dimension.rows[0].${dimension}`
  const value = `$evidence:by_dimension.rows[0].total_${measure}`
  return {
    type: 'rank',
    text: `Top ${topN} ${dimension} by ${measure}: ` +
      `${subject} at ${value}`,
    evidence: ['by_dimension'], derivedFrom: ['by_dimension'], check: 'rank_position',
    provenance: {
      evidence: ['by_dimension'],
      derivedFrom: [subject, value],
      check: 'rank_position',
      claimArgs: {
        rows: '$evidence:by_dimension.rows', subjectField: dimension,
        valueField: `total_${measure}`, subject, expectedRank: 1, order: 'desc'
      }
    }
  }
}

export function insightPeriodChange(candidate: MetricCandidate): AgentInsight | null {
  if (candidate.value === undefined) return null
  const measure = candidate.id.replace(/^period_change_/, '')
  const valueField = `total_${measure}`
  const pct = Math.abs(candidate.value * 100).toFixed(1)
  const direction = candidate.value > 0 ? 'increased' : candidate.value < 0 ? 'decreased' : 'unchanged'
  return {
    type: 'delta',
    text: candidate.value !== 0
      ? `${candidate.label}: ${direction} ${pct}%`
      : `${candidate.label}: unchanged`,
    evidence: ['by_time'], derivedFrom: ['by_time'], check: 'delta_formula',
    provenance: {
      evidence: ['by_time'],
      derivedFrom: [
        `$evidence:by_time.rows[penultimate].${valueField}`,
        `$evidence:by_time.rows[last].${valueField}`
      ],
      check: 'delta_formula',
      claimArgs: {
        from: `$evidence:by_time.rows[penultimate].${valueField}`,
        to: `$evidence:by_time.rows[${'last'}].${valueField}`,
        mode: 'percent',
        expected: candidate.value
      }
    }
  }
}
