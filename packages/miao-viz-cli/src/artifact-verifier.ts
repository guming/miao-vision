import { fingerprintAnalyzeContext } from './analyze-context-fingerprint'
import { fingerprintArtifactData } from './artifact-data-fingerprint'
import { instantiateArtifactPlan } from './artifact-instantiator'
import { parseReadableArtifactPlan } from './artifact-plan-schema'
import type { ArtifactPlanV2, CompactArtifactPlanV2 } from './artifact-plan-v2-schema'
import { fingerprintArtifactSpec, type ArtifactSpecKind } from './artifact-spec-fingerprint'
import {
  artifactVerificationSchema, type ArtifactEvidenceCoverage,
  type ArtifactRepairHint, type ArtifactVerification, type ArtifactVerificationCheck
} from './artifact-verification-schema'
import type { AnalyzeContext } from './context-schema'
import { collectDeckKnowledgeIssues, deckKnowledgeErrors } from './deck-knowledge-validator'
import { validateDeckProvenance } from './deck-provenance'
import { parseDeckSpec, validateDeckFields } from './deck-validator'
import type { DeckSpec } from './deck-types'
import { agentError, isAgentError } from './errors'
import { profileDataset } from './data-profiler'
import { validateProvenance } from './provenance-validator'
import { hashValue } from './report-project-storage'
import { collectVerifyIssues, validateReportSpec } from './spec-validator'
import type { AgentError, AgentOutputFormat, AgentReportSpec, LoadedDataset } from './types'

export interface VerifyArtifactInput {
  plan: unknown
  context: AnalyzeContext
  dataset: LoadedDataset
  spec: unknown
}

export function verifyArtifact(input: VerifyArtifactInput): ArtifactVerification | AgentError {
  const readable = parseReadableArtifactPlan(input.plan)
  if (!readable) return agentError('INVALID_ARTIFACT_PLAN', 'Artifact Plan format is invalid.')
  if (!readable.executable) {
    return agentError('PLAN_NOT_EXECUTABLE', 'Artifact Plan V1 is readable but cannot be verified.', {
      schemaVersion: readable.schemaVersion
    })
  }
  const plan = readable.plan
  const expectedKind: ArtifactSpecKind = plan.target?.adapter === 'deck-pattern' ? 'deck' : 'report'
  const actualKind = detectSpecKind(input.spec)
  if (actualKind && actualKind !== expectedKind) {
    return agentError('SPEC_KIND_MISMATCH', `Plan requires a ${expectedKind} Spec, but received ${actualKind}.`, {
      expectedSpecKind: expectedKind, actualSpecKind: actualKind
    })
  }
  const base = verificationBase(plan, expectedKind, input.spec, input.dataset)
  if (plan.status !== 'ready' && plan.status !== 'ready_with_assumptions') {
    return blocked(base, 'PLAN_STATUS_BLOCKED', `Plan status '${plan.status}' cannot be verified.`)
  }
  if (fingerprintAnalyzeContext(input.context) !== plan.contextHash) {
    return blocked(base, 'PLAN_CONTEXT_MISMATCH', 'Artifact Plan was created for a different Analyze Context.')
  }
  const dataIssue = dataContextIssue(input.dataset, input.context)
  if (dataIssue) return blocked(base, 'DATA_CONTEXT_MISMATCH', dataIssue)

  const targetCheck = instantiateArtifactPlan(plan, input.context, { confirmPlan: true })
  if (isAgentError(targetCheck)) {
    const code = targetCheck.code === 'PLAN_TARGET_BLOCKED' ? 'ARTIFACT_TARGET_BLOCKED' : targetCheck.code
    return blocked(base, code, targetCheck.message)
  }
  return expectedKind === 'report'
    ? verifyReport(base, input.spec, input.dataset, input.context, plan.formats)
    : verifyDeck(base, input.spec, input.dataset, input.context)
}

function verifyReport(
  base: VerificationBase, rawSpec: unknown, dataset: LoadedDataset,
  context: AnalyzeContext, formats: string[]
): ArtifactVerification {
  const profile = profileDataset(dataset)
  const validated = validateReportSpec(rawSpec, profile, formats as AgentOutputFormat[], context)
  if (isAgentError(validated)) return repair(base, validated)
  const semanticIssues = collectVerifyIssues(validated.value, context)
  const provenance = validateProvenance(validated.value, context)
  const issues = [...semanticIssues, ...provenance.issues]
  if (issues.length) {
    return repair(base, agentError('EVIDENCE_VALIDATION_FAILED', issues[0].message, { issues }), provenance.coverage)
  }
  return verified(base, provenance.coverage, formats)
}

function verifyDeck(
  base: VerificationBase, rawSpec: unknown, dataset: LoadedDataset, context: AnalyzeContext
): ArtifactVerification {
  const parsed = parseDeckSpec(rawSpec)
  if (isAgentError(parsed)) return repair(base, parsed)
  const fields = validateDeckFields(parsed.value, profileDataset(dataset))
  if (isAgentError(fields)) return repair(base, fields)
  const knowledgeIssues = collectDeckKnowledgeIssues(parsed.value, context, true)
  const knowledgeErrors = deckKnowledgeErrors(knowledgeIssues)
  if (knowledgeErrors.length) {
    const first = knowledgeErrors[0]
    return repair(base, agentError(first.code, first.message, { issues: knowledgeErrors }))
  }
  const provenance = validateDeckProvenance(parsed.value, context)
  if (provenance.issues.length) {
    return repair(base, agentError('EVIDENCE_VALIDATION_FAILED', provenance.issues[0].message, {
      issues: provenance.issues
    }), provenance.coverage)
  }
  return verified(base, provenance.coverage, ['html', 'pdf'])
}

