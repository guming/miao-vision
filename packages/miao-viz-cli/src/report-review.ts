import { z } from 'zod'
import type { PeriodOutcomeBrief } from './period-outcome-schema'

const nonEmptyText = z.string().trim().min(1)

export const reportReviewReasonSchema = z.object({
  code: nonEmptyText,
  message: nonEmptyText,
  evidenceRefs: z.array(nonEmptyText).optional()
}).strict()

export const reportReviewSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(['ready', 'needs_review', 'blocked']),
  reasons: z.array(reportReviewReasonSchema),
  materialChanges: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  blockingIssues: z.number().int().nonnegative()
}).strict()

export type ReportReviewReason = z.infer<typeof reportReviewReasonSchema>
export type ReportReview = z.infer<typeof reportReviewSchema>

export function evaluateReportReview(
  brief: PeriodOutcomeBrief,
  blockingReasons: ReportReviewReason[] = [],
  reviewReasons: ReportReviewReason[] = []
): ReportReview {
  const reasons: ReportReviewReason[] = [...blockingReasons, ...reviewReasons]
  for (const outcome of brief.outcomes) {
    if (outcome.classification === 'adverse') reasons.push({
      code: 'MATERIAL_ADVERSE_OUTCOME', message: `${outcome.label} moved in an adverse direction.`,
      evidenceRefs: outcome.evidenceRefs
    })
  }
  if (brief.anomalies.added.length) reasons.push({
    code: 'NEW_ANOMALY', message: `${brief.anomalies.added.length} new anomaly item(s) require review.`
  })
  for (const ranking of brief.rankings) {
    if (ranking.kind === 'entered' || ranking.kind === 'departed') reasons.push({
      code: ranking.kind === 'entered' ? 'RANKING_ITEM_ENTERED' : 'RANKING_ITEM_DEPARTED',
      message: `${ranking.item} ${ranking.kind} the tracked ranking.`, evidenceRefs: ranking.evidenceRefs
    })
  }
  for (const warning of brief.warnings) {
    if (warning.code === 'NO_BASELINE') continue
    reasons.push({
      code: warning.code, message: warning.message,
      ...(warning.evidenceId ? { evidenceRefs: [warning.evidenceId] } : {})
    })
  }
  for (const item of [...brief.outcomes, ...brief.goals, ...brief.rankings, ...brief.recommendations]) {
    if (!item.evidenceRefs.length) reasons.push({
      code: 'INCOMPLETE_EVIDENCE_REFERENCE', message: `Outcome '${item.id}' has no evidence reference.`
    })
  }

  const normalized = deduplicateReasons(reasons)
  const blockingIssues = deduplicateReasons(blockingReasons).length
  return reportReviewSchema.parse({
    schemaVersion: 1,
    status: blockingIssues ? 'blocked' : normalized.length ? 'needs_review' : 'ready',
    reasons: normalized,
    materialChanges: brief.outcomes.length,
    warnings: normalized.length - blockingIssues,
    blockingIssues
  })
}

function deduplicateReasons(reasons: ReportReviewReason[]): ReportReviewReason[] {
  const byKey = new Map<string, ReportReviewReason>()
  for (const reason of reasons) {
    const normalized = reportReviewReasonSchema.parse(reason)
    const key = `${normalized.code}:${(normalized.evidenceRefs ?? []).join(',')}:${normalized.message}`
    byKey.set(key, normalized)
  }
  return [...byKey.values()].sort((a, b) =>
    `${a.code}:${a.message}`.localeCompare(`${b.code}:${b.message}`))
}
