import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import {
  outcomeMemorySchema,
  type OutcomeMemory,
  type OutcomeMemoryField,
  type OutcomeMemoryProposal
} from './outcome-memory-schema'

export type OutcomeMemoryStorageCode = 'MEMORY_NOT_FOUND' | 'INVALID_OUTCOME_MEMORY' | 'MEMORY_WRITE_FAILED'

export class OutcomeMemoryStorageError extends Error {
  constructor(
    readonly code: OutcomeMemoryStorageCode,
    message: string,
    readonly issues?: unknown
  ) {
    super(message)
    this.name = 'OutcomeMemoryStorageError'
  }
}

export function createEmptyOutcomeMemory(timestamp: string): OutcomeMemory {
  return outcomeMemorySchema.parse({
    schemaVersion: '1', preferences: [], createdAt: timestamp, updatedAt: timestamp
  })
}

export async function loadOutcomeMemory(path: string): Promise<OutcomeMemory> {
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new OutcomeMemoryStorageError('MEMORY_NOT_FOUND', `Outcome Memory not found: ${path}`)
    }
    throw new OutcomeMemoryStorageError('INVALID_OUTCOME_MEMORY', `Could not read Outcome Memory: ${path}`)
  }
  try {
    return outcomeMemorySchema.parse(JSON.parse(source))
  } catch (error) {
    const issues = typeof error === 'object' && error && 'issues' in error ? error.issues : undefined
    throw new OutcomeMemoryStorageError('INVALID_OUTCOME_MEMORY', `Invalid Outcome Memory: ${path}`, issues)
  }
}

export function updateOutcomeMemory(
  memory: OutcomeMemory,
  proposal: OutcomeMemoryProposal
): OutcomeMemory {
  const updates = new Map(proposal.preferences.map(item => [item.field, item]))
  const preferences = memory.preferences
    .filter(item => !updates.has(item.field))
    .concat(proposal.preferences)
    .sort((left, right) => left.field.localeCompare(right.field))
  const updatedAt = preferences.reduce(
    (latest, item) => item.updatedAt > latest ? item.updatedAt : latest,
    memory.updatedAt
  )
  return outcomeMemorySchema.parse({ ...memory, preferences, updatedAt })
}

export function forgetOutcomeMemoryField(
  memory: OutcomeMemory,
  field: OutcomeMemoryField,
  timestamp: string
): OutcomeMemory {
  return outcomeMemorySchema.parse({
    ...memory,
    preferences: memory.preferences.filter(item => item.field !== field),
    updatedAt: timestamp
  })
}

export function clearOutcomeMemory(memory: OutcomeMemory, timestamp: string): OutcomeMemory {
  return outcomeMemorySchema.parse({ ...memory, preferences: [], updatedAt: timestamp })
}

export async function writeOutcomeMemory(path: string, memory: OutcomeMemory): Promise<void> {
  const validated = outcomeMemorySchema.parse(memory)
  const directory = dirname(path)
  const temporary = join(directory, `.${basename(path)}.${process.pid}.tmp`)
  try {
    await mkdir(directory, { recursive: true })
    await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, path)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw new OutcomeMemoryStorageError(
      'MEMORY_WRITE_FAILED',
      `Could not write Outcome Memory: ${path}`,
      isNodeError(error) ? error.code : undefined
    )
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
