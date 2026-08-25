import type { AnalyzeEvidence } from './context-schema'
import { hashValue } from './report-project-storage'

export interface MetricChange {
  evidenceId: string
  metric: string
  previous: number
  current: number
  absolute: number
  percent: number | null
}

export interface RankChange {
  evidenceId: string
  item: string
  kind: 'movement' | 'entered' | 'departed'
  previousRank: number | null
  currentRank: number | null
  movement: number | null
}

export interface EvidenceChangeSet {
  schemaVersion: 1
  baselineRunId: string | null
  metrics: MetricChange[]
  rankings: RankChange[]
  anomalies: { added: string[]; removed: string[] }
  notComparable: Array<{ evidenceId: string; reason: string }>
}

export function compareEvidence(
  previous: AnalyzeEvidence[] | null,
  current: AnalyzeEvidence[],
  baselineRunId: string | null
): EvidenceChangeSet {
  const changes: EvidenceChangeSet = {
    schemaVersion: 1, baselineRunId, metrics: [], rankings: [],
    anomalies: { added: [], removed: [] }, notComparable: []
  }
  if (!previous) {
    changes.notComparable.push({ evidenceId: '*', reason: 'no successful baseline run' })
    return changes
  }
  const priorById = new Map(previous.map(item => [item.id, item]))
  for (const item of current) {
    const prior = priorById.get(item.id)
    if (!prior) {
      changes.notComparable.push({ evidenceId: item.id, reason: 'evidence id is absent from baseline' })
      continue
    }
    if (hashValue(item.recipe ?? null) !== hashValue(prior.recipe ?? null)) {
      changes.notComparable.push({ evidenceId: item.id, reason: 'evidence recipe changed' })
      continue
    }
    const metricCount = compareValues(prior, item, changes.metrics)
    const rankCount = compareRanks(prior, item, changes.rankings)
    compareAnomalies(prior, item, changes.anomalies)
    if (!metricCount && rankCount < 0 && !isAnomalyEvidence(item)) {
      changes.notComparable.push({ evidenceId: item.id, reason: 'no comparable numeric values or ranked rows' })
    }
  }
  return changes
}

function compareValues(previous: AnalyzeEvidence, current: AnalyzeEvidence, output: MetricChange[]): number {
  if (!previous.values || !current.values) return 0
  let count = 0
  for (const [metric, raw] of Object.entries(current.values)) {
    const before = previous.values[metric]
    if (typeof raw !== 'number' || typeof before !== 'number' || !Number.isFinite(raw) || !Number.isFinite(before)) continue
    const absolute = raw - before
    output.push({
      evidenceId: current.id, metric, previous: before, current: raw, absolute,
      percent: before === 0 ? null : absolute / Math.abs(before)
    })
    count += 1
  }
  return count
}

function compareRanks(previous: AnalyzeEvidence, current: AnalyzeEvidence, output: RankChange[]): number {
  if (!previous.rows?.length || !current.rows?.length) return -1
  const keys = Object.keys(current.rows[0])
  const labelKey = keys.find(key => typeof current.rows![0][key] === 'string')
  const valueKey = keys.find(key => typeof current.rows![0][key] === 'number')
  if (!labelKey || !valueKey) return -1
  const sorted = (rows: Record<string, unknown>[]) => [...rows]
    .filter(row => typeof row[labelKey] === 'string' && typeof row[valueKey] === 'number')
    .sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]))
  const before = sorted(previous.rows)
  const after = sorted(current.rows)
  const labels = [...new Set([...before, ...after].map(row => String(row[labelKey])))].sort()
  for (const label of labels) {
    const previousIndex = before.findIndex(row => String(row[labelKey]) === label)
    const currentIndex = after.findIndex(row => String(row[labelKey]) === label)
    const previousRank = previousIndex < 0 ? null : previousIndex + 1
    const currentRank = currentIndex < 0 ? null : currentIndex + 1
    if (previousRank !== currentRank) {
      output.push({
        evidenceId: current.id, item: label,
        kind: previousRank === null ? 'entered' : currentRank === null ? 'departed' : 'movement',
        previousRank, currentRank,
        movement: previousRank === null || currentRank === null ? null : previousRank - currentRank
      })
    }
  }
  return output.filter(change => change.evidenceId === current.id).length
}

function isAnomalyEvidence(item: AnalyzeEvidence): boolean {
  return /anomal|outlier|issue|quality|异常|离群|质量/i.test(item.id)
}

function compareAnomalies(
  previous: AnalyzeEvidence,
  current: AnalyzeEvidence,
  output: { added: string[]; removed: string[] }
): void {
  if (!isAnomalyEvidence(current)) return
  const normalize = (item: AnalyzeEvidence): string[] =>
    (item.rows ?? (item.values ? [item.values] : [])).map(row => JSON.stringify(row, Object.keys(row).sort()))
  const before = new Set(normalize(previous))
  const after = new Set(normalize(current))
  for (const value of after) if (!before.has(value)) output.added.push(`${current.id}:${value}`)
  for (const value of before) if (!after.has(value)) output.removed.push(`${current.id}:${value}`)
}

export function injectChangesHtml(html: string, changes: EvidenceChangeSet): string {
  const summary = [
    `${changes.metrics.length} metric changes`,
    `${changes.rankings.length} ranking changes`,
    `${changes.anomalies.added.length} new anomalies`,
    `${changes.anomalies.removed.length} resolved anomalies`
  ].join(' · ')
  const details = escapeHtml(JSON.stringify(changes, null, 2))
  const section = `<section class="mv-period-changes"><details><summary>Period changes — ${summary}</summary><pre>${details}</pre></details></section>`
  return html.includes('</body>') ? html.replace('</body>', `${section}</body>`) : `${html}${section}`
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
