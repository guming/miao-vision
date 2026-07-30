import { validateProvenance, type ProvenanceCoverage, type ProvenanceValidation } from './provenance-validator'
import type { AnalyzeContext } from './context-schema'
import type { AgentChartSpec } from './types'
import type { DeckSpec } from './deck-types'

export function validateDeckProvenance(spec: DeckSpec, context: AnalyzeContext): ProvenanceValidation {
  const results = spec.slides.map((slide, slideIndex) => {
    const metricCharts: AgentChartSpec[] = (slide.metrics ?? []).map((metric, metricIndex) => {
      const aggregate = metric.data?.transform?.find(transform => transform.type === 'aggregate')
      const valueField = aggregate?.measures?.[0]?.as ?? `metric-${metricIndex + 1}`
      return {
        id: `slide-${slideIndex + 1}-metric-${metricIndex + 1}`,
        type: 'bigvalue',
        title: metric.label,
        data: metric.data,
        encoding: { value: { field: valueField, type: 'quantitative' } },
        provenance: metric.provenance
      }
    })
    return validateProvenance({
      title: slide.title,
      charts: [...metricCharts, ...(slide.charts ?? [])]
    }, context)
  })
  return {
    coverage: combineCoverage(results.map(result => result.coverage)),
    issues: results.flatMap((result, slideIndex) => result.issues.map(issue => ({
      ...issue,
      message: `slides[${slideIndex}]: ${issue.message}`,
      payload: { ...issue.payload, slideIndex }
    })))
  }
}

function combineCoverage(items: ProvenanceCoverage[]): ProvenanceCoverage {
  const eligibleObjects = sum(items, 'eligibleObjects')
  const coveredObjects = sum(items, 'coveredObjects')
  const requiredClaimChecks = sum(items, 'requiredClaimChecks')
  const passedClaimChecks = sum(items, 'passedClaimChecks')
  const byType = structuredClone(items[0]?.byType ?? {
    kpi: { eligible: 0, covered: 0 }, chart: { eligible: 0, covered: 0 },
    insight: { eligible: 0, covered: 0 }, annotation: { eligible: 0, covered: 0 },
    reference: { eligible: 0, covered: 0 }
  })
  for (const item of items.slice(1)) {
    for (const kind of Object.keys(byType) as Array<keyof typeof byType>) {
      byType[kind].eligible += item.byType[kind].eligible
      byType[kind].covered += item.byType[kind].covered
    }
  }
  return {
    objectCoverage: eligibleObjects ? coveredObjects / eligibleObjects : 1,
    claimCheckCoverage: requiredClaimChecks ? passedClaimChecks / requiredClaimChecks : 1,
    eligibleObjects, coveredObjects, requiredClaimChecks, passedClaimChecks,
    invalidReferences: sum(items, 'invalidReferences'),
    failedClaimChecks: sum(items, 'failedClaimChecks'),
    empty: eligibleObjects === 0,
    byType
  }
}

function sum(items: ProvenanceCoverage[], key: keyof ProvenanceCoverage): number {
  return items.reduce((total, item) => total + Number(item[key]), 0)
}
