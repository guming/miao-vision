import type { AnalyzeContext, AnalyzeEvidence, AnalyzeField } from './context-schema'
import type { DeckClaimType, DeckIntent, DeckSpec, SlideLayout, SlideSpec } from './deck-types'
import type { DeckContext } from './deck-context-schema'
import { DECK_PLAN_BLOCK_IDS, DECK_PLAN_PATTERNS } from './deck-plan-schema'

export type DeckPatternId = (typeof DECK_PLAN_PATTERNS)[number]
export type DeckSlideBlockId = (typeof DECK_PLAN_BLOCK_IDS)[number]
export type DeckSourceKind = 'narrative' | 'data' | 'hybrid'

export interface DeckSlideBlockKnowledge {
  id: DeckSlideBlockId
  purpose: string
  supportedSources: DeckSourceKind[]
  requiredRoles: AnalyzeField['role'][]
  requiredEvidence: string[]
  requiredContent: Array<'section' | 'quote' | 'comparison' | 'decision'>
  supportedLayouts: SlideLayout[]
  targetLayouts?: string[]
  supportedCharts: string[]
  allowedClaimTypes: DeckClaimType[]
  maxMetrics: number
  maxCharts: number
  repairHints: string[]
}

export interface DeckBlockDecision {
  id: DeckSlideBlockId
  ok: boolean
  score: number
  reasonCode?: string
  reason?: string
}

export const DECK_SLIDE_BLOCKS: DeckSlideBlockKnowledge[] = [
  dataBlock('cover-claim', 'State one verified conclusion or the primary question.', [], [], ['cover']),
  dataBlock('kpi-snapshot', 'Show up to four current-scale metrics.', ['measure'], ['total'], ['metrics-chart'], 4, 1),
  dataBlock('trend-overview-slide', 'Show a measure across at least three time periods.', ['time', 'measure'], ['by_time'], ['chart-full', 'metrics-chart'], 4, 1),
  dataBlock('ranking-slide', 'Show an ordered dimension by a primary measure.', ['dimension', 'measure'], ['by_dimension'], ['chart-full', 'text-chart'], 0, 1),
  dataBlock('data-quality-slide', 'Disclose data limitations that affect interpretation.', [], [], ['text-points']),
  narrativeBlock('narrative-cover', 'Frame the topic, audience, and objective.', [], ['cover']),
  narrativeBlock('section-summary', 'Summarize one sourced section.', ['section'], ['section-summary']),
  narrativeBlock('quote-focus', 'Present one sourced quotation.', ['quote'], ['quote-focus']),
  narrativeBlock('text-comparison', 'Compare two sourced positions or approaches.', ['comparison'], ['comparison-text']),
  narrativeBlock('decision-request', 'State a sourced decision request and its limits.', ['decision'], ['decision']),
  narrativeBlock('narrative-ending', 'Close with a sourced summary or next step.', ['section'], ['ending'])
]

export const DECK_PATTERNS: Record<DeckPatternId, DeckSlideBlockId[]> = {
  'executive-brief': ['cover-claim', 'kpi-snapshot', 'trend-overview-slide', 'ranking-slide', 'data-quality-slide'],
  'business-review': ['cover-claim', 'kpi-snapshot', 'trend-overview-slide', 'ranking-slide', 'data-quality-slide'],
  'topic-explainer': ['narrative-cover', 'section-summary', 'quote-focus', 'narrative-ending'],
  'project-update': ['narrative-cover', 'section-summary', 'decision-request', 'narrative-ending'],
  proposal: ['narrative-cover', 'section-summary', 'text-comparison', 'decision-request']
}

