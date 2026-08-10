import { fingerprintAnalyzeContext } from './analyze-context-fingerprint'
import { parseReadableArtifactPlan } from './artifact-plan-schema'
import type { ArtifactPlanV2, CompactArtifactPlanV2 } from './artifact-plan-v2-schema'
import type { AnalyzeContext } from './context-schema'
import { instantiateDeck } from './deck-knowledge-registry'
import type { DeckSpec } from './deck-types'
import { agentError, isAgentError } from './errors'
import type { BlockMatchContext } from './report-block-registry'
import { getScene, instantiateScene } from './report-scene-registry'
import { getTemplateById } from './report-template-registry'
import { hashValue } from './report-project-storage'
import type { AgentError, AgentReportSpec } from './types'

type ExecutablePlan = ArtifactPlanV2 | CompactArtifactPlanV2

export interface InstantiateArtifactOptions {
  confirmPlan?: boolean
}

export interface InstantiatedArtifactPlan {
  specKind: 'report' | 'deck'
  spec: AgentReportSpec | DeckSpec
  adapter: NonNullable<ExecutablePlan['target']>['adapter']
  targetId: string
  briefHash: string
  contextHash: string
  planHash: string
  appliedConstraints: string[]
  deferredConstraints: string[]
  warnings: ExecutablePlan['warnings']
}

export function instantiateArtifactPlan(
  input: unknown,
  context: AnalyzeContext,
  options: InstantiateArtifactOptions = {}
): InstantiatedArtifactPlan | AgentError {
  const readable = parseReadableArtifactPlan(input)
  if (!readable) return agentError('INVALID_ARTIFACT_PLAN', 'Artifact Plan format is invalid.')
  if (!readable.executable) {
    return agentError('PLAN_NOT_EXECUTABLE', 'Artifact Plan V1 is readable but cannot be instantiated.', {
      schemaVersion: readable.schemaVersion
    })
  }
  const plan = readable.plan
  if (plan.status !== 'ready' && plan.status !== 'ready_with_assumptions') {
    return agentError('PLAN_STATUS_BLOCKED', `Artifact Plan status '${plan.status}' cannot be instantiated.`, {
      status: plan.status, nextAction: plan.nextAction
    })
  }
  if (plan.nextAction === 'confirm' && !options.confirmPlan) {
    return agentError('PLAN_CONFIRMATION_REQUIRED', 'Artifact Plan requires explicit confirmation before instantiation.', {
      nextAction: plan.nextAction
    })
  }
  const contextHash = fingerprintAnalyzeContext(context)
  if (plan.contextHash !== contextHash) {
    return agentError('PLAN_CONTEXT_MISMATCH', 'Artifact Plan was created for a different Analyze Context.', {
      expectedContextHash: plan.contextHash, actualContextHash: contextHash
    })
  }
  if (!plan.target) return agentError('INVALID_ARTIFACT_PLAN', 'Executable Artifact Plan is missing a target.')

  const spec = instantiateTarget(plan.target, context)
  if (isAgentError(spec)) return spec
  return {
    specKind: plan.target.adapter === 'deck-pattern' ? 'deck' : 'report',
    spec,
    adapter: plan.target.adapter,
    targetId: plan.target.id,
    briefHash: plan.briefHash,
    contextHash: plan.contextHash,
    planHash: hashValue(plan),
    appliedConstraints: ['artifact-form', 'execution-target', 'context-binding', 'catalog-compliance'],
    deferredConstraints: [
      'density-budget', 'delivery-tone', 'presentation-locale',
      'brand-profile', 'quality-gates', 'output-formats'
    ],
    warnings: plan.warnings
  }
}

function instantiateTarget(
  target: NonNullable<ExecutablePlan['target']>,
  context: AnalyzeContext
): AgentReportSpec | DeckSpec | AgentError {
  const matchContext: BlockMatchContext = {
    fields: context.fields,
    evidence: context.evidence,
    catalog: context.catalog,
    sampleWarnings: context.sampleWarnings,
    metricCandidates: context.metricCandidates
  }
  if (target.adapter === 'report-scene') {
    const blocked = context.catalog.blockedScenes?.find(item => item.id === target.id)
    if (blocked) return blockedTarget(target, blocked.reason)
    if (!context.catalog.scenes?.some(item => item.id === target.id)) return unavailableTarget(target)
    const scene = getScene(target.id)
    if (!scene) return unavailableTarget(target)
    const decision = scene.canUse(matchContext)
    if (!decision.ok) return unavailableTarget(target, decision.reason)
    return instantiateScene(scene, matchContext) ?? unavailableTarget(target, 'No applicable scene template.')
  }
  if (target.adapter === 'report-template') {
    const blocked = context.catalog.blockedTemplates?.find(item => item.id === target.id)
    if (blocked) return blockedTarget(target, blocked.reason)
    if (!context.catalog.templates?.some(item => item.id === target.id)) return unavailableTarget(target)
    const template = getTemplateById(target.id)
    if (!template) return unavailableTarget(target)
    const decision = template.canUse(matchContext)
    if (!decision.ok) return unavailableTarget(target, decision.reason)
    return template.instantiate(matchContext)
  }
  if (!context.catalog.deckPatterns?.some(item => item.id === target.id)) return unavailableTarget(target)
  return instantiateDeck(target.id, context)
}

function blockedTarget(target: NonNullable<ExecutablePlan['target']>, reason: string): AgentError {
  return agentError('PLAN_TARGET_BLOCKED', `Artifact Plan target '${target.id}' is blocked.`, {
    adapter: target.adapter, targetId: target.id, reason
  })
}

function unavailableTarget(target: NonNullable<ExecutablePlan['target']>, reason?: string): AgentError {
  return agentError('PLAN_TARGET_UNAVAILABLE', `Artifact Plan target '${target.id}' is unavailable.`, {
    adapter: target.adapter, targetId: target.id, ...(reason ? { reason } : {})
  })
}
