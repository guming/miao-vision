import { queryRecipeFields } from './query-recipe'
import type { AgentChartSpec, AgentReportSpec } from './types'

export interface FieldDependencyResult {
  required: string[]
  excludedConflicts: string[]
}

export function collectReportFieldDependencies(spec: AgentReportSpec): FieldDependencyResult {
  const required = new Set<string>()
  for (const filter of spec.interactions?.globalFilters ?? []) required.add(filter.field)
  for (const field of spec.interactions?.dataPolicy?.detailFields ?? []) required.add(field)
  for (const summary of spec.interactions?.currentView?.summaries ?? []) {
    for (const field of queryRecipeFields(summary.recipe)) if (field !== '*') required.add(field)
  }
  for (const chart of spec.charts) collectChartFields(chart, required)

  const excluded = new Set(spec.interactions?.dataPolicy?.excludeFields ?? [])
  return {
    required: [...required].sort(),
    excludedConflicts: [...required].filter(field => excluded.has(field)).sort()
  }
}

function collectChartFields(chart: AgentChartSpec, out: Set<string>): void {
  for (const encoding of Object.values(chart.encoding ?? {})) if (encoding?.field) out.add(encoding.field)
  for (const transform of chart.data?.transform ?? []) {
    if (transform.field) out.add(transform.field)
    for (const field of transform.groupBy ?? []) out.add(field)
    for (const measure of transform.measures ?? []) out.add(measure.field)
  }
  if (chart.facet?.row?.field) out.add(chart.facet.row.field)
  if (chart.facet?.column?.field) out.add(chart.facet.column.field)
  for (const reference of chart.references ?? []) if (reference.field) out.add(reference.field)
  for (const annotation of chart.annotations ?? []) {
    const selector = annotation.selector
    if ('field' in selector) out.add(selector.field)
    if ('orderBy' in selector && selector.orderBy) out.add(selector.orderBy)
    if ('startField' in selector) out.add(selector.startField)
    if ('endField' in selector) out.add(selector.endField)
  }
  const quality = chart.quality
  if (quality?.sampleSizeField) out.add(quality.sampleSizeField)
  if (quality?.estimatedField) out.add(quality.estimatedField)
  if (quality?.incompleteField) out.add(quality.incompleteField)
}
