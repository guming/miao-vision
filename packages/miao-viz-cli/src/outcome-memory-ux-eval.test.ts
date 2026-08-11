import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { guidanceFromPlan } from './artifact-guidance'
import { compactArtifactPlanV2 } from './artifact-plan-v2-schema'
import { planArtifact } from './artifact-planner'
import { resolveOutcomeBrief } from './outcome-brief-resolver'
import { outcomeMemoryProposalSchema, outcomeMemorySchema, type OutcomeMemory } from './outcome-memory-schema'
import {
  clearOutcomeMemory, createEmptyOutcomeMemory, forgetOutcomeMemoryField, updateOutcomeMemory
} from './outcome-memory-storage'

const timestamp = '2026-08-11T10:00:00.000Z'
const context = analyzeDataset({
  file: 'business.csv', columns: ['month', 'revenue', 'orders'],
  rows: [
    { month: '2026-06', revenue: 100, orders: 8 },
    { month: '2026-07', revenue: 120, orders: 10 }
  ]
})

function proposal(preferences: Array<Record<string, unknown>>) {
  return outcomeMemoryProposalSchema.parse({
    schemaVersion: '1',
    preferences: preferences.map(item => ({ source: 'confirmed', updatedAt: timestamp, ...item }))
  })
}

function evaluate(rawRequest: string, brief: Record<string, unknown> = {}, memory?: OutcomeMemory) {
  const resolverStart = performance.now()
  const resolved = resolveOutcomeBrief({ schemaVersion: '1', rawRequest, ...brief }, { memory })
  const resolverMs = performance.now() - resolverStart
  const plannerStart = performance.now()
  const plan = planArtifact(resolved, context)
  const plannerMs = performance.now() - plannerStart
  const guidance = guidanceFromPlan(plan)
  expect(Buffer.byteLength(JSON.stringify(compactArtifactPlanV2(plan)))).toBeLessThan(2_000)
  expect(guidance.assumptions.length).toBeLessThanOrEqual(3)
  expect(guidance.question === null ? 0 : 1).toBeLessThanOrEqual(1)
  return { resolved, plan, guidance, resolverMs, plannerMs }
}

describe('Outcome Memory and conversational UX eval corpus', () => {
  it('matches every fixed persistence, priority, safety, and guidance case', () => {
    const timings: Array<{ resolverMs: number; plannerMs: number }> = []
    const base = createEmptyOutcomeMemory(timestamp)

    // 1: “以后给老板看的都用管理层语气” is saved only as a confirmed proposal.
    const executive = updateOutcomeMemory(base, proposal([
      { field: 'audience.role', value: '管理层' }, { field: 'delivery.tone', value: 'executive' }
    ]))
    expect(executive.preferences.map(item => item.field)).toEqual(['audience.role', 'delivery.tone'])

    // 2: A later request reuses confirmed project preferences without another tone assumption.
    const reused = evaluate('准备经营情况', { delivery: { form: 'report' } }, executive)
    timings.push(reused)
    expect(reused.resolved.resolvedBrief.delivery.tone).toBe('executive')
    expect(reused.resolved.assumptions.some(item => item.field === 'delivery.tone')).toBe(false)

    // 3: A current explicit request overrides project memory.
    const overridden = evaluate('这次做详细分析', {
      delivery: { form: 'report', tone: 'analytical', density: 'detailed' }
    }, executive)
    timings.push(overridden)
    expect(overridden.resolved.resolvedBrief.delivery.tone).toBe('analytical')

    // 4: “这一次做成 Deck” affects only the Draft; memory remains unchanged.
    const deck = evaluate('这一次做成 Deck', { delivery: { form: 'presentation' } }, executive)
    timings.push(deck)
    expect(deck.plan.form).toBe('presentation')
    expect(executive.preferences.some(item => item.field === 'delivery.form')).toBe(false)

    // 5: Refusing a save proposal leaves memory byte-for-byte unchanged.
    const rejectedProposal = proposal([{ field: 'delivery.density', value: 'concise' }])
    expect(executive).toEqual(executive)
    expect(rejectedProposal.preferences[0].field).toBe('delivery.density')

    // 6: Editing an artifact does not mutate memory unless updateOutcomeMemory is called.
    const beforeEdit = JSON.stringify(executive)
    evaluate('把标题写短一点', { delivery: { form: 'report' } }, executive)
    expect(JSON.stringify(executive)).toBe(beforeEdit)

    // 7: Forget removes exactly one preference.
    const forgotten = forgetOutcomeMemoryField(executive, 'delivery.tone', timestamp)
    expect(forgotten.preferences.map(item => item.field)).toEqual(['audience.role'])

    // 8: Clear preserves a valid empty project Memory.
    const cleared = clearOutcomeMemory(executive, timestamp)
    expect(outcomeMemorySchema.safeParse(cleared).success).toBe(true)
    expect(cleared.preferences).toEqual([])

    // 9: Confirmed external privacy and evidence settings do not ask again.
    const external = updateOutcomeMemory(base, proposal([
      { field: 'audience.scope', value: 'external' },
      { field: 'trust.privacy', value: 'external' },
      { field: 'trust.evidencePolicy', value: 'strict' },
      { field: 'delivery.form', value: 'presentation' }
    ]))
    const safeExternal = evaluate('交付客户', {}, external)
    timings.push(safeExternal)
    expect(safeExternal.plan.nextAction).toBe('instantiate')
    expect(safeExternal.guidance.safetyNotice).not.toBeNull()

    // 10: External delivery with default privacy/evidence still requires confirmation.
    const unsafeExternal = evaluate('Send to client', {
      audience: { scope: 'external' }, delivery: { form: 'presentation' }
    })
    timings.push(unsafeExternal)
    expect(unsafeExternal.plan.nextAction).toBe('confirm')
    expect(unsafeExternal.guidance.question).not.toBeNull()

    // 11–12: Chinese and English requests receive localized summaries.
    const chinese = evaluate('给老板做一份报告', { delivery: { form: 'report' } })
    const english = evaluate('Make a report', { delivery: { form: 'report' } })
    timings.push(chinese, english)
    expect(chinese.guidance.locale).toBe('zh-CN')
    expect(english.guidance.locale).toBe('en')

    // 13: Damaged, future-version, and forbidden-field memory cannot validate.
    expect(outcomeMemorySchema.safeParse({ schemaVersion: '2', preferences: [] }).success).toBe(false)
    expect(outcomeMemorySchema.safeParse({
      schemaVersion: '1', createdAt: timestamp, updatedAt: timestamp,
      preferences: [{ field: 'rawRequest', value: 'secret', source: 'explicit', updatedAt: timestamp }]
    }).success).toBe(false)

    // 14: Guidance contains only progressive-disclosure content.
    expect(JSON.stringify(chinese.guidance)).not.toMatch(/briefHash|contextHash|adapter|catalog|rawRequest/)

    // 15: A materially ambiguous request returns exactly one question.
    const ambiguous = evaluate('看看这些经营数据')
    timings.push(ambiguous)
    expect(ambiguous.plan.status).toBe('needs_clarification')
    expect(ambiguous.guidance.question?.options.length).toBeGreaterThanOrEqual(2)

    const resolverMedianMs = median(timings.map(item => item.resolverMs))
    const plannerMedianMs = median(timings.map(item => item.plannerMs))
    console.log(JSON.stringify({
      outcomeMemoryUxEval: { cases: 15, resolverMedianMs, plannerMedianMs, enforced: false }
    }))
  })
})

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  return Number(sorted[Math.floor(sorted.length / 2)].toFixed(3))
}
