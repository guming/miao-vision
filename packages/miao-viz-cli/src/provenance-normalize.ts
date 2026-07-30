import { parseEvidenceRefs } from './directive-resolver'
import type {
  AgentChartAnnotation, AgentChartSpec, AgentInsight, AgentInsightCheck,
  AgentProvenance, AgentProvenanceExemption, AgentReferenceLayer, AgentReportSpec
} from './types'
import type { DeckClaimArgs } from './deck-types'

export type ProvenanceObjectKind = 'kpi' | 'chart' | 'insight' | 'annotation' | 'reference'

export interface NormalizedProvenance {
  evidence: string[]
  derivedFrom: string[]
  check?: AgentInsightCheck
  claimArgs?: DeckClaimArgs
  exemption?: AgentProvenanceExemption
}

export interface ProvenanceObject {
  kind: ProvenanceObjectKind
  id: string
  path: string
  label: string
  provenance: NormalizedProvenance
  requiredCheck?: AgentInsightCheck
  legacy: boolean
  fields: string[]
  aggregate?: {
    groupBy: string[]
    measures: Array<{ field: string; operation: string; alias: string }>
  }
}

const KPI_TYPES = new Set(['bigvalue', 'delta', 'progress', 'gauge', 'infographic-kpi'])

export function normalizeProvenance(value: AgentProvenance | undefined): NormalizedProvenance {
  if (typeof value === 'string') {
    const ref = parseEvidenceRefs(value)[0]
    return ref ? { evidence: [ref.id], derivedFrom: [ref.raw] } : { evidence: [], derivedFrom: [] }
  }
  return {
    evidence: unique(value?.evidence ?? []),
    derivedFrom: unique(value?.derivedFrom ?? []),
    check: value?.check,
    claimArgs: value?.claimArgs,
    exemption: value?.exemption
  }
}

export function collectProvenanceObjects(spec: AgentReportSpec): ProvenanceObject[] {
  return [
    ...spec.charts.flatMap((chart, index) => chartObjects(chart, index)),
    ...(spec.insights ?? []).flatMap((insight, index) => insightObject(insight, index))
  ]
}

function chartObjects(chart: AgentChartSpec, index: number): ProvenanceObject[] {
  const id = chart.id ?? `chart-${index + 1}`
  const kind = KPI_TYPES.has(chart.type) ? 'kpi' : 'chart'
  const main = normalizeProvenance(chart.provenance)
  const titleRefs = parseEvidenceRefs(chart.title ?? '')
  mergeRefs(main, titleRefs)
  const requiredCheck = kind === 'kpi' ? 'value_match' : claimCheckForText(chart.title ?? '')
  const objects: ProvenanceObject[] = [{
    kind, id, path: `charts[${index}]`, label: chart.title ?? id,
    provenance: main, requiredCheck, legacy: chart.provenance === undefined,
    fields: chartFields(chart),
    aggregate: chartAggregate(chart)
  }]
  for (let annotationIndex = 0; annotationIndex < (chart.annotations?.length ?? 0); annotationIndex++) {
    objects.push(childObject(chart.annotations![annotationIndex], 'annotation', id, index, annotationIndex))
  }
  for (let referenceIndex = 0; referenceIndex < (chart.references?.length ?? 0); referenceIndex++) {
    objects.push(childObject(chart.references![referenceIndex], 'reference', id, index, referenceIndex))
  }
  return objects
}

function childObject(
  value: AgentChartAnnotation | AgentReferenceLayer,
  kind: 'annotation' | 'reference',
  chartId: string,
  chartIndex: number,
  childIndex: number
): ProvenanceObject {
  const provenance = normalizeProvenance(value.provenance)
  if (value.evidence) {
    const refs = parseEvidenceRefs(value.evidence)
    if (refs.length) mergeRefs(provenance, refs)
    else provenance.evidence = unique([...provenance.evidence, value.evidence])
  }
  const text = 'text' in value ? value.text : value.label ?? ''
  mergeRefs(provenance, parseEvidenceRefs(text))
  return {
    kind,
    id: `${chartId}:${kind}-${childIndex + 1}`,
    path: `charts[${chartIndex}].${kind === 'annotation' ? 'annotations' : 'references'}[${childIndex}]`,
    label: text || `${kind} ${childIndex + 1}`,
    provenance,
    requiredCheck: claimCheckForText(text),
    legacy: value.provenance === undefined,
    fields: []
  }
}

