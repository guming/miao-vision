import { agentError, isAgentError } from './errors'
import { parseAnalyzeContext } from './context-schema'
import { collectVerifyIssues, strictVerifyError, validateEvidencePaths } from './spec-validator'
import { fail, normalizeSpec, readJson, readSpec, requiredFlag, stringFlag, writeOutput } from './cli-utils'
import { templateSpecToYaml } from './report-template-registry'
import type { AgentChartSpec, AgentInsight, AgentReportSpec } from './types'
import type { CliArgs } from './cli-utils'

export interface SummaryProvenance {
  evidenceIds: string[]
  sourceChartIds: string[]
  sourceInsightIndexes: number[]
  items: Array<{
    kind: 'chart' | 'insight'
    sourceId: string
    evidenceIds: string[]
  }>
}

export function runSummary(args: CliArgs): unknown {
  if (args.positional[0] !== 'instantiate') {
    return fail(agentError('UNKNOWN_SUBCOMMAND', 'Usage: miao-viz spec summary instantiate --spec <file> --context <file> [--output <file>]'))
  }
  const specPath = requiredFlag(args, 'spec')
  const contextPath = requiredFlag(args, 'context')
  if (isAgentError(specPath)) return fail(specPath)
  if (isAgentError(contextPath)) return fail(contextPath)
  const source = normalizeSpec(readSpec(specPath))
  if (isAgentError(source)) return fail(source)
  const context = parseAnalyzeContext(readJson<unknown>(contextPath))
  if (!context) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))
  const evidenceCheck = validateEvidencePaths(source, context)
  if (isAgentError(evidenceCheck)) return fail(evidenceCheck)
  const strictCheck = strictVerifyError(collectVerifyIssues(source, context))
  if (isAgentError(strictCheck)) {
    return fail(agentError('SUMMARY_SOURCE_NOT_VERIFIED', 'Source report did not pass strict evidence verification.', {
      cause: strictCheck
    }))
  }

  const selection = selectSummaryContent(source)
  if (!selection.charts.length) {
    return fail(agentError('SUMMARY_SOURCE_EMPTY', 'Source report has no chart suitable for an executive summary.'))
  }
  const summary: AgentReportSpec = {
    specVersion: source.specVersion,
    title: `${source.title ?? 'Report'} — Executive Summary`,
    description: `Derived from ${source.title ?? 'the verified source report'}; metric definitions are unchanged.`,
    layout: { preset: 'executive', maxColumns: 12 },
    theme: source.theme,
    insights: selection.insights,
    charts: selection.charts
  }
  const insightEvidence = collectEvidenceIds(selection.insights)
  const chartItems = selection.chartIndexes.map(index => {
    const chart = source.charts[index]
    return {
      kind: 'chart' as const,
      sourceId: chart.id ?? `chart-index:${index}`,
      evidenceIds: matchChartEvidence(chart, context)
    }
  })
  const insightItems = selection.insightIndexes.map((index, selectedIndex) => ({
    kind: 'insight' as const,
    sourceId: `insight-index:${index}`,
    evidenceIds: collectEvidenceIds([selection.insights[selectedIndex]])
  }))
  const provenance: SummaryProvenance = {
    evidenceIds: Array.from(new Set([...insightEvidence, ...chartItems.flatMap(item => item.evidenceIds)])),
    sourceChartIds: selection.chartIndexes.map(index => source.charts[index].id ?? `chart-index:${index}`),
    sourceInsightIndexes: selection.insightIndexes,
    items: [...chartItems, ...insightItems]
  }
  const yaml = [
    '# Derived executive summary. Do not change metric definitions or evidence ids.',
    `# Source charts: ${provenance.sourceChartIds.join(', ')}`,
    `# Evidence: ${provenance.evidenceIds.join(', ') || 'none'}`,
    '', templateSpecToYaml(summary)
  ].join('\n')
  const output = stringFlag(args, 'output')
  if (output) {
    writeOutput(output, yaml)
    const provenanceOutput = `${output}.provenance.json`
    writeOutput(provenanceOutput, `${JSON.stringify(provenance, null, 2)}\n`)
    return { ok: true, value: { output, provenanceOutput, provenance } }
  }
  return { ok: true, value: { yaml, provenance } }
}

function matchChartEvidence(chart: AgentChartSpec, context: NonNullable<ReturnType<typeof parseAnalyzeContext>>): string[] {
  const fields = new Set<string>()
  for (const encoding of Object.values(chart.encoding ?? {})) if (encoding?.field) fields.add(encoding.field)
  for (const transform of chart.data?.transform ?? []) {
    if ('field' in transform && transform.field) fields.add(transform.field)
    if ('groupBy' in transform) for (const field of transform.groupBy ?? []) fields.add(field)
    if ('measures' in transform) for (const measure of transform.measures ?? []) fields.add(measure.field)
  }
  const matches = context.evidence.filter(evidence => {
    const recipeFields = new Set([
      ...(evidence.recipe?.groupBy ?? []),
      ...(evidence.recipe?.measures ?? []).map(measure => measure.field)
    ])
    return recipeFields.size > 0 && Array.from(recipeFields).every(field => fields.has(field))
  }).map(evidence => evidence.id)
  return matches.length ? matches : context.evidence.filter(evidence =>
    chart.type === 'bigvalue' ? Boolean(evidence.values) : Boolean(evidence.rows)
  ).slice(0, 1).map(evidence => evidence.id)
}

function selectSummaryContent(source: AgentReportSpec): {
  charts: AgentChartSpec[]
  insights: AgentInsight[]
  chartIndexes: number[]
  insightIndexes: number[]
} {
  const priority = (chart: AgentChartSpec): number => {
    if (['bigvalue', 'delta', 'bullet', 'gauge', 'progress'].includes(chart.type)) return 0
    if (['line', 'area', 'bar', 'dot', 'lollipop'].includes(chart.type)) return 1
    if (chart.type === 'table') return 3
    return 2
  }
  const chartIndexes = source.charts.map((_, index) => index)
    .sort((a, b) => priority(source.charts[a]) - priority(source.charts[b]) || a - b)
    .slice(0, 4)
    .sort((a, b) => a - b)
  const insightIndexes = (source.insights ?? []).map((_, index) => index).slice(0, 5)
  return {
    charts: chartIndexes.map(index => structuredClone(source.charts[index])),
    insights: insightIndexes.map(index => structuredClone(source.insights![index])),
    chartIndexes, insightIndexes
  }
}

function collectEvidenceIds(insights: AgentInsight[]): string[] {
  const ids = new Set<string>()
  for (const insight of insights) {
    if (typeof insight === 'string') {
      for (const match of insight.matchAll(/\$evidence:([A-Za-z0-9_-]+)/g)) ids.add(match[1])
    } else {
      for (const id of insight.evidence ?? []) ids.add(id)
      for (const match of insight.text.matchAll(/\$evidence:([A-Za-z0-9_-]+)/g)) ids.add(match[1])
    }
  }
  return Array.from(ids)
}