interface VerificationBase {
  specKind: ArtifactSpecKind
  adapter: 'report-scene' | 'report-template' | 'deck-pattern'
  targetId: string
  briefHash: string
  contextHash: string
  planHash: string
  specHash: string
  dataFingerprint: string
}

type ExecutablePlan = ArtifactPlanV2 | CompactArtifactPlanV2

function verificationBase(
  plan: ExecutablePlan,
  specKind: ArtifactSpecKind, spec: unknown, dataset: LoadedDataset
): VerificationBase {
  return {
    specKind, adapter: plan.target?.adapter ?? (specKind === 'deck' ? 'deck-pattern' : 'report-scene'),
    targetId: plan.target?.id ?? 'unresolved', briefHash: plan.briefHash, contextHash: plan.contextHash,
    planHash: hashValue(plan), specHash: specFingerprint(specKind, spec),
    dataFingerprint: fingerprintArtifactData(dataset)
  }
}

function specFingerprint(specKind: ArtifactSpecKind, spec: unknown): string {
  return specKind === 'deck'
    ? fingerprintArtifactSpec('deck', spec as DeckSpec)
    : fingerprintArtifactSpec('report', spec as AgentReportSpec)
}

function verified(
  base: VerificationBase, evidenceCoverage: ArtifactEvidenceCoverage, allowedFormats: string[]
): ArtifactVerification {
  return artifactVerificationSchema.parse({
    schemaVersion: '1', status: 'verified', ...base,
    checks: passedChecks(), evidenceCoverage, warnings: [], repairHints: [],
    renderReadiness: { ready: true, allowedFormats, blockingCodes: [] }
  })
}

function repair(
  base: VerificationBase, error: AgentError, evidenceCoverage?: ArtifactEvidenceCoverage
): ArtifactVerification {
  const hints = repairHints(error)
  return artifactVerificationSchema.parse({
    schemaVersion: '1', status: 'needs_repair', ...base,
    checks: [...passedChecks().slice(0, 3), check(error.code, 'failed', error.message)],
    ...(evidenceCoverage ? { evidenceCoverage } : {}), warnings: [], repairHints: hints,
    renderReadiness: { ready: false, allowedFormats: [], blockingCodes: [] }
  })
}

function blocked(base: VerificationBase, code: string, message: string): ArtifactVerification {
  return artifactVerificationSchema.parse({
    schemaVersion: '1', status: 'blocked', ...base,
    checks: [check(code, 'failed', message)], warnings: [], repairHints: [],
    renderReadiness: { ready: false, allowedFormats: [], blockingCodes: [code] }
  })
}

function passedChecks(): ArtifactVerificationCheck[] {
  return [
    check('PLAN_CONTEXT', 'passed', 'Plan and Analyze Context match.'),
    check('PLAN_TARGET', 'passed', 'Catalog target is available.'),
    check('DATA_CONTEXT', 'passed', 'Data schema matches Analyze Context.'),
    check('SPEC_VALIDATION', 'passed', 'Artifact Spec is valid.'),
    check('EVIDENCE_VALIDATION', 'passed', 'Evidence and provenance are valid.')
  ]
}

function check(code: string, status: 'passed' | 'warning' | 'failed', message: string): ArtifactVerificationCheck {
  return { code, status, message }
}

function repairHints(error: AgentError): ArtifactRepairHint[] {
  const issues = Array.isArray(error.issues) ? error.issues : Array.isArray(error.errors) ? error.errors : [error]
  return issues.slice(0, 20).map((raw, index) => {
    const issue = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    return {
      code: String(issue.code ?? error.code ?? 'SPEC_VALIDATION_FAILED'),
      path: String(issue.path ?? issue.field ?? error.path ?? 'spec'),
      problem: String(issue.message ?? error.message),
      action: String(issue.hint ?? error.hint ?? 'Update the referenced Spec field and validate again.')
    }
  })
}

function detectSpecKind(spec: unknown): ArtifactSpecKind | null {
  if (!spec || typeof spec !== 'object') return null
  if (Array.isArray((spec as { slides?: unknown }).slides)) return 'deck'
  if (Array.isArray((spec as { charts?: unknown }).charts)) return 'report'
  return null
}

function dataContextIssue(dataset: LoadedDataset, context: AnalyzeContext): string | null {
  const profile = profileDataset(dataset)
  const actual = new Map(profile.columns.map(field => [field.name, field.type]))
  const expected = new Map(context.fields.map(field => [field.name, field.type]))
  const missing = [...expected.keys()].filter(name => !actual.has(name))
  const extra = [...actual.keys()].filter(name => !expected.has(name))
  const changed = [...expected].filter(([name, type]) => actual.has(name) && actual.get(name) !== type).map(([name]) => name)
  if (!missing.length && !extra.length && !changed.length) return null
  return `Data schema differs from Analyze Context (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}; type changes: ${changed.join(', ') || 'none'}).`
}
