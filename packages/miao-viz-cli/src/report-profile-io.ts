import { readFileSync } from 'node:fs'
import * as YAML from 'yaml'
import { agentError } from './errors'
import type { AnalyzeContext, AnalyzeEvidence } from './context-schema'
import { reportProfileSchema, type ReportProfileV1 } from './report-profile'
import type { AgentError } from './types'

export function readReportProfile(path: string | undefined): ReportProfileV1 | null | AgentError {
  if (!path) return null
  try {
    return reportProfileSchema.parse(YAML.parse(readFileSync(path, 'utf8')))
  } catch (error) {
    return agentError('REPORT_PROFILE_INVALID', 'Report profile is unreadable or invalid.', {
      path, detail: error instanceof Error ? error.message : String(error)
    })
  }
}

export function validateReportProfileEvidence(profile: ReportProfileV1, context: AnalyzeContext): AgentError | null {
  const evidenceById = new Map(context.evidence.map(item => [item.id, item]))
  const issues: Array<{ evidenceId: string; metric: string; reason: string }> = []
  for (const metric of profile.metrics) {
    const evidence = evidenceById.get(metric.evidenceId)
    if (!evidence) {
      issues.push({ evidenceId: metric.evidenceId, metric: metric.metric, reason: 'unknown_evidence' })
    } else if (!hasNumericMetric(evidence, metric.metric)) {
      const rowMetric = evidence.rows?.some(row => typeof row[metric.metric] === 'number' && Number.isFinite(row[metric.metric]))
      issues.push({
        evidenceId: metric.evidenceId, metric: metric.metric,
        reason: rowMetric ? 'non_scalar_metric' : 'non_numeric_metric'
      })
    }
  }
  return issues.length
    ? agentError('REPORT_PROFILE_EVIDENCE_INVALID', 'Report profile references unavailable or non-numeric evidence metrics.', { issues })
    : null
}

function hasNumericMetric(evidence: AnalyzeEvidence, metric: string): boolean {
  return typeof evidence.values?.[metric] === 'number' && Number.isFinite(evidence.values[metric])
}
