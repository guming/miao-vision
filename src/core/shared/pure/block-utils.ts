/**
 * Block Utilities - Pure Functions
 *
 * Utility functions for analyzing and filtering blocks.
 * All functions are pure with no side effects.
 *
 * @module pure/block-utils
 */

import { extractVariables } from './template-utils'

// ============================================================================
// Types & Contracts
// ============================================================================

/**
 * Block with dependencies
 */
export interface BlockWithDependencies {
  id: string
  type: string
  content: string
  dependencies?: {
    inputs?: string[]
    blocks?: string[]
  }
}

/**
 * Result of finding affected blocks
 */
export interface AffectedBlocksResult {
  /** Blocks affected by the input changes */
  affectedBlocks: BlockWithDependencies[]
  /** Map of blockId -> input dependencies */
  blockDependencies: Map<string, string[]>
  /** Debug info: which inputs affected which blocks */
  affectedBy: Map<string, string[]>
}

/**
 * Input state type
 */
export type InputState = Record<string, unknown>

/**
 * Result of input comparison
 */
export interface InputChanges {
  /** Names of inputs that changed */
  changed: string[]
  /** Names of inputs that were added */
  added: string[]
  /** Names of inputs that were removed */
  removed: string[]
  /** Whether any change occurred */
  hasChanges: boolean
}

// ============================================================================
// Pure Functions - Input Comparison
// ============================================================================

/**
 * Compare two input states and return detailed changes
 *
 * @pure No side effects
 *
 * @example
 * compareInputs(
 *   { region: 'West', year: 2024 },
 *   { region: 'East', year: 2024 }
 * )
 * // { changed: ['region'], added: [], removed: [], hasChanges: true }
 */
export function compareInputs(
  newInputs: InputState,
  oldInputs: InputState
): InputChanges {
  const changed: string[] = []
  const added: string[] = []
  const removed: string[] = []

  // Check all keys in new inputs
  for (const key in newInputs) {
    if (!(key in oldInputs)) {
      added.push(key)
    } else if (!deepEqual(newInputs[key], oldInputs[key])) {
      changed.push(key)
    }
  }

  // Check for removed keys
  for (const key in oldInputs) {
    if (!(key in newInputs)) {
      removed.push(key)
    }
  }

  return {
    changed,
    added,
    removed,
    hasChanges: changed.length > 0 || added.length > 0 || removed.length > 0
  }
}

/**
 * Simple comparison for changed inputs (backward compatible)
 *
 * @pure No side effects
 */
export function getChangedInputs(
  newInputs: InputState,
  oldInputs: InputState
): string[] {
  const changes = compareInputs(newInputs, oldInputs)
  return [...changes.changed, ...changes.added, ...changes.removed]
}

// ============================================================================
// Pure Functions - Block Analysis
// ============================================================================

/**
 * Extract input dependencies from a block's content
 *
 * @pure No side effects
 */
export function extractBlockInputDependencies(
  content: string
): string[] {
  const variables = extractVariables(content)
  return variables.inputs
}

/**
 * Find all blocks affected by input changes
 *
 * @pure No side effects
 *
 * This function analyzes each block to determine if it depends on
 * any of the changed inputs. It uses stored dependencies if available,
 * otherwise extracts them from the block content.
 */
export function findAffectedBlocks(
  blocks: readonly BlockWithDependencies[],
  changedInputs: readonly string[]
): AffectedBlocksResult {
  const affectedBlocks: BlockWithDependencies[] = []
  const blockDependencies = new Map<string, string[]>()
  const affectedBy = new Map<string, string[]>()

  if (changedInputs.length === 0) {
    return { affectedBlocks, blockDependencies, affectedBy }
  }

  for (const block of blocks) {
    // Skip non-SQL blocks
    if (block.type !== 'sql') continue

    // Get input dependencies (prefer stored, fallback to extraction)
    let inputDeps: string[]
    if (block.dependencies?.inputs && block.dependencies.inputs.length > 0) {
      inputDeps = block.dependencies.inputs
    } else {
      inputDeps = extractBlockInputDependencies(block.content)
    }

    blockDependencies.set(block.id, inputDeps)

    // Check if this block depends on any changed inputs
    const affectingInputs = inputDeps.filter(dep =>
      changedInputs.includes(dep)
    )

    if (affectingInputs.length > 0) {
      affectedBlocks.push(block)
      affectedBy.set(block.id, affectingInputs)
    }
  }

  return { affectedBlocks, blockDependencies, affectedBy }
}

/**
 * Filter blocks by type
 *
 * @pure No side effects
 */
export function filterBlocksByType<T extends { type: string }>(
  blocks: readonly T[],
  type: string
): T[] {
  return blocks.filter(b => b.type === type)
}

/**
 * Filter blocks by language (for parsed code blocks)
 *
 * @pure No side effects
 */
export function filterBlocksByLanguage<T extends { language: string }>(
  blocks: readonly T[],
  language: string
): T[] {
  return blocks.filter(b => b.language === language)
}

/**
 * Group blocks by type
 *
 * @pure No side effects
 */
export function groupBlocksByType<T extends { type: string }>(
  blocks: readonly T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>()

  for (const block of blocks) {
    const existing = groups.get(block.type) || []
    existing.push(block)
    groups.set(block.type, existing)
  }

  return groups
}

/**
 * Find a block by ID or name
 *
 * @pure No side effects
 */
export function findBlock<T extends { id: string; metadata?: { name?: string } }>(
  blocks: readonly T[],
  identifier: string
): T | undefined {
  return blocks.find(b =>
    b.id === identifier || b.metadata?.name === identifier
  )
}

/**
 * Check if a block has any input dependencies
 *
 * @pure No side effects
 */
export function hasInputDependencies(block: BlockWithDependencies): boolean {
  if (block.dependencies?.inputs && block.dependencies.inputs.length > 0) {
    return true
  }
  const extracted = extractBlockInputDependencies(block.content)
  return extracted.length > 0
}

/**
 * Get blocks in a specific order (by ID array)
 *
 * @pure No side effects
 */
export function orderBlocks<T extends { id: string }>(
  blocks: readonly T[],
  orderIds: readonly string[]
): T[] {
  const blockMap = new Map(blocks.map(b => [b.id, b]))
  const ordered: T[] = []

  for (const id of orderIds) {
    const block = blockMap.get(id)
    if (block) {
      ordered.push(block)
    }
  }

  // Add any blocks not in orderIds at the end
  for (const block of blocks) {
    if (!orderIds.includes(block.id)) {
      ordered.push(block)
    }
  }

  return ordered
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep equality check for values
 *
 * @pure No side effects
 * @internal
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false

  if (typeof a === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((val, idx) => deepEqual(val, b[idx]))
    }

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    }

    if (!Array.isArray(a) && !Array.isArray(b)) {
      const aObj = a as Record<string, unknown>
      const bObj = b as Record<string, unknown>
      const aKeys = Object.keys(aObj)
      const bKeys = Object.keys(bObj)

      if (aKeys.length !== bKeys.length) return false
      return aKeys.every(key => deepEqual(aObj[key], bObj[key]))
    }
  }

  return false
}
