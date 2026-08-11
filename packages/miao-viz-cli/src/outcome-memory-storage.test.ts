import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { outcomeMemoryProposalSchema } from './outcome-memory-schema'
import {
  OutcomeMemoryStorageError,
  clearOutcomeMemory,
  createEmptyOutcomeMemory,
  forgetOutcomeMemoryField,
  loadOutcomeMemory,
  updateOutcomeMemory,
  writeOutcomeMemory
} from './outcome-memory-storage'

const first = '2026-08-11T10:00:00.000Z'
const second = '2026-08-11T11:00:00.000Z'

function proposal(field: 'delivery.tone' | 'delivery.density', value: 'executive' | 'concise') {
  return outcomeMemoryProposalSchema.parse({
    schemaVersion: '1',
    preferences: [{ field, value, source: 'confirmed', updatedAt: second }]
  })
}

describe('outcome memory domain operations', () => {
  it('merges only proposed fields and remains idempotent', () => {
    const memory = updateOutcomeMemory(createEmptyOutcomeMemory(first), proposal('delivery.tone', 'executive'))
    const withDensity = updateOutcomeMemory(memory, proposal('delivery.density', 'concise'))
    const repeated = updateOutcomeMemory(withDensity, proposal('delivery.tone', 'executive'))
    expect(repeated.preferences.map(item => item.field)).toEqual(['delivery.density', 'delivery.tone'])
    expect(repeated).toEqual(updateOutcomeMemory(repeated, proposal('delivery.tone', 'executive')))
  })

  it('overwrites a matching field without duplicating it', () => {
    const confirmed = proposal('delivery.tone', 'executive')
    const explicit = outcomeMemoryProposalSchema.parse({
      ...confirmed,
      preferences: [{ ...confirmed.preferences[0], value: 'analytical' as const, source: 'explicit' as const }]
    })
    const memory = updateOutcomeMemory(updateOutcomeMemory(createEmptyOutcomeMemory(first), confirmed), explicit)
    expect(memory.preferences).toHaveLength(1)
    expect(memory.preferences[0]).toMatchObject({ value: 'analytical', source: 'explicit' })
  })

  it('forgets one field and clears all fields without inventing values', () => {
    const memory = updateOutcomeMemory(
      updateOutcomeMemory(createEmptyOutcomeMemory(first), proposal('delivery.tone', 'executive')),
      proposal('delivery.density', 'concise')
    )
    expect(forgetOutcomeMemoryField(memory, 'delivery.tone', second).preferences.map(item => item.field))
      .toEqual(['delivery.density'])
    expect(clearOutcomeMemory(memory, second).preferences).toEqual([])
  })
})

describe('outcome memory storage', () => {
  it('writes atomically and loads the validated memory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'outcome-memory-'))
    const path = join(directory, 'nested', 'outcome-memory.json')
    const memory = updateOutcomeMemory(createEmptyOutcomeMemory(first), proposal('delivery.tone', 'executive'))
    await writeOutcomeMemory(path, memory)
    expect(await loadOutcomeMemory(path)).toEqual(memory)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(memory)
  })

  it('distinguishes a missing file from invalid memory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'outcome-memory-'))
    await expect(loadOutcomeMemory(join(directory, 'missing.json')))
      .rejects.toMatchObject({ code: 'MEMORY_NOT_FOUND' })
    const invalid = join(directory, 'invalid.json')
    await writeFile(invalid, '{"schemaVersion":"1","rawRequest":"forbidden"}')
    await expect(loadOutcomeMemory(invalid))
      .rejects.toMatchObject({ code: 'INVALID_OUTCOME_MEMORY' })
  })

  it('exposes stable typed storage errors', () => {
    expect(new OutcomeMemoryStorageError('MEMORY_NOT_FOUND', 'missing'))
      .toMatchObject({ name: 'OutcomeMemoryStorageError', code: 'MEMORY_NOT_FOUND' })
  })
})
