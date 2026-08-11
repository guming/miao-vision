import { describe, expect, it } from 'vitest'
import { hashBrief, resolveOutcomeBrief } from './outcome-brief-resolver'
import { outcomeMemorySchema } from './outcome-memory-schema'

const timestamp = '2026-08-11T10:00:00.000Z'
const memory = outcomeMemorySchema.parse({
  schemaVersion: '1', createdAt: timestamp, updatedAt: timestamp,
  preferences: [
    { field: 'delivery.tone', value: 'executive', source: 'confirmed', updatedAt: timestamp },
    { field: 'delivery.density', value: 'concise', source: 'explicit', updatedAt: timestamp },
    { field: 'trust.privacy', value: 'external', source: 'confirmed', updatedAt: timestamp },
    { field: 'trust.evidencePolicy', value: 'cited', source: 'confirmed', updatedAt: timestamp }
  ]
})

describe('resolveOutcomeBrief', () => {
  it('applies explicit, project, source hint, then default priority', () => {
    const result = resolveOutcomeBrief({
      schemaVersion: '1', rawRequest: 'Build a report',
      delivery: { density: 'detailed' }
    }, {
      project: { delivery: { density: 'concise', tone: 'executive' } },
      sourceHint: { delivery: { density: 'standard', tone: 'editorial', context: 'email' } }
    })

    expect(result.resolvedBrief.delivery).toMatchObject({
      density: 'detailed', tone: 'executive', context: 'email', form: 'auto'
    })
    expect(result.assumptions.find(item => item.field === 'delivery.density')).toBeUndefined()
    expect(result.assumptions.find(item => item.field === 'delivery.tone')?.source).toBe('project')
    expect(result.assumptions.find(item => item.field === 'delivery.context')?.source).toBe('source_hint')
  })

  it('uses tabular-safe defaults and infers Chinese locale', () => {
    const result = resolveOutcomeBrief({ schemaVersion: '1', rawRequest: '给老板看经营数据' })
    expect(result.resolvedBrief).toMatchObject({
      audience: { scope: 'self' },
      goal: { purpose: 'inform' },
      delivery: { form: 'auto', context: 'chat', density: 'standard', tone: 'analytical' },
      trust: { evidencePolicy: 'strict', privacy: 'personal' },
      presentation: { locale: 'zh-CN' },
      lifecycle: { mode: 'one-off' }
    })
  })

  it('applies explicit values before memory, then project, source hint, and defaults', () => {
    const result = resolveOutcomeBrief({
      schemaVersion: '1', rawRequest: 'Current task', delivery: { density: 'detailed' }
    }, {
      memory,
      project: { delivery: { density: 'standard', tone: 'editorial' } },
      sourceHint: { delivery: { context: 'email', tone: 'analytical' } }
    })
    expect(result.resolvedBrief.delivery).toMatchObject({
      density: 'detailed', tone: 'executive', context: 'email', form: 'auto'
    })
    expect(result.assumptions.some(item => item.field === 'delivery.tone')).toBe(false)
    expect(result.assumptions.find(item => item.field === 'delivery.context')?.source).toBe('source_hint')
  })

  it('does not repeatedly confirm remembered safety preferences', () => {
    const result = resolveOutcomeBrief({ schemaVersion: '1', rawRequest: 'Client result' }, { memory })
    expect(result.resolvedBrief.trust).toMatchObject({
      privacy: 'external', evidencePolicy: 'cited', shareSafetyRequired: true,
      sensitiveDetailsAllowed: false, recipientReady: true
    })
    expect(result.assumptions.some(item => item.field.startsWith('trust.'))).toBe(false)
  })

  it('is unchanged when no memory is supplied', () => {
    const draft = { schemaVersion: '1' as const, rawRequest: 'No memory' }
    expect(resolveOutcomeBrief(draft)).toEqual(resolveOutcomeBrief(draft, {}))
  })

  it('produces stable resolved output and hash for the same memory', () => {
    const draft = { schemaVersion: '1' as const, rawRequest: 'Stable' }
    expect(resolveOutcomeBrief(draft, { memory })).toEqual(resolveOutcomeBrief(draft, { memory }))
  })

  it('requires share safety and suppresses sensitive details for external outcomes', () => {
    const result = resolveOutcomeBrief({
      schemaVersion: '1', rawRequest: 'Send to a client',
      audience: { scope: 'external' }, trust: { evidencePolicy: 'draft' }
    })
    expect(result.resolvedBrief.trust).toMatchObject({
      shareSafetyRequired: true,
      sensitiveDetailsAllowed: false,
      recipientReady: false
    })
  })

  it('applies the same safety rules to public privacy', () => {
    const result = resolveOutcomeBrief({
      schemaVersion: '1', rawRequest: 'Publish results', trust: { privacy: 'public' }
    })
    expect(result.resolvedBrief.trust.shareSafetyRequired).toBe(true)
    expect(result.resolvedBrief.trust.sensitiveDetailsAllowed).toBe(false)
  })

  it('creates a valid recurring brief without inventing a period', () => {
    const result = resolveOutcomeBrief({
      schemaVersion: '1', rawRequest: 'Weekly review', lifecycle: { mode: 'recurring' }
    })
    expect(result.resolvedBrief.lifecycle).toEqual({ mode: 'recurring', period: null, cadence: 'custom' })
    expect(result.assumptions.some(item => item.reasonCode === 'cadence_defaulted')).toBe(true)
  })

  it('produces a stable hash independent of raw wording and brand path', () => {
    const first = resolveOutcomeBrief({ schemaVersion: '1', rawRequest: 'First request' }).resolvedBrief
    const second = resolveOutcomeBrief({ schemaVersion: '1', rawRequest: 'Different wording' }).resolvedBrief
    second.presentation.brandProfileRef = '/tmp/brand.json'
    expect(hashBrief(first)).toBe(hashBrief(second))
  })

  it('changes the hash when a structural field changes', () => {
    const concise = resolveOutcomeBrief({
      schemaVersion: '1', rawRequest: 'x', delivery: { density: 'concise' }
    })
    const detailed = resolveOutcomeBrief({
      schemaVersion: '1', rawRequest: 'x', delivery: { density: 'detailed' }
    })
    expect(concise.briefHash).not.toBe(detailed.briefHash)
  })

  it('omits neutral descriptive defaults from assumptions', () => {
    const { assumptions } = resolveOutcomeBrief({ schemaVersion: '1', rawRequest: 'x' })
    expect(assumptions.some(item => item.field === 'audience.role')).toBe(false)
    expect(assumptions.some(item => item.field === 'audience.dataLiteracy')).toBe(false)
    expect(assumptions.every(item =>
      /^(audience\.scope|goal\.purpose|delivery\.|trust\.|presentation\.locale|lifecycle\.)/.test(item.field)
    )).toBe(true)
  })
})
