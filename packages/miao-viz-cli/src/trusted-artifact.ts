import { collectReportFieldDependencies } from './report-field-dependencies'
import { classifyReportFields, type SensitivityFinding } from './report-sensitivity'
import type { AnalyzeContext } from './context-schema'
import type { AgentReportSpec, DataProfile } from './types'

export const INTERACTIVE_HTML_SOFT_BUDGET_BYTES = 4 * 1024 * 1024
export const INTERACTIVE_HTML_HARD_BUDGET_BYTES = 12 * 1024 * 1024

export type ShareSafetyStatus = 'safe' | 'review' | 'restricted'
export type ShareCheckStatus = 'passed' | 'review' | 'restricted'

export interface ShareSafetyIssue {
  code: string
  path: string
  message: string
  severity: 'warning' | 'error'
}

export interface ShareSafetyCheck {
  id: 'data_policy' | 'sensitivity' | 'artifact_budget' | 'interaction_spec' | 'published_evidence' | 'current_view_recipes'
  status: ShareCheckStatus
  issues: ShareSafetyIssue[]
}

export interface ExposureManifest {
  policy: 'legacy' | 'minimal' | 'detail-safe' | 'full'
  embeddedFields: string[]
  excludedFields: string[]
  embeddedRows: number
  embeddedBytes: number
  artifactBytes: number
  findings: SensitivityFinding[]
  truncated: boolean
  status: ShareSafetyStatus
}

export interface TrustedArtifactResult {
  rows: Record<string, unknown>[]
  manifest: ExposureManifest
  shareSafe: boolean
  shareSafety: ExposureManifest & { checks: ShareSafetyCheck[] }
}

export interface TrustOptions {
  context?: AnalyzeContext
  artifactBytes?: number
  evidenceVerified?: boolean
  interactionValid?: boolean
  recipesValid?: boolean
}

export function packageTrustedArtifact(
  spec: AgentReportSpec,
  profile: DataProfile,
  sourceRows: Record<string, unknown>[],
  options: TrustOptions = {}
): TrustedArtifactResult {
  const policy = spec.interactions?.dataPolicy
  const dependencies = collectReportFieldDependencies(spec)
  const available = profile.columns.map(column => column.name)
  const excluded = new Set(policy?.excludeFields ?? [])
  const embeddedFields = policy?.mode === 'full' || !policy
    ? available.filter(field => !excluded.has(field))
    : dependencies.required.filter(field => !excluded.has(field))
  const rows = policy
    ? sourceRows.map(row => Object.fromEntries(embeddedFields.map(field => [field, row[field]])))
    : sourceRows
  const embeddedBytes = Buffer.byteLength(JSON.stringify(rows), 'utf8')
  const artifactBytes = options.artifactBytes ?? embeddedBytes
  const findings = classifyReportFields(profile, options.context)
  const checks = buildChecks(spec, dependencies.excludedConflicts, embeddedFields, findings, artifactBytes, options)
  const status = aggregateStatus(checks)
  const manifest: ExposureManifest = {
    policy: policy?.mode ?? 'legacy',
    embeddedFields,
    excludedFields: [...excluded].sort(),
    embeddedRows: rows.length,
    embeddedBytes,
    artifactBytes,
    findings: findings.filter(item => embeddedFields.includes(item.field) && item.level !== 'safe'),
    truncated: false,
    status
  }
  return { rows, manifest, shareSafe: checks.every(check => check.status === 'passed'), shareSafety: { ...manifest, checks } }
}

export function projectProfileForArtifact(profile: DataProfile, manifest: ExposureManifest): DataProfile {
  const allowed = new Set(manifest.embeddedFields)
  return {
    ...profile,
    columns: profile.columns.filter(column => allowed.has(column.name)),
    quality: profile.quality ? {
      ...profile.quality,
      highNullColumns: profile.quality.highNullColumns.filter(field => allowed.has(field)),
      likelyIdColumns: profile.quality.likelyIdColumns.filter(field => allowed.has(field)),
      duplicateProneDimensions: profile.quality.duplicateProneDimensions.filter(field => allowed.has(field))
    } : undefined,
    correlations: profile.correlations?.filter(item => allowed.has(item.a) && allowed.has(item.b)),
    hints: profile.hints?.filter(hint => hintFields(hint).every(field => allowed.has(field)))
  }
}

