import { agentError, ok } from './errors'
import { interactionCapabilities } from './interaction-capabilities'
import { queryRecipeFields } from './query-recipe'
import { collectReportFieldDependencies } from './report-field-dependencies'
import { classifyReportFields } from './report-sensitivity'
import type { AgentReportSpec, AgentResult, DataProfile } from './types'

export function validateReportInteractions(
  spec: AgentReportSpec,
  profile: DataProfile,
  availableFields: string[]
): AgentResult<AgentReportSpec> {
  const policy = spec.interactions?.dataPolicy
  if (policy?.mode === 'detail-safe' && !policy.detailFields?.length) {
    return agentError('INTERACTION_DETAIL_FIELDS_REQUIRED', 'detail-safe requires at least one authorized detail field.', { path: 'interactions.dataPolicy.detailFields' })
  }
  const dependencies = collectReportFieldDependencies(spec)
  if (dependencies.excludedConflicts.length) {
    return agentError('INTERACTION_EXCLUDED_FIELD_REQUIRED', `Excluded field '${dependencies.excludedConflicts[0]}' is required by the report.`, {
      fields: dependencies.excludedConflicts, path: 'interactions.dataPolicy.excludeFields'
    })
  }
  for (const field of [...(policy?.detailFields ?? []), ...(policy?.excludeFields ?? [])]) {
    if (!availableFields.includes(field)) return agentError('INTERACTION_FIELD_NOT_FOUND', `Data policy field '${field}' was not found in the input data.`, { field, availableFields })
  }
  for (const summary of spec.interactions?.currentView?.summaries ?? []) {
    const missing = queryRecipeFields(summary.recipe).filter(field => field !== '*' && !availableFields.includes(field))
    if (missing.length) return agentError('CURRENT_VIEW_RECIPE_FIELD_NOT_FOUND', `Current-view recipe '${summary.id}' references unavailable fields.`, { summaryId: summary.id, fields: missing })
  }
  if (policy) {
    const findings = classifyReportFields(profile)
    const embedded = policy.mode === 'full' ? availableFields.filter(field => !(policy.excludeFields ?? []).includes(field)) : dependencies.required
    const restricted = findings.filter(item => item.level === 'restricted' && embedded.includes(item.field))
    if (restricted.length) return agentError('INTERACTION_EMBEDDED_FIELD_RESTRICTED', `Trusted output would embed restricted field '${restricted[0].field}'.`, { findings: restricted })
  }
  if ((spec.interactions?.globalFilters?.length ?? 0) > 0) {
    const unsupported = spec.charts.find(chart => !interactionCapabilities(chart.type).filter)
    if (unsupported) return agentError('INTERACTION_CHART_NOT_FILTERABLE', `Chart type '${unsupported.type}' cannot be updated by global filters.`, { chartId: unsupported.id, chartType: unsupported.type })
  }
  for (const filter of spec.interactions?.globalFilters ?? []) {
    const column = profile.columns.find(candidate => candidate.name === filter.field)
    if (!column) return agentError('INTERACTION_FIELD_NOT_FOUND', `Interactive filter field '${filter.field}' was not found in the input data.`, { field: filter.field, availableFields })
    if (filter.type === 'range' && column.type !== 'number' && column.type !== 'date') {
      return agentError('INTERACTION_FILTER_TYPE_MISMATCH', `Range filter '${filter.field}' requires a number or date field.`, {
        field: filter.field, filterType: filter.type, columnType: column.type, supportedColumnTypes: ['number', 'date']
      })
    }
  }
  return ok(spec)
}
