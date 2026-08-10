import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { fingerprintAnalyzeContext } from './analyze-context-fingerprint'
import { instantiateArtifactPlan } from './artifact-instantiator'
import { artifactPlanSchema } from './artifact-plan-schema'
import { compactArtifactPlanV2 } from './artifact-plan-v2-schema'
import { planArtifact } from './artifact-planner'
import { analyzeContextSchema, type AnalyzeContext } from './context-schema'
import { deckSpecSchema } from './deck-schema'
import { draftOutcomeBriefSchema } from './outcome-brief-schema'
import { resolveOutcomeBrief } from './outcome-brief-resolver'
import { reportSpecSchema } from './spec-schema'

const corpusPath = 'test_data/artifact-plan-execution-eval/cases.json'
const corpusRoot = dirname(corpusPath)
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as {
  contextFixture: string
  cases: Array<{
    id: string
    variant: string
    brief: unknown
    expected: {
      status: string
      nextAction: string
      adapter: string | null
      targetId: string | null
      canInstantiate: boolean
      specKind: string | null
      code: string | null
      warning?: string
    }
  }>
}

describe('Artifact Plan to Spec execution eval', () => {
  it('matches every fixed routing, safety, and execution case', () => {
    const resolverTimes: number[] = []
    const plannerTimes: number[] = []
    const instantiatorTimes: number[] = []

    for (const evalCase of corpus.cases) {
      const planningContext = loadContext()
      applyPlanningVariant(planningContext, evalCase.variant)
      const resolverStart = performance.now()
      const resolved = resolveOutcomeBrief(draftOutcomeBriefSchema.parse(evalCase.brief))
      resolverTimes.push(performance.now() - resolverStart)
      const plannerStart = performance.now()
      const plan = planArtifact(resolved, planningContext)
      plannerTimes.push(performance.now() - plannerStart)

      expect(plan.status, evalCase.id).toBe(evalCase.expected.status)
      expect(plan.nextAction, evalCase.id).toBe(evalCase.expected.nextAction)
      expect(plan.target?.adapter ?? null, evalCase.id).toBe(evalCase.expected.adapter)
      expect(plan.target?.id ?? null, evalCase.id).toBe(evalCase.expected.targetId)
      expect(plan.clarification === null ? 0 : 1, evalCase.id).toBeLessThanOrEqual(1)
      expect(Buffer.byteLength(JSON.stringify(compactArtifactPlanV2(plan))), evalCase.id).toBeLessThan(2048)
      if (evalCase.expected.warning) {
        expect(plan.warnings.some(item => item.code === evalCase.expected.warning), evalCase.id).toBe(true)
      }

      const executionContext = structuredClone(planningContext)
      let executablePlan: unknown = plan
      applyExecutionVariant(executionContext, plan, evalCase.variant)
      if (evalCase.variant === 'v1-plan') executablePlan = toV1(plan)
      const instantiatorStart = performance.now()
      const result = instantiateArtifactPlan(executablePlan, executionContext)
      instantiatorTimes.push(performance.now() - instantiatorStart)

      if (evalCase.expected.canInstantiate) {
        expect('ok' in result ? result.ok : true, evalCase.id).toBe(true)
        if ('ok' in result) continue
        expect(result.specKind, evalCase.id).toBe(evalCase.expected.specKind)
        const valid = result.specKind === 'report'
          ? reportSpecSchema.safeParse(result.spec).success
          : deckSpecSchema.safeParse(result.spec).success
        expect(valid, evalCase.id).toBe(true)
      } else {
        expect(result, evalCase.id).toMatchObject({ ok: false, code: evalCase.expected.code })
      }
    }

    console.info(JSON.stringify({ executionEval: {
      cases: corpus.cases.length,
      resolverMedianMs: median(resolverTimes),
      plannerMedianMs: median(plannerTimes),
      instantiatorMedianMs: median(instantiatorTimes),
      totalMedianMs: median(resolverTimes.map((value, index) =>
        value + (plannerTimes[index] ?? 0) + (instantiatorTimes[index] ?? 0))),
      targetMedianMs: 250,
      enforced: false
    } }))
  })
})

function loadContext(): AnalyzeContext {
  return analyzeContextSchema.parse(JSON.parse(readFileSync(join(corpusRoot, corpus.contextFixture), 'utf8')))
}

function applyPlanningVariant(context: AnalyzeContext, variant: string): void {
  if (variant === 'template-only') context.catalog.scenes = []
  if (variant === 'no-target') {
    context.catalog.scenes = []
    context.catalog.templates = []
  }
  if (variant === 'data-clarification') {
    context.clarificationQuestions = [{
      id: 'primary_measure', question: 'Which measure is primary?',
      options: ['sales', 'orders'], blocking: true, appliesTo: 'measure'
    }]
  }
}

function applyExecutionVariant(context: AnalyzeContext, plan: ReturnType<typeof planArtifact>, variant: string): void {
  if (variant === 'stale-after-plan') context.fields[0].role = 'dimension'
  if (variant === 'blocked-after-plan' && plan.target?.adapter === 'report-scene') {
    const id = plan.target.id
    context.catalog.scenes = context.catalog.scenes?.filter(item => item.id !== id)
    context.catalog.blockedScenes = [...(context.catalog.blockedScenes ?? []), { id, reason: 'blocked by eval' }]
    plan.contextHash = fingerprintAnalyzeContext(context)
  }
}

function toV1(plan: ReturnType<typeof planArtifact>) {
  return artifactPlanSchema.parse({
    schemaVersion: '1', briefHash: plan.briefHash, status: plan.status, sourceKind: 'tabular',
    resolvedBrief: plan.resolvedBrief, assumptions: plan.assumptions,
    form: plan.form, renderer: plan.renderer, pattern: plan.target?.id ?? null,
    structureRoles: plan.structureRoles, densityBudget: plan.densityBudget,
    qualityGates: plan.qualityGates, formats: plan.formats,
    selectionReasons: plan.selectionReasons, warnings: plan.warnings, clarification: plan.clarification
  })
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return Number((sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0)).toFixed(3))
}
