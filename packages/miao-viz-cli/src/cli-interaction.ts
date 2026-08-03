import * as YAML from 'yaml'
import { agentError, isAgentError } from './errors'
import { parseAnalyzeContext } from './context-schema'
import { fail, readJson, requiredFlag, stringFlag, writeOutput } from './cli-utils'
import type { CliArgs } from './cli-utils'

export function runInteraction(args: CliArgs): unknown {
  if (args.positional[0] !== 'instantiate') {
    return fail(agentError('UNKNOWN_SUBCOMMAND', `Unknown interaction subcommand '${args.positional[0] ?? '(none)'}'. Supported: instantiate`))
  }
  const preset = args.positional[1]
  if (preset !== 'filter' && preset !== 'filter-and-detail') {
    return fail(agentError('INTERACTION_PRESET_UNKNOWN', `Unknown interaction preset '${preset ?? '(none)'}'.`, { available: ['filter', 'filter-and-detail'] }))
  }
  const contextPath = requiredFlag(args, 'context')
  if (isAgentError(contextPath)) return fail(contextPath)
  const raw = readJson<unknown>(contextPath)
  const unwrapped = (raw as { ok?: unknown; value?: unknown }).ok === true ? (raw as { value: unknown }).value : raw
  const context = parseAnalyzeContext(unwrapped)
  if (!context) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))
  const recommendation = context.catalog.interactions?.find(item => item.preset === preset)
  if (!recommendation) {
    return fail(agentError('INTERACTION_PRESET_NOT_APPLICABLE', `Preset '${preset}' is not applicable to this context.`, {
      preset, available: context.catalog.interactions?.map(item => item.preset) ?? [], reasons: ['missing_eligible_fields_or_safe_detail_set']
    }))
  }
  const fragment = {
    interactions: {
      globalFilters: recommendation.filters.map(filter => ({ field: filter.field, type: filter.type })),
      dataPolicy: {
        mode: recommendation.dataPolicy,
        ...(recommendation.detailFields ? { detailFields: recommendation.detailFields } : {})
      }
    }
  }
  const value = {
    preset, score: recommendation.score, fragment,
    reasons: recommendation.filters.map(filter => filter.reason),
    embeddedFieldPreview: Array.from(new Set([...recommendation.filters.map(filter => filter.field), ...(recommendation.detailFields ?? [])])),
    warnings: recommendation.risks
  }
  const output = stringFlag(args, 'output')
  if (output) {
    writeOutput(output, YAML.stringify(fragment))
    return { ok: true, value: { output, ...value } }
  }
  return { ok: true, value }
}
