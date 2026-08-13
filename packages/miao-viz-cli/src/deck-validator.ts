import { z } from 'zod'
import { agentError, isAgentError, ok } from './errors'
import { MVP_CHART_TYPES } from './spec-schema'
import { deckSpecSchema } from './deck-schema'
import type { AgentChartSpec, AgentDataTransform, AgentError, AgentResult, DataProfile } from './types'
import type { DeckSpec, SlideMetric } from './deck-types'
import { interactionCapabilities } from './interaction-capabilities'

const REQUIRED_ENCODINGS: Record<string, string[]> = {
  bar: ['x', 'y'],
  line: ['x', 'y'],
  area: ['x', 'y'],
  pie: ['label', 'value'],
  scatter: ['x', 'y'],
  histogram: ['x'],
  heatmap: ['x', 'y', 'value'],
  table: [],
  bigvalue: ['value']
}

export interface DeckValidationIssue {
  path: string
  message: string
  hint: string
}

export function parseDeckSpec(spec: unknown): AgentResult<DeckSpec> {
  if (spec && typeof spec === 'object') {
    const candidate = spec as { intent?: unknown; pattern?: unknown }
    if (candidate.intent && candidate.pattern && candidate.intent !== candidate.pattern) {
      return agentError('DECK_PATTERN_MISMATCH', 'Deck intent and pattern must match when both are provided.', {
        path: 'pattern', intent: candidate.intent, pattern: candidate.pattern,
        hint: 'Use pattern as the canonical field, or give legacy intent the same value.'
      })
    }
  }
  const parsed = deckSpecSchema.safeParse(spec)
  if (!parsed.success) {
    const errors = formatDeckSpecIssues(parsed.error)
    return agentError('INVALID_DECK_SPEC', errors[0]?.message ?? 'DeckSpec is invalid.', { errors })
  }
  const normalized = parsed.data.pattern || !parsed.data.intent
    ? parsed.data
    : { ...parsed.data, pattern: parsed.data.intent }
  const semanticErrors = validateDeckSpecSemantics(normalized)
  if (semanticErrors.length > 0) {
    return agentError('INVALID_DECK_SPEC', semanticErrors[0].message, { errors: semanticErrors })
  }
  return ok(normalized)
}

function validateDeckSpecSemantics(spec: DeckSpec): DeckValidationIssue[] {
  const errors: DeckValidationIssue[] = []

  spec.slides.forEach((slide, index) => {
    if (slide.claimStatus === 'verified-claim') {
      const missing = [
        ['claimType', slide.claimType], ['evidence', slide.evidence?.length],
        ['derivedFrom', slide.derivedFrom?.length], ['check', slide.check]
      ].find(([, value]) => !value)
      if (missing) errors.push({
        path: `slides[${index}].${missing[0]}`,
        message: `slides[${index}]: verified-claim requires claimType, evidence, derivedFrom, and check.`,
        hint: 'Add complete data grounding or use author-claim/source-text.'
      })
    }
    if ((slide.claimStatus === 'source-text' || slide.claimStatus === 'author-claim') &&
      (slide.claimType || slide.evidence?.length || slide.derivedFrom?.length || slide.check)) {
      errors.push({
        path: `slides[${index}].claimStatus`,
        message: `slides[${index}]: ${slide.claimStatus} cannot carry verified data grounding.`,
        hint: 'Remove data grounding fields or change claimStatus to verified-claim.'
      })
    }
    if (['text-chart', 'metrics-chart', 'chart-full'].includes(slide.layout) && !slide.charts?.length) {
      const path = `slides[${index}].charts`
      errors.push({
        path,
        message: `${path}: Layout '${slide.layout}' requires at least one chart.`,
        hint: hintForIssue(path, 'requires at least one chart')
      })
    }

    if (slide.layout === 'metrics-chart' && !slide.metrics?.length) {
      const path = `slides[${index}].metrics`
      errors.push({
        path,
        message: `${path}: Layout 'metrics-chart' requires at least one metric.`,
        hint: hintForIssue(path, 'requires at least one metric')
      })
    }

    if ((slide.metrics?.length ?? 0) > 4) {
      const path = `slides[${index}].metrics`
      errors.push({
        path,
        message: `${path}: A slide can include at most 4 metrics.`,
        hint: hintForIssue(path, 'at most 4 metrics')
      })
    }

    if (slide.charts && slide.charts.length > 1) {
      const path = `slides[${index}].charts`
      errors.push({
        path,
        message: `${path}: A slide can include at most 1 chart.`,
        hint: hintForIssue(path, 'at most 1 chart')
      })
    }

    if (slide.layout === 'table-full' && slide.charts?.[0] && slide.charts[0].type !== 'table') {
      const path = `slides[${index}].charts[0].type`
      errors.push({
        path,
        message: `${path}: Layout 'table-full' only accepts a table chart.`,
        hint: hintForIssue(path, 'only accepts a table chart')
      })
    }
  })

  return errors
}

export function validateDeckFields(spec: DeckSpec, profile: DataProfile): AgentResult<DeckSpec> {
  const sourceFields = new Set(profile.columns.map(column => column.name))

  const interactionResult = validateDeckInteractions(spec, sourceFields)
  if (isAgentError(interactionResult)) return interactionResult

  for (let slideIndex = 0; slideIndex < spec.slides.length; slideIndex += 1) {
    const slide = spec.slides[slideIndex]

    for (let chartIndex = 0; chartIndex < (slide.charts ?? []).length; chartIndex += 1) {
      const result = validateChartFields(slide.charts![chartIndex], sourceFields, `slides[${slideIndex}].charts[${chartIndex}]`)
      if (isAgentError(result)) return result
    }

    for (let metricIndex = 0; metricIndex < (slide.metrics ?? []).length; metricIndex += 1) {
      const metric = slide.metrics![metricIndex]
      const result = validateMetricFields(metric, sourceFields, `slides[${slideIndex}].metrics[${metricIndex}]`)
      if (isAgentError(result)) return result
    }
  }

  return ok(spec)
}

