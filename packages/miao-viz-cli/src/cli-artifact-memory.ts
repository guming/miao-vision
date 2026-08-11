import { agentError, isAgentError } from './errors'
import {
  outcomeMemoryFieldSchema, outcomeMemoryProposalSchema, type OutcomeMemoryProposal
} from './outcome-memory-schema'
import {
  OutcomeMemoryStorageError, clearOutcomeMemory, createEmptyOutcomeMemory,
  forgetOutcomeMemoryField, loadOutcomeMemorySync, updateOutcomeMemory, writeOutcomeMemorySync
} from './outcome-memory-storage'
import { fail, readJson, requiredFlag, stringFlag, type CliArgs } from './cli-utils'

export function runArtifactMemory(args: CliArgs): unknown {
  const action = args.positional[0]
  if (!['inspect', 'update', 'forget'].includes(action ?? '')) {
    return fail(agentError(
      'UNKNOWN_SUBCOMMAND',
      `Unknown artifact memory action: ${action ?? '(none)'}. Available: inspect, update, forget`,
      { action, available: ['inspect', 'update', 'forget'] }
    ))
  }
  const memoryPath = requiredFlag(args, 'memory')
  if (isAgentError(memoryPath)) return fail(memoryPath)
  if (action === 'inspect') return inspectMemory(memoryPath)
  if (args.flags.confirm !== true) {
    return fail(agentError(
      'MEMORY_CONFIRMATION_REQUIRED',
      'Updating or forgetting Outcome Memory requires --confirm.'
    ))
  }
  return action === 'update' ? updateMemory(args, memoryPath) : forgetMemory(args, memoryPath)
}

function inspectMemory(memoryPath: string): unknown {
  try {
    return { ok: true, value: loadOutcomeMemorySync(memoryPath) }
  } catch (error) {
    return failMemory(error)
  }
}

function updateMemory(args: CliArgs, memoryPath: string): unknown {
  const proposalPath = requiredFlag(args, 'proposal')
  if (isAgentError(proposalPath)) return fail(proposalPath)
  let proposal: OutcomeMemoryProposal
  try {
    const raw = unwrapResult(readJson<unknown>(proposalPath))
    const parsed = outcomeMemoryProposalSchema.safeParse(raw)
    if (!parsed.success) {
      return fail(agentError('INVALID_OUTCOME_MEMORY_PROPOSAL', 'Outcome Memory proposal is invalid.', {
        proposalPath, issues: parsed.error.issues.map(issue => ({
          code: issue.code, path: issue.path.join('.'), message: issue.message
        }))
      }))
    }
    proposal = parsed.data
  } catch (error) {
    return fail(agentError('OUTCOME_MEMORY_PROPOSAL_READ_FAILED', `Could not read ${proposalPath}.`, {
      proposalPath, detail: error instanceof Error ? error.message : String(error)
    }))
  }
  try {
    let memory
    try {
      memory = loadOutcomeMemorySync(memoryPath)
    } catch (error) {
      if (!(error instanceof OutcomeMemoryStorageError) || error.code !== 'MEMORY_NOT_FOUND') throw error
      const firstTimestamp = proposal.preferences.map(item => item.updatedAt).sort()[0]
      memory = createEmptyOutcomeMemory(firstTimestamp)
    }
    const updated = updateOutcomeMemory(memory, proposal)
    writeOutcomeMemorySync(memoryPath, updated)
    return { ok: true, value: updated }
  } catch (error) {
    return failMemory(error)
  }
}

function forgetMemory(args: CliArgs, memoryPath: string): unknown {
  try {
    const memory = loadOutcomeMemorySync(memoryPath)
    const fieldValue = stringFlag(args, 'field')
    const timestamp = new Date(Math.max(Date.now(), Date.parse(memory.updatedAt))).toISOString()
    let updated
    if (fieldValue) {
      const field = outcomeMemoryFieldSchema.safeParse(fieldValue)
      if (!field.success) {
        return fail(agentError('INVALID_OUTCOME_MEMORY_FIELD', `Unknown Outcome Memory field: ${fieldValue}.`))
      }
      updated = forgetOutcomeMemoryField(memory, field.data, timestamp)
    } else {
      updated = clearOutcomeMemory(memory, timestamp)
    }
    writeOutcomeMemorySync(memoryPath, updated)
    return { ok: true, value: updated }
  } catch (error) {
    return failMemory(error)
  }
}

function failMemory(error: unknown): unknown {
  if (error instanceof OutcomeMemoryStorageError) {
    return fail(agentError(error.code, error.message, error.issues === undefined ? {} : { issues: error.issues }))
  }
  return fail(agentError('INVALID_OUTCOME_MEMORY', error instanceof Error ? error.message : String(error)))
}

function unwrapResult(value: unknown): unknown {
  return value && typeof value === 'object' && (value as { ok?: unknown }).ok === true
    ? (value as { value?: unknown }).value : value
}