export function evaluateDeckBlocks(context: AnalyzeContext): DeckBlockDecision[] {
  const roles = new Set(context.fields.map(field => field.role))
  const evidence = new Set(context.evidence.map(item => item.id))
  return DECK_SLIDE_BLOCKS.filter(block => block.supportedSources.includes('data')).map(block => {
    if (block.id === 'data-quality-slide' && context.sampleWarnings.length === 0) {
      return { id: block.id, ok: false, score: 0, reasonCode: 'NO_SAMPLE_WARNINGS', reason: 'No analyze warnings require a data-quality slide.' }
    }
    const missingRole = block.requiredRoles.find(role => !hasCompatibleRole(roles, role))
    if (missingRole) return { id: block.id, ok: false, score: 0, reasonCode: `MISSING_${missingRole.toUpperCase()}_ROLE`, reason: `Requires field role '${missingRole}'.` }
    const missingEvidence = block.requiredEvidence.find(id => !evidence.has(id))
    if (missingEvidence) return { id: block.id, ok: false, score: 0, reasonCode: 'MISSING_REQUIRED_EVIDENCE', reason: `Requires evidence '${missingEvidence}'.` }
    if (block.id === 'trend-overview-slide') {
      const time = context.fields.find(field => field.role === 'time')
      if ((time?.timePeriods ?? 0) < 3) return { id: block.id, ok: false, score: 0, reasonCode: 'TIME_PERIODS_LT_3', reason: 'Requires at least 3 time periods.' }
    }
    return { id: block.id, ok: true, score: block.id === 'cover-claim' ? 1 : 0.9 }
  })
}

export function buildDeckCatalog(context: AnalyzeContext): Pick<AnalyzeContext['catalog'], 'deckPatterns' | 'slideBlocks' | 'blockedSlideBlocks'> {
  const decisions = evaluateDeckBlocks(context)
  const allowed = new Set(decisions.filter(item => item.ok).map(item => item.id))
  return {
    deckPatterns: (['executive-brief', 'business-review'] as DeckIntent[]).map(id => ({ id, score: 0.9, density: id === 'executive-brief' ? 'compact' : 'medium', blocks: DECK_PATTERNS[id].filter(block => allowed.has(block)) })),
    slideBlocks: decisions.filter(item => item.ok).map(item => {
      const block = DECK_SLIDE_BLOCKS.find(candidate => candidate.id === item.id)!
      return { id: item.id, score: item.score, requiredRoles: block.requiredRoles, requiredEvidence: block.requiredEvidence }
    }),
    blockedSlideBlocks: decisions.filter(item => !item.ok).map(item => ({ id: item.id, reasonCode: item.reasonCode!, reason: item.reason! }))
  }
}

export function instantiateDeck(intent: DeckIntent, context: AnalyzeContext): DeckSpec {
  const allowed = new Set(evaluateDeckBlocks(context).filter(item => item.ok).map(item => item.id))
  const slides = DECK_PATTERNS[intent].filter(id => allowed.has(id)).map(id => instantiateSlide(id, context))
  return {
    title: context.intent.raw || (intent === 'executive-brief' ? 'Executive Brief' : 'Business Review'),
    description: 'Generated deterministically from AnalyzeContext evidence.',
    intent,
    pattern: intent,
    ...(context.sampleWarnings.length ? { caveats: context.sampleWarnings.map(warning => ({ text: warning.message, warningRefs: [warning.code] })) } : {}),
    slides
  }
}