function validateDeckInteractions(spec: DeckSpec, sourceFields: Set<string>): AgentResult<void> {
  const filters = spec.interactions?.globalFilters ?? []
  if (filters.length > 0) {
    for (let slideIndex = 0; slideIndex < spec.slides.length; slideIndex += 1) {
      const unsupported = spec.slides[slideIndex].charts?.find(chart => !interactionCapabilities(chart.type).filter)
      if (unsupported) return deckFieldError(`slides[${slideIndex}].charts`, unsupported.type, `Chart type '${unsupported.type}' cannot be updated by global filters.`)
    }
  }
  for (let i = 0; i < filters.length; i += 1) {
    const filter = filters[i]
    if (!sourceFields.has(filter.field)) {
      return deckFieldError(
        `interactions.globalFilters[${i}].field`,
        filter.field,
        `Filter field '${filter.field}' is not found in the data profile.`
      )
    }
  }
  return ok<void>(undefined as unknown as void)
}

function formatDeckSpecIssues(error: z.ZodError): DeckValidationIssue[] {
  return error.issues.map(issue => {
    const path = issue.path.length ? formatPath(issue.path) : 'deck'
    return {
      path,
      message: `${path}: ${issue.message}`,
      hint: hintForIssue(path, issue.message)
    }
  })
}

function validateChartFields(
  chart: AgentChartSpec,
  sourceFields: Set<string>,
  path: string
): AgentResult<AgentChartSpec> {
  if (!MVP_CHART_TYPES.includes(chart.type as (typeof MVP_CHART_TYPES)[number])) {
    return deckFieldError(path, chart.type, `Chart type '${chart.type}' is not supported.`)
  }

  for (const encoding of REQUIRED_ENCODINGS[chart.type] ?? []) {
    if (!chart.encoding?.[encoding]?.field) {
      return deckFieldError(`${path}.encoding.${encoding}`, encoding, `Chart type '${chart.type}' requires encoding '${encoding}'.`)
    }
  }

  const available = applyTransforms(chart.data?.transform ?? [], sourceFields, path)
  if (isAgentError(available)) return available

  for (const [encoding, spec] of Object.entries(chart.encoding ?? {})) {
    if (spec?.field && !available.value.has(spec.field)) {
      return deckFieldError(`${path}.encoding.${encoding}.field`, spec.field, `Field '${spec.field}' is not available for this chart encoding.`)
    }
  }

  return ok(chart)
}

function validateMetricFields(
  metric: SlideMetric,
  sourceFields: Set<string>,
  path: string
): AgentResult<SlideMetric> {
  const available = applyTransforms(metric.data?.transform ?? [], sourceFields, path)
  if (isAgentError(available)) return available
  return ok(metric)
}

function applyTransforms(
  transforms: AgentDataTransform[],
  sourceFields: Set<string>,
  path: string
): AgentResult<Set<string>> {
  let available = new Set(sourceFields)

  for (let index = 0; index < transforms.length; index += 1) {
    const transform = transforms[index]
    const transformPath = `${path}.data.transform[${index}]`

    if (transform.field && !available.has(transform.field)) {
      return deckFieldError(`${transformPath}.field`, transform.field, `Field '${transform.field}' was not found before transform '${transform.type}'.`)
    }

    for (const field of transform.groupBy ?? []) {
      if (!available.has(field)) {
        return deckFieldError(`${transformPath}.groupBy`, field, `Group field '${field}' was not found before transform '${transform.type}'.`)
      }
    }

    for (const measure of transform.measures ?? []) {
      if (!available.has(measure.field)) {
        return deckFieldError(`${transformPath}.measures.${measure.as}`, measure.field, `Measure field '${measure.field}' was not found before transform '${transform.type}'.`)
      }
    }

    available = nextAvailableFields(available, transform)
  }

  return ok(available)
}

function nextAvailableFields(current: Set<string>, transform: AgentDataTransform): Set<string> {
  if (transform.type === 'derive-month' && transform.as) {
    return new Set([...current, transform.as])
  }

  if (transform.type === 'aggregate') {
    return new Set([
      ...(transform.groupBy ?? []),
      ...(transform.measures ?? []).map(measure => measure.as)
    ])
  }

  return current
}

function deckFieldError(path: string, field: string, message: string): AgentError {
  return agentError('DECK_FIELD_NOT_FOUND', message, {
    path,
    field,
    hint: `Check ${path} and use a field from the input data or a field created by an earlier transform.`
  })
}

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((result, item) => {
    if (typeof item === 'number') return `${result}[${item}]`
    const segment = String(item)
    return result ? `${result}.${segment}` : segment
  }, '')
}

function hintForIssue(path: string, message: string): string {
  if (message.includes('requires at least one chart')) return `Add a chart under ${path}.`
  if (message.includes('requires at least one metric')) return `Add one to four metrics under ${path}.`
  if (message.includes('at most 4 metrics')) return `Reduce ${path} to four metrics or split them across multiple slides.`
  if (message.includes('at most 1 chart')) return `Reduce ${path} to a single chart or spread multiple charts across separate slides.`
  if (message.includes('only accepts a table chart')) return `Change ${path} to 'table' or use a chart-focused layout.`
  return `Check ${path} in the DeckSpec.`
}
