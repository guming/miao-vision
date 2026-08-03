import type { AnalyzeContext } from './context-schema'
import type { ColumnProfile, DataProfile } from './types'

export type SensitivityLevel = 'safe' | 'review' | 'restricted'

export interface SensitivityFinding {
  field: string
  level: SensitivityLevel
  reasons: string[]
}

const RESTRICTED_NAME = /(^|[_\s-])(password|passwd|credential|secret|token|api[_-]?key|card[_-]?number|national[_-]?id|ssn)([_\s-]|$)/i
const REVIEW_NAME = /(^|[_\s-])(email|e-mail|phone|mobile|address|contact|customer[_-]?id|user[_-]?id|order[_-]?id)([_\s-]|$)/i

export function classifyReportFields(profile: DataProfile, context?: AnalyzeContext): SensitivityFinding[] {
  return profile.columns.map(column => classifyColumn(column, context)).sort((a, b) => a.field.localeCompare(b.field))
}

function classifyColumn(column: ColumnProfile, context?: AnalyzeContext): SensitivityFinding {
  const analyzed = context?.fields.find(field => field.name === column.name)
  const reasons: string[] = []
  let level: SensitivityLevel = 'safe'
  if (RESTRICTED_NAME.test(column.name)) {
    level = 'restricted'
    reasons.push('restricted_name_pattern')
  }
  const tags = [...(column.semanticTags ?? []), ...(analyzed?.semanticTags ?? [])].map(tag => tag.toLowerCase())
  if (tags.some(tag => ['credential', 'secret', 'token', 'password', 'national-id', 'card-number'].includes(tag))) {
    level = 'restricted'
    reasons.push('restricted_semantic_tag')
  }
  if (level !== 'restricted' && REVIEW_NAME.test(column.name)) {
    level = 'review'
    reasons.push('review_name_pattern')
  }
  if (level !== 'restricted' && (column.role === 'id' || analyzed?.role === 'id')) {
    level = 'review'
    reasons.push('identifier_role')
  }
  if (level === 'safe' && column.type === 'string' && column.nonNullCount >= 20 && column.distinctCount / column.nonNullCount >= 0.95) {
    level = 'review'
    reasons.push('near_unique_string')
  }
  return { field: column.name, level, reasons }
}
