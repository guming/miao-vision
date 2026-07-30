export interface BlockProvenanceRecipe {
  objectKind: 'kpi' | 'chart' | 'insight'
  evidenceId: string
  resultPath: 'values' | 'rows'
  path: string
  fields: string[]
}

const TOTAL: BlockProvenanceRecipe[] = [
  { objectKind: 'kpi', evidenceId: 'total', resultPath: 'values', path: 'values.<measure_alias>', fields: ['measure_alias'] },
  { objectKind: 'insight', evidenceId: 'total', resultPath: 'values', path: 'values.<measure_alias>', fields: ['measure_alias'] }
]
const DIMENSION: BlockProvenanceRecipe[] = [
  { objectKind: 'chart', evidenceId: 'by_dimension', resultPath: 'rows', path: 'rows', fields: ['dimension', 'measure_alias'] },
  { objectKind: 'insight', evidenceId: 'by_dimension', resultPath: 'rows', path: 'rows', fields: ['dimension', 'measure_alias'] }
]
const TIME: BlockProvenanceRecipe[] = [
  { objectKind: 'chart', evidenceId: 'by_time', resultPath: 'rows', path: 'rows', fields: ['time', 'measure_alias'] },
  { objectKind: 'insight', evidenceId: 'by_time', resultPath: 'rows', path: 'rows', fields: ['time', 'measure_alias'] }
]

const RECIPES: Record<string, BlockProvenanceRecipe[]> = {
  'kpi-summary': TOTAL,
  'snapshot-ranking': [...TOTAL, ...DIMENSION],
  'trend-overview': [...TOTAL, ...TIME],
  'comparison-breakdown': [...TOTAL, ...DIMENSION],
  'trend-ranking': [...TOTAL, ...TIME, ...DIMENSION],
  'full-detail-report': [...TOTAL, ...TIME, ...DIMENSION]
}

export function blockProvenanceRecipes(id: string): BlockProvenanceRecipe[] {
  return structuredClone(RECIPES[id] ?? [])
}