function instantiateSlide(id: DeckSlideBlockId, context: AnalyzeContext): SlideSpec {
  const measure = context.fields.find(field => field.role === 'measure' || field.role === 'score')
  const dimension = context.fields.find(field => ['dimension', 'status', 'geo', 'flag'].includes(field.role))
  const time = context.fields.find(field => field.role === 'time')
  const measureKey = measure ? `total_${measure.name}` : ''
  if (id === 'cover-claim') return buildCover(context, measureKey)
  if (id === 'kpi-snapshot' && measure) return {
    layout: 'metrics-chart', slideRole: id, eyebrow: 'Snapshot', title: 'Current scale',
    metrics: [{
      label: measure.name,
      data: { transform: [{ type: 'aggregate', measures: [{ field: measure.name, op: 'sum', as: measureKey }] }] },
      format: ',.2f',
      provenance: kpiProvenance(measureKey)
    }],
    charts: dimension ? [rankingChart(dimension.name, measure.name, measureKey)] : time ? [trendChart(time.name, measure.name, measureKey)] : [{
      id: 'summary', type: 'bigvalue',
      data: { transform: [{ type: 'aggregate', measures: [{ field: measure.name, op: 'sum', as: measureKey }] }] },
      encoding: { value: { field: measureKey } },
      provenance: kpiProvenance(measureKey)
    }]
  }
  if (id === 'trend-overview-slide' && measure && time) {
    const evidence = evidenceById(context.evidence, 'by_time')
    const rows = evidence?.rows ?? []
    const firstPath = `$evidence:by_time.rows[0].${measureKey}`
    const lastPath = `$evidence:by_time.rows[last].${measureKey}`
    const direction = Number(rows.at(-1)?.[measureKey]) > Number(rows[0]?.[measureKey]) ? 'up' : Number(rows.at(-1)?.[measureKey]) < Number(rows[0]?.[measureKey]) ? 'down' : 'flat'
    return { layout: 'chart-full', slideRole: id, eyebrow: 'Trend', title: `${measure.name} over ${time.name}`, claim: `${measure.name} moved ${direction} across the observed periods.`, claimType: 'trend', evidence: ['by_time'], derivedFrom: [firstPath, lastPath], check: 'trend_periods', claimArgs: { series: '$evidence:by_time.rows', valueField: measureKey, minimumPeriods: 3, direction }, charts: [trendChart(time.name, measure.name, measureKey)] }
  }
  if (id === 'ranking-slide' && measure && dimension) {
    const rows = evidenceById(context.evidence, 'by_dimension')?.rows ?? []
    const subject = String(rows[0]?.[dimension.name] ?? '')
    return { layout: 'chart-full', slideRole: id, eyebrow: 'Ranking', title: `${measure.name} by ${dimension.name}`, claim: `${subject} ranks first in the observed data.`, claimType: 'rank', evidence: ['by_dimension'], derivedFrom: [`$evidence:by_dimension.rows[0].${dimension.name}`, `$evidence:by_dimension.rows[0].${measureKey}`], check: 'rank_position', claimArgs: { rows: '$evidence:by_dimension.rows', subjectField: dimension.name, valueField: measureKey, subject, expectedRank: 1, order: 'desc' }, charts: [rankingChart(dimension.name, measure.name, measureKey)] }
  }
  return { layout: 'text-points', slideRole: 'data-quality-slide', eyebrow: 'Data quality', title: 'Interpretation notes', bullets: context.sampleWarnings.map(warning => warning.message), warningRefs: context.sampleWarnings.map(warning => warning.code) }
}

export function evaluateNarrativeDeckBlocks(context: DeckContext): DeckBlockDecision[] {
  const sourceKind: DeckSourceKind = context.data ? 'hybrid' : 'narrative'
  return DECK_SLIDE_BLOCKS
    .filter(block => block.supportedSources.includes(sourceKind) || block.supportedSources.includes('narrative'))
    .map(block => {
      const missing = block.requiredContent.find(requirement => !hasNarrativeContent(context, requirement))
      return missing
        ? { id: block.id, ok: false, score: 0, reasonCode: `MISSING_${missing.toUpperCase()}_CONTENT`, reason: `Requires narrative ${missing} content.` }
        : { id: block.id, ok: true, score: block.id === 'narrative-cover' ? 1 : 0.9 }
    })
}

export function buildNarrativeDeckCatalog(context: DeckContext) {
  const decisions = evaluateNarrativeDeckBlocks(context)
  const allowed = new Set(decisions.filter(decision => decision.ok).map(decision => decision.id))
  return {
    deckPatterns: (['topic-explainer', 'project-update', 'proposal'] as DeckPatternId[]).map(id => ({
      id, score: 0.9, blocks: DECK_PATTERNS[id].filter(block => allowed.has(block))
    })),
    slideBlocks: decisions.filter(decision => decision.ok),
    blockedSlideBlocks: decisions.filter(decision => !decision.ok)
  }
}

function hasNarrativeContent(context: DeckContext, requirement: DeckSlideBlockKnowledge['requiredContent'][number]): boolean {
  const narrative = context.narrative
  if (!narrative) return false
  if (requirement === 'section') return narrative.sections.length > 0
  if (requirement === 'quote') return narrative.quotes.length > 0
  if (requirement === 'comparison') return narrative.sections.length >= 2
  return narrative.keyPoints.some(point => /\b(decide|decision|approve|choose|next step)\b|决策|批准|选择|下一步/i.test(point.text))
}