function insightObject(insight: AgentInsight, index: number): ProvenanceObject[] {
  if (typeof insight === 'string') {
    const provenance = normalizeProvenance(undefined)
    mergeRefs(provenance, parseEvidenceRefs(insight))
    return isExplanatoryText(insight) && provenance.evidence.length === 0 ? [] : [{
      kind: 'insight', id: `insight-${index + 1}`, path: `insights[${index}]`, label: insight,
      provenance, requiredCheck: claimCheckForText(insight), legacy: true, fields: []
    }]
  }
  const provenance = normalizeProvenance(insight.provenance)
  const legacy = insight.provenance === undefined
  if (legacy) {
    provenance.evidence = unique([...provenance.evidence, ...(insight.evidence ?? [])])
    provenance.derivedFrom = unique([...provenance.derivedFrom, ...(insight.derivedFrom ?? [])])
    provenance.check = insight.check
    provenance.claimArgs = insight.claimArgs
  }
  mergeRefs(provenance, parseEvidenceRefs(insight.text))
  return [{
    kind: 'insight', id: `insight-${index + 1}`, path: `insights[${index}]`, label: insight.text,
    provenance, requiredCheck: requiredInsightCheck(insight.type, insight.text),
    legacy, fields: []
  }]
}

function requiredInsightCheck(type: string | undefined, text: string): AgentInsightCheck | undefined {
  switch (type) {
    case 'total': return 'value_match'
    case 'rank': return 'rank_position'
    case 'share': return 'share_formula'
    case 'trend': return 'trend_periods'
    case 'delta': return 'delta_formula'
    case 'correlation': return 'value_match'
    case 'data_quality': return 'caveat_present'
    default: return claimCheckForText(text)
  }
}

function claimCheckForText(text: string): AgentInsightCheck | undefined {
  if (/\b(rank|ranks|highest|lowest|leads?|top)\b|排名|最高|最低|领先/i.test(text)) return 'rank_position'
  if (/\b(contributed|accounts? for)\b|占比为|贡献了/i.test(text)) return 'share_formula'
  if (/\b(trend|over time)\b|趋势/i.test(text)) return 'trend_periods'
  if (/\b(delta|change|increased|decreased)\b|变化|增长|下降|环比|同比/i.test(text)) return 'delta_formula'
  if (/\b(correlation|relationship)\b|相关/i.test(text)) return 'value_match'
  if (/\b(is|was|equals?|total)\b[^$]*\$evidence:|(?:是|为|合计)[^$]*\$evidence:/i.test(text)) return 'value_match'
  if (/\d/.test(text)) return 'value_match'
  return undefined
}

function isExplanatoryText(text: string): boolean {
  return !/\d|\$evidence:|\b(rank|trend|share|delta|change|total|correlation)\b|排名|趋势|占比|变化|合计|相关/i.test(text)
}

function chartFields(chart: AgentChartSpec): string[] {
  const fields = Object.values(chart.encoding ?? {}).map(item => item?.field).filter((field): field is string => Boolean(field))
  for (const transform of chart.data?.transform ?? []) {
    if (transform.field) fields.push(transform.field)
    fields.push(...(transform.groupBy ?? []), ...(transform.measures ?? []).map(measure => measure.field))
  }
  return unique(fields)
}

function chartAggregate(chart: AgentChartSpec): ProvenanceObject['aggregate'] {
  const aggregate = chart.data?.transform?.find(transform => transform.type === 'aggregate')
  if (!aggregate) return undefined
  return {
    groupBy: aggregate.groupBy ?? [],
    measures: (aggregate.measures ?? []).map(measure => ({
      field: measure.field,
      operation: measure.op,
      alias: measure.as
    }))
  }
}

function mergeRefs(provenance: NormalizedProvenance, refs: ReturnType<typeof parseEvidenceRefs>): void {
  provenance.evidence = unique([...provenance.evidence, ...refs.map(ref => ref.id)])
  provenance.derivedFrom = unique([...provenance.derivedFrom, ...refs.map(ref => ref.raw)])
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}