function hintFields(hint: NonNullable<DataProfile['hints']>[number]): string[] {
  if (hint.type === 'kpi' || hint.type === 'distribution') return [hint.field]
  if (hint.type === 'time-series') return [hint.xField, ...hint.yFields]
  if (hint.type === 'ranking') return [hint.groupField, hint.measureField]
  if (hint.type === 'share') return [hint.labelField, hint.valueField]
  return [hint.a, hint.b]
}

function buildChecks(
  spec: AgentReportSpec,
  excludedConflicts: string[],
  embeddedFields: string[],
  findings: SensitivityFinding[],
  artifactBytes: number,
  options: TrustOptions
): ShareSafetyCheck[] {
  const policy = spec.interactions?.dataPolicy
  const policyIssues: ShareSafetyIssue[] = []
  if (!policy) policyIssues.push(issue('LEGACY_FULL_ROW_EMBEDDING', 'interactions.dataPolicy', 'Legacy interactive report has no explicit data policy.', 'warning'))
  if (policy?.mode === 'full') policyIssues.push(issue('INTERACTION_FULL_DATA_POLICY_EXPOSURE', 'interactions.dataPolicy.mode', 'Full-row embedding was explicitly selected.', 'warning'))
  if (policy?.mode === 'detail-safe' && !(policy.detailFields?.length)) policyIssues.push(issue('INTERACTION_DETAIL_FIELDS_REQUIRED', 'interactions.dataPolicy.detailFields', 'detail-safe requires at least one detail field.', 'error'))
  for (const field of excludedConflicts) policyIssues.push(issue('INTERACTION_EXCLUDED_FIELD_REQUIRED', 'interactions.dataPolicy.excludeFields', `Excluded field '${field}' is required by the report.`, 'error'))

  const sensitivityIssues = findings.filter(item => embeddedFields.includes(item.field) && item.level !== 'safe').map(item =>
    issue(item.level === 'restricted' ? 'INTERACTION_EMBEDDED_FIELD_RESTRICTED' : 'INTERACTION_EMBEDDED_FIELD_REVIEW', `fields.${item.field}`, `Embedded field '${item.field}' requires ${item.level}.`, item.level === 'restricted' ? 'error' : 'warning')
  )
  const budgetIssues: ShareSafetyIssue[] = artifactBytes > INTERACTIVE_HTML_HARD_BUDGET_BYTES
    ? [issue('INTERACTION_ARTIFACT_TOO_LARGE', 'artifactBytes', `Artifact exceeds hard budget (${artifactBytes} bytes).`, 'error')]
    : artifactBytes > INTERACTIVE_HTML_SOFT_BUDGET_BYTES
      ? [issue('INTERACTION_ARTIFACT_TOO_LARGE', 'artifactBytes', `Artifact exceeds soft budget (${artifactBytes} bytes).`, 'warning')]
      : []
  return [
    check('data_policy', policyIssues),
    check('sensitivity', sensitivityIssues),
    check('artifact_budget', budgetIssues),
    check('interaction_spec', options.interactionValid === false ? [issue('INTERACTION_SPEC_INVALID', 'interactions', 'Interaction validation failed.', 'error')] : []),
    check('published_evidence', options.evidenceVerified === false ? [issue('PUBLISHED_EVIDENCE_NOT_VERIFIED', 'insights', 'Published evidence is not verified.', 'error')] : []),
    check('current_view_recipes', options.recipesValid === false ? [issue('CURRENT_VIEW_RECIPE_INVALID', 'interactions.currentView', 'Current-view recipe validation failed.', 'error')] : [])
  ]
}

function issue(code: string, path: string, message: string, severity: 'warning' | 'error'): ShareSafetyIssue {
  return { code, path, message, severity }
}

function check(id: ShareSafetyCheck['id'], issues: ShareSafetyIssue[]): ShareSafetyCheck {
  return { id, status: issues.some(item => item.severity === 'error') ? 'restricted' : issues.length ? 'review' : 'passed', issues }
}

function aggregateStatus(checks: ShareSafetyCheck[]): ShareSafetyStatus {
  if (checks.some(check => check.status === 'restricted')) return 'restricted'
  return checks.some(check => check.status === 'review') ? 'review' : 'safe'
}
