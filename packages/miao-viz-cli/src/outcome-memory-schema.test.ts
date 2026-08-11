import { describe, expect, it } from 'vitest'
import {
  outcomeMemoryFieldSchema,
  outcomeMemoryPreferenceSchema,
  outcomeMemoryProposalSchema,
  outcomeMemorySchema
} from './outcome-memory-schema'

const timestamp = '2026-08-11T10:00:00.000Z'

describe('outcomeMemorySchema', () => {
  it('accepts an empty project memory', () => {
    expect(outcomeMemorySchema.parse({
      schemaVersion: '1', preferences: [], createdAt: timestamp, updatedAt: timestamp
    }).preferences).toEqual([])
  })

  it('accepts every persistable field with its declared value type', () => {
    const values = [
      ['audience.role', 'Leadership'], ['audience.scope', 'internal'],
      ['audience.dataLiteracy', 'business'], ['goal.purpose', 'decide'],
      ['delivery.context', 'meeting'], ['delivery.form', 'presentation'],
      ['delivery.density', 'concise'], ['delivery.tone', 'executive'],
      ['trust.evidencePolicy', 'strict'], ['trust.privacy', 'internal'],
      ['presentation.locale', 'zh-CN'], ['presentation.brandProfileRef', 'default-brand'],
      ['lifecycle.mode', 'recurring'], ['lifecycle.cadence', 'monthly']
    ]
    const preferences = values.map(([field, value]) => ({
      field, value, source: 'confirmed', updatedAt: timestamp
    }))
    expect(outcomeMemorySchema.safeParse({
      schemaVersion: '1', preferences, createdAt: timestamp, updatedAt: timestamp
    }).success).toBe(true)
  })

  it('rejects duplicate fields at a stable path', () => {
    const item = { field: 'delivery.tone', value: 'executive', source: 'explicit', updatedAt: timestamp }
    const result = outcomeMemorySchema.safeParse({
      schemaVersion: '1', preferences: [item, item], createdAt: timestamp, updatedAt: timestamp
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['preferences', 1, 'field'])
  })
})

describe('outcome memory input contracts', () => {
  it.each([
    [{ field: 'delivery.tone', value: 'urgent', source: 'explicit', updatedAt: timestamp }, 'value'],
    [{ field: 'delivery.tone', value: 'executive', source: 'inferred', updatedAt: timestamp }, 'source'],
    [{ field: 'delivery.tone', value: 'executive', source: 'explicit', updatedAt: 'today' }, 'updatedAt'],
    [{ field: 'rawRequest', value: 'secret', source: 'explicit', updatedAt: timestamp }, 'field'],
    [{ field: 'goal.keyQuestion', value: 'why?', source: 'explicit', updatedAt: timestamp }, 'field'],
    [{ field: 'lifecycle.period', value: '2026-Q3', source: 'explicit', updatedAt: timestamp }, 'field'],
    [{ field: 'evidence.rows', value: [], source: 'explicit', updatedAt: timestamp }, 'field'],
    [{ field: 'source.path', value: '/private/data.csv', source: 'explicit', updatedAt: timestamp }, 'field']
  ])('rejects invalid or forbidden preference %#', (input, expectedLeaf) => {
    const result = outcomeMemoryPreferenceSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path.at(-1)).toBe(expectedLeaf)
  })

  it('requires at least one preference in an update proposal', () => {
    expect(outcomeMemoryProposalSchema.safeParse({ schemaVersion: '1', preferences: [] }).success).toBe(false)
  })

  it('exposes only the persistable field whitelist', () => {
    expect(outcomeMemoryFieldSchema.safeParse('delivery.tone').success).toBe(true)
    expect(outcomeMemoryFieldSchema.safeParse('goal.decision').success).toBe(false)
  })
})
