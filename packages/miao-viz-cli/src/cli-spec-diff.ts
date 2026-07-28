import { agentError, isAgentError } from './errors'
import { parseAnalyzeContext } from './context-schema'
import { fail, normalizeSpec, readJson, readSpec, requiredFlag } from './cli-utils'
import type { AgentInsight, AgentReportSpec } from './types'
import type { CliArgs } from './cli-utils'

interface SpecChange {
  op: 'add' | 'remove' | 'replace'
  path: string
  before?: unknown
  after?: unknown
}

export function runSpecDiff(args: CliArgs): unknown {
  const beforePath = requiredFlag(args, 'before')
  const afterPath = requiredFlag(args, 'after')
  if (isAgentError(beforePath)) return fail(beforePath)
  if (isAgentError(afterPath)) return fail(afterPath)
  const before = normalizeSpec(readSpec(beforePath))
  const after = normalizeSpec(readSpec(afterPath))
  if (isAgentError(before)) return fail(before)
  if (isAgentError(after)) return fail(after)
  const contextPath = requiredFlag(args, 'context')
  if (isAgentError(contextPath)) return fail(contextPath)
  const context = parseAnalyzeContext(readJson<unknown>(contextPath))
  if (!context) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))

  const changes: SpecChange[] = []
  walk(before, after, '', changes)
  const changedChartIndexes = indexesFor(changes, 'charts')
  const changedInsightIndexes = indexesFor(changes, 'insights')
  const affectedEvidenceIds = new Set<string>()
  for (const index of changedInsightIndexes) {
    for (const spec of [before, after]) collectInsightEvidence(spec.insights?.[index], affectedEvidenceIds)
  }
  const changedChartFields = changedChartIndexes.flatMap(index =>
    [before.charts[index], after.charts[index]].filter(Boolean).flatMap(chart =>
      Object.values(chart.encoding ?? {}).map(encoding => encoding?.field).filter((field): field is string => Boolean(field))
    )
  )
  for (const evidence of context.evidence) {
    const recipeText = JSON.stringify(evidence.recipe ?? {})
    if (changedChartFields.some(field => recipeText.includes(`"${field}"`))) affectedEvidenceIds.add(evidence.id)
  }
  const riskFlags = [
    ...(changes.some(change => /\/(encoding|data|references|annotations)/.test(change.path)) ? ['data_semantics_changed'] : []),
    ...(changes.some(change => /\/insights\//.test(change.path)) ? ['claims_changed'] : []),
    ...(changes.some(change => change.path === '/charts' || /^\/charts\/\d+$/.test(change.path)) ? ['report_structure_changed'] : [])
  ]
  return { ok: true, value: {
    changes,
    affected: {
      chartIndexes: changedChartIndexes,
      chartIds: changedChartIndexes.map(index => after.charts[index]?.id ?? before.charts[index]?.id ?? `chart-index:${index}`),
      insightIndexes: changedInsightIndexes,
      evidenceIds: Array.from(affectedEvidenceIds)
    },
    requiresRecompute: changedChartFields.length > 0,
    unchanged: countUnchangedTopLevel(before, after),
    risks: Array.from(new Set(riskFlags))
  } }
}

function walk(before: unknown, after: unknown, path: string, changes: SpecChange[]): void {
  if (Object.is(before, after)) return
  if (before === undefined) { changes.push({ op: 'add', path: path || '/', after }); return }
  if (after === undefined) { changes.push({ op: 'remove', path: path || '/', before }); return }
  if (!isRecord(before) || !isRecord(after) || Array.isArray(before) !== Array.isArray(after)) {
    changes.push({ op: 'replace', path: path || '/', before, after }); return
  }
  const beforeRecord = before as Record<string, unknown>
  const afterRecord = after as Record<string, unknown>
  for (const key of new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])) {
    walk(beforeRecord[key], afterRecord[key], `${path}/${escapePointer(key)}`, changes)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function escapePointer(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1')
}

function indexesFor(changes: SpecChange[], key: string): number[] {
  const indexes = new Set<number>()
  for (const change of changes) {
    const match = change.path.match(new RegExp(`^/${key}/(\\d+)`))
    if (match) indexes.add(Number(match[1]))
  }
  return Array.from(indexes).sort((a, b) => a - b)
}

function collectInsightEvidence(insight: AgentInsight | undefined, output: Set<string>): void {
  if (!insight) return
  const text = typeof insight === 'string' ? insight : insight.text
  if (typeof insight !== 'string') for (const id of insight.evidence ?? []) output.add(id)
  for (const match of text.matchAll(/\$evidence:([A-Za-z0-9_-]+)/g)) output.add(match[1])
}

function countUnchangedTopLevel(before: AgentReportSpec, after: AgentReportSpec): { charts: number; insights: number } {
  return {
    charts: before.charts.filter((chart, index) => JSON.stringify(chart) === JSON.stringify(after.charts[index])).length,
    insights: (before.insights ?? []).filter((insight, index) => JSON.stringify(insight) === JSON.stringify(after.insights?.[index])).length
  }
}
