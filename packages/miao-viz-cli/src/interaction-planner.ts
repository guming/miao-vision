import type { AnalyzeContext, AnalyzeField, InteractionRecommendation } from './context-schema'

const RESTRICTED = /password|passwd|credential|secret|token|api[_-]?key|card[_-]?number|national[_-]?id|ssn/i
const REVIEW = /email|phone|mobile|address|contact/i

export function planInteractions(context: Pick<AnalyzeContext, 'intent' | 'fields'>): InteractionRecommendation[] {
  const scoredFilters = context.fields
    .map(field => ({ field, score: filterScore(field, context.intent.raw) }))
    .filter(item => item.score > 0 && fieldSafety(item.field) === 'safe')
    .sort((a, b) => b.score - a.score || rolePriority(a.field) - rolePriority(b.field) || a.field.name.localeCompare(b.field.name))
  const filters = scoredFilters.slice(0, 2).map(({ field }) => ({
    field: field.name,
    type: field.type === 'date' || field.type === 'number' && ['time', 'score'].includes(field.role) ? 'range' as const : 'select' as const,
    reason: filterReason(field)
  }))
  if (!filters.length) return []

  const safeDetails = context.fields
    .filter(field => fieldSafety(field) === 'safe' && field.chartUsage?.asDetailKey !== 'forbidden')
    .sort((a, b) => detailPriority(a) - detailPriority(b) || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map(field => field.name)
  const intent = context.intent.raw.toLowerCase()
  const wantsDetail = /detail|record|row|order|ticket|明细|记录|订单|工单/.test(intent)
  const recommendations: InteractionRecommendation[] = []
  if (wantsDetail && safeDetails.length >= 2) {
    recommendations.push({ preset: 'filter-and-detail', score: 0.9, filters, detailFields: safeDetails, dataPolicy: 'detail-safe', risks: [] })
  }
  recommendations.push({ preset: 'filter', score: wantsDetail ? 0.78 : 0.88, filters, detailFields: null, dataPolicy: 'minimal', risks: safeDetails.length < 2 ? ['no_safe_detail_set'] : [] })
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 2)
}

function fieldSafety(field: AnalyzeField): 'safe' | 'review' | 'restricted' {
  if (RESTRICTED.test(field.name) || field.semanticTags?.some(tag => RESTRICTED.test(tag))) return 'restricted'
  if (field.role === 'id' || field.role === 'text' || REVIEW.test(field.name)) return 'review'
  if (field.type === 'string' && (field.distinctCount ?? 0) >= 20 && field.role === 'unknown') return 'review'
  return 'safe'
}

function filterScore(field: AnalyzeField, intent: string): number {
  if (!['dimension', 'status', 'flag', 'geo', 'time', 'score'].includes(field.role)) return 0
  if (field.role !== 'time' && (field.distinctCount ?? 999) > 30) return 0
  let score = ({ time: 0.88, status: 0.86, geo: 0.84, flag: 0.8, dimension: 0.78, score: 0.65 } as Record<string, number>)[field.role] ?? 0
  if (intent.toLowerCase().includes(field.name.toLowerCase())) score += 0.08
  return Math.min(score, 0.98)
}

function filterReason(field: AnalyzeField): string {
  if (field.role === 'time') return 'Valid time field'
  return `Low-cardinality ${field.role} field`
}

function rolePriority(field: AnalyzeField): number {
  return ['time', 'status', 'geo', 'flag', 'dimension', 'score'].indexOf(field.role)
}

function detailPriority(field: AnalyzeField): number {
  if (field.chartUsage?.asDetailKey === 'recommended') return 0
  if (['dimension', 'status', 'time', 'geo'].includes(field.role)) return 1
  if (['measure', 'score'].includes(field.role)) return 2
  return 3
}