function dataBlock(id: DeckSlideBlockId, purpose: string, requiredRoles: AnalyzeField['role'][], requiredEvidence: string[], supportedLayouts: SlideLayout[], maxMetrics = 0, maxCharts = 0): DeckSlideBlockKnowledge {
  return { id, purpose, supportedSources: ['data', 'hybrid'], requiredRoles, requiredEvidence, requiredContent: [], supportedLayouts, supportedCharts: [], allowedClaimTypes: [], maxMetrics, maxCharts, repairHints: [] }
}

function narrativeBlock(id: DeckSlideBlockId, purpose: string, requiredContent: DeckSlideBlockKnowledge['requiredContent'], targetLayouts: string[]): DeckSlideBlockKnowledge {
  return { id, purpose, supportedSources: ['narrative', 'hybrid'], requiredRoles: [], requiredEvidence: [], requiredContent, supportedLayouts: [], targetLayouts, supportedCharts: [], allowedClaimTypes: [], maxMetrics: 0, maxCharts: 0, repairHints: [] }
}

function buildCover(context: AnalyzeContext, measureKey: string): SlideSpec {
  const change = context.metricCandidates?.find(candidate => candidate.type === 'period_change' && candidate.value !== undefined)
  if (!change || !measureKey || !evidenceById(context.evidence, 'by_time')?.rows?.length) {
    return { layout: 'cover', slideRole: 'cover-claim', eyebrow: 'Analysis brief', title: context.intent.raw || 'What does the current data show?' }
  }
  const value = change.value!
  const rows = evidenceById(context.evidence, 'by_time')!.rows!
  const fromValue = Number(rows[rows.length - 2][measureKey])
  const toValue = Number(rows[rows.length - 1][measureKey])
  const computedValue = fromValue !== 0 ? (toValue - fromValue) / fromValue : value
  const previousPath = `$evidence:by_time.rows[${rows.length - 2}].${measureKey}`
  const latestPath = `$evidence:by_time.rows[last].${measureKey}`
  return { layout: 'cover', slideRole: 'cover-claim', eyebrow: 'Verified change', title: context.intent.raw || 'Executive Brief', claim: `${change.label}: ${(computedValue * 100).toFixed(1)}%.`, claimType: 'delta', evidence: ['by_time'], derivedFrom: [previousPath, latestPath], check: 'delta_formula', claimArgs: { from: previousPath, to: latestPath, mode: 'percent', expected: computedValue } }
}

function rankingChart(dimension: string, measure: string, measureKey: string) {
  return { id: 'ranking', type: 'bar' as const, title: `${measure} by ${dimension}`, data: { transform: [{ type: 'aggregate' as const, groupBy: [dimension], measures: [{ field: measure, op: 'sum' as const, as: measureKey }] }, { type: 'sort' as const, field: measureKey, order: 'desc' as const }, { type: 'limit' as const, value: 10 }] }, encoding: { x: { field: dimension }, y: { field: measureKey } }, interaction: { tooltip: true }, provenance: { evidence: ['by_dimension'], derivedFrom: ['$evidence:by_dimension.rows'] } }
}

function trendChart(time: string, measure: string, measureKey: string) {
  return { id: 'trend', type: 'line' as const, title: `${measure} over ${time}`, data: { transform: [{ type: 'aggregate' as const, groupBy: [time], measures: [{ field: measure, op: 'sum' as const, as: measureKey }] }, { type: 'sort' as const, field: time, order: 'asc' as const }] }, encoding: { x: { field: time }, y: { field: measureKey } }, interaction: { tooltip: true }, provenance: { evidence: ['by_time'], derivedFrom: ['$evidence:by_time.rows'] } }
}

function kpiProvenance(measureKey: string) {
  const value = `$evidence:total.values.${measureKey}`
  return { evidence: ['total'], derivedFrom: [value], check: 'value_match' as const, claimArgs: { value, expected: value } }
}

function evidenceById(evidence: AnalyzeEvidence[], id: string): AnalyzeEvidence | undefined { return evidence.find(item => item.id === id) }
function hasCompatibleRole(roles: Set<AnalyzeField['role']>, role: AnalyzeField['role']): boolean {
  if (role === 'measure') return roles.has('measure') || roles.has('score')
  if (role === 'dimension') return ['dimension', 'status', 'geo', 'flag'].some(value => roles.has(value as AnalyzeField['role']))
  return roles.has(role)
}
