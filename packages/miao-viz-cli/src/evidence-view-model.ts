import { collectProvenanceObjects } from './provenance-normalize'
import type { AnalyzeContext, AnalyzeEvidence } from './context-schema'
import type { AgentReportSpec } from './types'
import type { ProvenanceCoverage } from './provenance-validator'

export interface EvidenceViewItem {
  key: string
  objectPath: string
  label: string
  kind: string
  evidenceIds: string[]
  derivedFrom: string[]
  check?: string
  query: string[]
  fields: string[]
  filters: string[]
  sampleSize?: number
  verified: boolean
  explanation: string
  scope: string
  verification: string
}

export interface EvidenceViewModel {
  verified: boolean
  coverage?: ProvenanceCoverage
  items: EvidenceViewItem[]
  appendix: Array<{ number: number; evidenceId: string; query: string; fields: string[]; sampleSize?: number }>
}

export function buildEvidenceViewModel(
  spec: AgentReportSpec,
  context?: AnalyzeContext,
  coverage?: ProvenanceCoverage
): EvidenceViewModel {
  if (!context) return { verified: false, coverage, items: [], appendix: [] }
  const objects = collectProvenanceObjects(spec)
  const evidenceNumber = new Map<string, number>()
  const items = objects.map((object, index): EvidenceViewItem => {
    const evidence = object.provenance.evidence
      .map(id => context.evidence.find(candidate => candidate.id === id))
      .filter((item): item is AnalyzeEvidence => Boolean(item))
    for (const item of evidence) {
      if (!evidenceNumber.has(item.id)) evidenceNumber.set(item.id, evidenceNumber.size + 1)
    }
    return {
      key: `evidence-object-${index + 1}`,
      objectPath: object.path,
      label: object.label,
      kind: object.kind,
      evidenceIds: evidence.map(item => item.id),
      derivedFrom: object.provenance.derivedFrom,
      check: object.provenance.check,
      query: evidence.map(item => item.query),
      fields: unique(evidence.flatMap(item => recipeFields(item))),
      filters: evidence.flatMap(item => (item.recipe?.filters ?? []).map(filter =>
        `${filter.field} ${filter.operator} ${String(filter.value)}`
      )),
      sampleSize: evidence.reduce((sum, item) => sum + evidenceSize(item), 0) || undefined,
      verified: Boolean(
        coverage?.objectCoverage === 1 &&
        coverage.claimCheckCoverage === 1 &&
        object.provenance.evidence.length
      ),
      explanation: explainEvidence(object.label, evidence),
      scope: explainScope(evidence),
      verification: explainVerification(object.provenance.check)
    }
  })
  const appendix = Array.from(evidenceNumber.entries()).map(([evidenceId, number]) => {
    const evidence = context.evidence.find(item => item.id === evidenceId)!
    return {
      number, evidenceId, query: evidence.query,
      fields: recipeFields(evidence),
      sampleSize: evidenceSize(evidence) || undefined
    }
  })
  return {
    verified: Boolean(coverage?.objectCoverage === 1 && coverage.claimCheckCoverage === 1),
    coverage, items, appendix
  }
}

function recipeFields(evidence: AnalyzeEvidence): string[] {
  return unique([
    ...(evidence.recipe?.groupBy ?? []),
    ...(evidence.recipe?.measures ?? []).map(measure => measure.field),
    ...(evidence.recipe?.filters ?? []).map(filter => filter.field)
  ])
}

function evidenceSize(evidence: AnalyzeEvidence): number {
  if (evidence.rows) return evidence.rows.length
  if (evidence.values) {
    const rowCount = Number(evidence.values.row_count)
    return Number.isFinite(rowCount) && rowCount >= 0 ? rowCount : 1
  }
  return 0
}

function explainEvidence(label: string, evidence: AnalyzeEvidence[]): string {
  const recipe = evidence[0]?.recipe
  const measure = recipe?.measures?.[0]
  const groups = recipe?.groupBy ?? []
  if (!measure) return `${label} is based on the referenced source records.`
  const operation = measure.operation === 'sum' ? 'sum'
    : measure.operation === 'avg' ? 'average'
      : measure.operation === 'count' ? 'count'
        : `${measure.operation}`
  return groups.length
    ? `Shows the ${operation} of ${measure.field}, grouped by ${groups.join(' and ')}.`
    : `Calculated as the ${operation} of ${measure.field}.`
}

function explainScope(evidence: AnalyzeEvidence[]): string {
  const sampleSize = evidence.reduce((sum, item) => sum + evidenceSize(item), 0)
  const filters = evidence.flatMap(item => item.recipe?.filters ?? [])
  const records = sampleSize ? `${sampleSize} source ${sampleSize === 1 ? 'result' : 'results'}` : 'the available source data'
  return filters.length
    ? `${records}, filtered by ${filters.map(filter => `${filter.field} ${filter.operator} ${String(filter.value)}`).join(', ')}.`
    : `${records}, with no additional evidence filters.`
}

function explainVerification(check: string | undefined): string {
  if (check === 'value_match') return 'Verified: the displayed value matches the source calculation.'
  if (check === 'rank_position') return 'Verified: the stated ranking matches the source ordering.'
  if (check === 'share_formula') return 'Verified: the stated share matches numerator ÷ denominator.'
  if (check === 'delta_formula') return 'Verified: the stated change matches the source periods.'
  if (check === 'trend_periods') return 'Verified: the trend uses enough periods and matches the source direction.'
  return 'Verified: the visualization uses the declared source data and calculation.'
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}
