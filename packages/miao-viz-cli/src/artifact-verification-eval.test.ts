import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { fingerprintAnalyzeContext } from './analyze-context-fingerprint'
import { fingerprintArtifactData } from './artifact-data-fingerprint'
import { instantiateArtifactPlan } from './artifact-instantiator'
import { artifactPlanSchema } from './artifact-plan-schema'
import { compactArtifactPlanV2 } from './artifact-plan-v2-schema'
import { planArtifact } from './artifact-planner'
import { verifyArtifact } from './artifact-verifier'
import { analyzeContextSchema, type AnalyzeContext } from './context-schema'
import { loadDataset } from './data-loader'
import { instantiateDeck } from './deck-knowledge-registry'
import { draftOutcomeBriefSchema } from './outcome-brief-schema'
import { resolveOutcomeBrief } from './outcome-brief-resolver'
import type { AgentReportSpec, LoadedDataset } from './types'

const corpusPath = 'test_data/artifact-verification-eval/cases.json'
const corpusRoot = dirname(corpusPath)
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as {
  contextFixture: string
  dataFixture: string
  cases: Array<{
    id: string
    variant: string
    brief: unknown
    expected: { status: string; ready: boolean; code: string }
  }>
}

describe('Artifact Verification eval corpus', () => {
  it('binds Plan, Context, Data, and Spec without rendering', () => {
    const resolverTimes: number[] = []
    const plannerTimes: number[] = []
    const instantiatorTimes: number[] = []
    const verifierTimes: number[] = []

    for (const evalCase of corpus.cases) {
      const context = loadContext()
      applyPlanningVariant(context, evalCase.variant)
      const data = loadData()
      const resolverStart = performance.now()
      const resolved = resolveOutcomeBrief(draftOutcomeBriefSchema.parse(evalCase.brief))
      resolverTimes.push(performance.now() - resolverStart)
      const plannerStart = performance.now()
      const plan = planArtifact(resolved, context)
      plannerTimes.push(performance.now() - plannerStart)
      expect(plan.clarification === null ? 0 : 1, evalCase.id).toBeLessThanOrEqual(1)
      expect(Buffer.byteLength(JSON.stringify(compactArtifactPlanV2(plan))), evalCase.id).toBeLessThan(2048)

      const instantiateStart = performance.now()
      const initial = instantiateArtifactPlan(plan, context, { confirmPlan: true })
      instantiatorTimes.push(performance.now() - instantiateStart)
      let spec: unknown = 'ok' in initial ? { charts: [] } : structuredClone(initial.spec)
      let executablePlan: unknown = plan
      let executionContext = structuredClone(context)
      let executionData = structuredClone(data)
      ;({ spec, executablePlan, executionContext, executionData } = applyExecutionVariant(
        evalCase.variant, spec, plan, executionContext, executionData
      ))

      const verifierStart = performance.now()
      const result = verifyArtifact({ plan: executablePlan, context: executionContext, dataset: executionData, spec })
      verifierTimes.push(performance.now() - verifierStart)
      if ('ok' in result) {
        expect(evalCase.expected.status, evalCase.id).toBe('error')
        expect(result.code, evalCase.id).toBe(evalCase.expected.code)
        continue
      }
      expect(result.status, evalCase.id).toBe(evalCase.expected.status)
      expect(result.renderReadiness.ready, evalCase.id).toBe(evalCase.expected.ready)
      const codes = [
        ...result.checks.map(item => item.code), ...result.repairHints.map(item => item.code),
        ...result.renderReadiness.blockingCodes
      ]
      expect(codes, evalCase.id).toContain(evalCase.expected.code)
      expect('rows' in result, evalCase.id).toBe(false)
      expect(JSON.stringify(result), evalCase.id).not.toContain('2026-01-01')
    }

    const totals = resolverTimes.map((value, index) => value + plannerTimes[index] + instantiatorTimes[index] + verifierTimes[index])
    console.info(JSON.stringify({ verificationEval: {
      cases: corpus.cases.length,
      resolverMedianMs: median(resolverTimes), plannerMedianMs: median(plannerTimes),
      instantiatorMedianMs: median(instantiatorTimes), verifierMedianMs: median(verifierTimes),
      totalMedianMs: median(totals), targetMedianMs: 500, enforced: false
    } }))
  })
})

