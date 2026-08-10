import { describe, expect, it } from 'vitest'
import {
  draftOutcomeBriefSchema,
  outcomeAssumptionSchema,
  outcomeClarificationSchema,
  resolvedOutcomeBriefSchema
} from './outcome-brief-schema'

describe('draftOutcomeBriefSchema', () => {
  it('accepts the sparse minimum', () => {
    expect(draftOutcomeBriefSchema.parse({
      schemaVersion: '1',
      rawRequest: '给老板看经营数据'
    })).toEqual({ schemaVersion: '1', rawRequest: '给老板看经营数据' })
  })

  it('accepts every V1 input field', () => {
    expect(draftOutcomeBriefSchema.safeParse({
      schemaVersion: '1',
      rawRequest: 'Prepare the quarterly review',
      audience: { role: 'Leadership', scope: 'internal', dataLiteracy: 'business' },
      goal: { purpose: 'decide', keyQuestion: 'Where should we invest?', decision: 'Approve budget' },
      delivery: { context: 'meeting', form: 'presentation', density: 'concise', tone: 'executive' },
      trust: { evidencePolicy: 'strict', privacy: 'internal' },
      presentation: { locale: 'en-US', brandProfileRef: 'brand/default.json' },
      lifecycle: {
        mode: 'recurring',
        period: { start: '2026-01-01', end: '2026-03-31' },
        cadence: 'quarterly'
      }
    }).success).toBe(true)
  })

  it.each([
    [{ schemaVersion: '1', rawRequest: '' }, ['rawRequest']],
    [{ schemaVersion: '1', rawRequest: 'x', delivery: { form: 'dashboard' } }, ['delivery', 'form']],
    [{
      schemaVersion: '1', rawRequest: 'x',
      lifecycle: { period: { start: '2026-03-02', end: '2026-03-01' } }
    }, ['lifecycle', 'period', 'end']]
  ])('returns a stable issue path for invalid input', (input, expectedPath) => {
    const result = draftOutcomeBriefSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(expectedPath)
  })
})

describe('resolvedOutcomeBriefSchema', () => {
  const resolved = {
    schemaVersion: '1' as const,
    rawRequest: 'Monthly performance report',
    audience: { role: 'Manager', scope: 'internal' as const, dataLiteracy: 'business' as const },
    goal: { purpose: 'review' as const, keyQuestion: null, decision: null },
    delivery: {
      context: 'archive' as const, form: 'report' as const,
      density: 'detailed' as const, tone: 'analytical' as const
    },
    trust: {
      evidencePolicy: 'strict' as const, privacy: 'internal' as const,
      shareSafetyRequired: false, sensitiveDetailsAllowed: true, recipientReady: true
    },
    presentation: { locale: 'en', brandProfileRef: null },
    lifecycle: { mode: 'recurring' as const, period: null, cadence: 'monthly' as const }
  }

  it('requires all resolved fields', () => {
    expect(resolvedOutcomeBriefSchema.safeParse(resolved).success).toBe(true)
    expect(resolvedOutcomeBriefSchema.safeParse({ ...resolved, audience: undefined }).success).toBe(false)
  })

  it('rejects an incomplete recurring lifecycle at a stable path', () => {
    const result = resolvedOutcomeBriefSchema.safeParse({
      ...resolved,
      lifecycle: { mode: 'recurring', period: null, cadence: null }
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['lifecycle', 'cadence'])
  })
})

describe('outcome planning support schemas', () => {
  it('validates assumptions and clarifications independently', () => {
    expect(outcomeAssumptionSchema.safeParse({
      field: 'delivery.density', value: 'standard', source: 'default',
      reasonCode: 'default_density', reason: 'No density was supplied.'
    }).success).toBe(true)
    expect(outcomeClarificationSchema.safeParse({
      field: 'delivery.form', question: 'Will this be presented or read?',
      options: ['Present it', 'Read it'], reasonCode: 'ambiguous_delivery', blocking: true
    }).success).toBe(true)
  })
})
