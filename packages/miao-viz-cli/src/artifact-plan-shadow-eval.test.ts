import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { compactArtifactPlan } from './artifact-plan-schema'
import { planArtifact } from './artifact-planner'
import { analyzeContextSchema } from './context-schema'
import { draftOutcomeBriefSchema } from './outcome-brief-schema'
import { resolveOutcomeBrief } from './outcome-brief-resolver'

const corpusPath = 'test_data/artifact-plan-shadow-eval/cases.json'
const corpusRoot = dirname(corpusPath)
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as {
  cases: Array<{
    id: string
    language: string
    draftBrief: unknown
    contextFixture: string
    expected: {
      status: string
      form: string | null
      renderer: string | null
      pattern: string | null
      clarification: boolean
      reasonCode: string
      shareSafetyRequired?: boolean
      sensitiveDetailsAllowed?: boolean
    }
  }>
}

describe('Artifact Plan shadow eval corpus', () => {
  it('matches every fixed bilingual delivery case and reports local latency', () => {
    const resolverTimes: number[] = []
    const plannerTimes: number[] = []
    const languages = new Set<string>()

    for (const evalCase of corpus.cases) {
      languages.add(evalCase.language)
      const draft = draftOutcomeBriefSchema.parse(evalCase.draftBrief)
      const context = analyzeContextSchema.parse(JSON.parse(
        readFileSync(join(corpusRoot, evalCase.contextFixture), 'utf8')
      ))

      const resolverStart = performance.now()
      const resolved = resolveOutcomeBrief(draft)
      resolverTimes.push(performance.now() - resolverStart)
      const plannerStart = performance.now()
      const plan = planArtifact(resolved, context)
      plannerTimes.push(performance.now() - plannerStart)

      expect(plan.status, evalCase.id).toBe(evalCase.expected.status)
      expect(plan.form, evalCase.id).toBe(evalCase.expected.form)
      expect(plan.renderer, evalCase.id).toBe(evalCase.expected.renderer)
      expect(plan.pattern, evalCase.id).toBe(evalCase.expected.pattern)
      expect(Boolean(plan.clarification), evalCase.id).toBe(evalCase.expected.clarification)
      expect(plan.selectionReasons[0]?.code, evalCase.id).toBe(evalCase.expected.reasonCode)
      expect(plan.clarification === null ? 0 : 1, evalCase.id).toBeLessThanOrEqual(1)
      expect(Buffer.byteLength(JSON.stringify(compactArtifactPlan(plan))), evalCase.id).toBeLessThan(2048)
      if (evalCase.expected.shareSafetyRequired !== undefined) {
        expect(plan.resolvedBrief.trust.shareSafetyRequired, evalCase.id)
          .toBe(evalCase.expected.shareSafetyRequired)
        expect(plan.resolvedBrief.trust.sensitiveDetailsAllowed, evalCase.id)
          .toBe(evalCase.expected.sensitiveDetailsAllowed)
      }
    }

    expect(languages).toEqual(new Set(['zh-CN', 'en']))
    console.info(JSON.stringify({
      shadowEval: {
        cases: corpus.cases.length,
        resolverMedianMs: median(resolverTimes),
        plannerMedianMs: median(plannerTimes),
        targetMedianMs: 200,
        enforced: false
      }
    }))
  })
})

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return Number((sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0)).toFixed(3))
}