function loadContext(): AnalyzeContext {
  return analyzeContextSchema.parse(JSON.parse(readFileSync(join(corpusRoot, corpus.contextFixture), 'utf8')))
}

function loadData(): LoadedDataset {
  const result = loadDataset(join(corpusRoot, corpus.dataFixture))
  if (!result.ok) throw new Error(result.message)
  return result.value
}

function applyPlanningVariant(context: AnalyzeContext, variant: string): void {
  if (variant === 'template-only') context.catalog.scenes = []
  if (variant === 'clarification') context.clarificationQuestions = [{
    id: 'primary_measure', question: 'Which measure is primary?', options: ['sales', 'orders'],
    blocking: true, appliesTo: 'measure'
  }]
}

function applyExecutionVariant(
  variant: string, originalSpec: unknown, originalPlan: ReturnType<typeof planArtifact>,
  originalContext: AnalyzeContext, originalData: LoadedDataset
) {
  let spec = originalSpec
  let executablePlan: unknown = originalPlan
  const executionContext = originalContext
  let executionData = originalData
  const report = spec as AgentReportSpec
  if (variant === 'spec-kind') spec = instantiateDeck('executive-brief', originalContext)
  if (variant === 'title-edit' && report.charts) report.title = 'Edited title'
  if (variant === 'missing-field' && report.charts) firstEncoding(report).field = 'missing_field'
  if (variant === 'invalid-encoding' && report.charts) delete report.charts[0].encoding
  if (variant === 'missing-evidence-id' && report.charts) setProvenance(report, ['missing_evidence'], ['$evidence:total.value'])
  if (variant === 'missing-evidence-path' && report.charts) setProvenance(report, ['total'], ['$evidence:total.missing'])
  if (variant === 'stale-context') executionContext.fields[0].role = 'dimension'
  if (variant === 'blocked-target' && originalPlan.target?.adapter === 'report-scene') {
    const id = originalPlan.target.id
    executionContext.catalog.scenes = executionContext.catalog.scenes?.filter(item => item.id !== id)
    executionContext.catalog.blockedScenes = [...(executionContext.catalog.blockedScenes ?? []), { id, reason: 'blocked' }]
    originalPlan.contextHash = fingerprintAnalyzeContext(executionContext)
  }
  if (variant === 'data-column') executionData = {
    ...executionData, columns: [...executionData.columns, 'profit'],
    rows: executionData.rows.map(row => ({ ...row, profit: 1 }))
  }
  if (variant === 'data-value') {
    const before = fingerprintArtifactData(executionData)
    executionData.rows[0].sales = 11
    expect(fingerprintArtifactData(executionData)).not.toBe(before)
  }
  if (variant === 'v1') executablePlan = toV1(originalPlan)
  return { spec, executablePlan, executionContext, executionData }
}

function firstEncoding(spec: AgentReportSpec): { field: string } {
  return Object.values(spec.charts[0].encoding ?? {})[0] as { field: string }
}

function setProvenance(spec: AgentReportSpec, evidence: string[], derivedFrom: string[]): void {
  spec.charts[0].provenance = { evidence, derivedFrom }
}

function toV1(plan: ReturnType<typeof planArtifact>) {
  return artifactPlanSchema.parse({
    schemaVersion: '1', briefHash: plan.briefHash, status: plan.status, sourceKind: 'tabular',
    resolvedBrief: plan.resolvedBrief, assumptions: plan.assumptions, form: plan.form,
    renderer: plan.renderer, pattern: plan.target?.id ?? null, structureRoles: plan.structureRoles,
    densityBudget: plan.densityBudget, qualityGates: plan.qualityGates, formats: plan.formats,
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
