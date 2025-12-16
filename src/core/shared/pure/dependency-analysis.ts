/**
 * Dependency Analysis - Pure Functions
 *
 * Analyzes dependencies between SQL blocks for execution ordering.
 * All functions are pure with no side effects.
 *
 * @module pure/dependency-analysis
 */

import { PATTERNS } from './template-utils'

// ============================================================================
// Types & Contracts
// ============================================================================

/**
 * Minimal block interface for dependency analysis
 *
 * @contract
 * - id: Unique identifier (uuid format recommended)
 * - content: SQL content string
 * - language: Block language type
 * - metadata.name: Optional human-readable name
 */
export interface AnalyzableBlock {
  id: string
  content: string
  language: string
  metadata?: {
    name?: string
    [key: string]: unknown
  }
}

/**
 * Dependency graph node
 */
export interface DependencyNode {
  /** Block ID */
  blockId: string
  /** Block name (if defined) */
  blockName?: string
  /** Block IDs this block depends on */
  dependencies: Set<string>
  /** Block IDs that depend on this block */
  dependents: Set<string>
}

/**
 * Result of dependency analysis
 */
export interface DependencyAnalysisResult {
  /** Execution order (topologically sorted block IDs) */
  executionOrder: string[]
  /** Map of blockId -> dependency blockIds */
  dependencies: Map<string, string[]>
  /** Circular dependencies detected (if any) */
  circularDependencies: string[][] | null
  /** Blocks with missing dependencies */
  missingDependencies: Array<{ blockId: string; missing: string[] }>
  /** Dependency graph for advanced queries */
  graph: Map<string, DependencyNode>
}

/**
 * Block reference extraction result
 */
export interface BlockReferences {
  /** Referenced block names/ids */
  references: string[]
  /** Template-style references: ${block_name} */
  templateRefs: string[]
  /** SQL FROM/JOIN references */
  sqlRefs: string[]
}

// ============================================================================
// Pure Functions - Block Reference Extraction
// ============================================================================

/**
 * Extract block references from SQL content
 *
 * @pure No side effects
 *
 * Detects patterns:
 * - ${block_name} - explicit template reference
 * - FROM block_name / JOIN block_name - implicit SQL reference (if in knownBlocks)
 *
 * @param sql - SQL query content
 * @param knownBlockNames - Set of known block names for implicit reference detection
 */
export function extractBlockReferences(
  sql: string,
  knownBlockNames: ReadonlySet<string>
): BlockReferences {
  const templateRefs: string[] = []
  const sqlRefs: string[] = []
  const seen = new Set<string>()

  // Pattern 1: Explicit template syntax ${block_name}
  const templateRegex = new RegExp(PATTERNS.TEMPLATE_VAR.source, 'g')
  let match
  while ((match = templateRegex.exec(sql)) !== null) {
    const ref = match[1]
    // Skip qualified references (inputs.xxx, metadata.xxx)
    if (!ref.includes('.') && !seen.has(ref)) {
      seen.add(ref)
      templateRefs.push(ref)
    }
  }

  // Pattern 2: FROM/JOIN table_name (implicit reference to known blocks)
  const tableRefPattern = /(?:FROM|JOIN)\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/gi
  while ((match = tableRefPattern.exec(sql)) !== null) {
    const tableName = match[1]
    if (knownBlockNames.has(tableName) && !seen.has(tableName)) {
      seen.add(tableName)
      sqlRefs.push(tableName)
    }
  }

  return {
    references: [...templateRefs, ...sqlRefs],
    templateRefs,
    sqlRefs
  }
}

// ============================================================================
// Pure Functions - Dependency Graph Construction
// ============================================================================

/**
 * Build dependency graph from blocks
 *
 * @pure No side effects
 */
export function buildDependencyGraph(
  blocks: readonly AnalyzableBlock[]
): Map<string, DependencyNode> {
  const graph = new Map<string, DependencyNode>()

  // Filter to SQL blocks only
  const sqlBlocks = blocks.filter(b => b.language === 'sql')

  // First pass: create nodes and collect all known names
  const blockNames = new Set<string>()
  const nameToId = new Map<string, string>()

  for (const block of sqlBlocks) {
    const name = block.metadata?.name || block.id
    blockNames.add(name)
    blockNames.add(block.id)
    nameToId.set(name, block.id)
    nameToId.set(block.id, block.id)

    graph.set(block.id, {
      blockId: block.id,
      blockName: block.metadata?.name,
      dependencies: new Set(),
      dependents: new Set()
    })
  }

  // Second pass: extract dependencies
  for (const block of sqlBlocks) {
    const node = graph.get(block.id)
    if (!node) continue

    const refs = extractBlockReferences(block.content, blockNames)

    for (const ref of refs.references) {
      // Resolve reference to block ID
      const refBlockId = nameToId.get(ref)
      if (refBlockId && refBlockId !== block.id) {
        node.dependencies.add(refBlockId)

        // Add reverse reference
        const depNode = graph.get(refBlockId)
        if (depNode) {
          depNode.dependents.add(block.id)
        }
      }
    }
  }

  return graph
}

// ============================================================================
// Pure Functions - Cycle Detection
// ============================================================================

/**
 * Detect circular dependencies using DFS
 *
 * @pure No side effects
 * @returns Array of cycles (each cycle is array of block IDs), or null if none
 */
export function detectCircularDependencies(
  graph: ReadonlyMap<string, DependencyNode>
): string[][] | null {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  function dfs(nodeId: string): void {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)

    const node = graph.get(nodeId)
    if (node) {
      for (const depId of node.dependencies) {
        if (!visited.has(depId)) {
          dfs(depId)
        } else if (recursionStack.has(depId)) {
          // Found cycle
          const cycleStart = path.indexOf(depId)
          const cycle = path.slice(cycleStart)
          cycle.push(depId) // Complete the cycle
          cycles.push(cycle)
        }
      }
    }

    path.pop()
    recursionStack.delete(nodeId)
  }

  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId)
    }
  }

  return cycles.length > 0 ? cycles : null
}

// ============================================================================
// Pure Functions - Topological Sort
// ============================================================================

/**
 * Topological sort using Kahn's algorithm
 *
 * @pure No side effects
 * @returns Block IDs in execution order (dependencies first), or null if cycle exists
 */
export function topologicalSort(
  graph: ReadonlyMap<string, DependencyNode>
): string[] | null {
  const inDegree = new Map<string, number>()
  const queue: string[] = []
  const result: string[] = []

  // Calculate in-degree for each node
  for (const [nodeId, node] of graph) {
    inDegree.set(nodeId, node.dependencies.size)
    if (node.dependencies.size === 0) {
      queue.push(nodeId)
    }
  }

  // Process nodes with no dependencies
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    result.push(nodeId)

    const node = graph.get(nodeId)
    if (node) {
      for (const depId of node.dependents) {
        const degree = (inDegree.get(depId) || 0) - 1
        inDegree.set(depId, degree)
        if (degree === 0) {
          queue.push(depId)
        }
      }
    }
  }

  // Check if all nodes were processed (no cycles)
  if (result.length !== graph.size) {
    return null // Cycle detected
  }

  return result
}

// ============================================================================
// Pure Functions - Main Analysis Entry Point
// ============================================================================

/**
 * Analyze dependencies for a set of blocks
 *
 * @pure No side effects
 *
 * This is the main entry point for dependency analysis.
 * Returns complete analysis including execution order, cycles, and missing deps.
 */
export function analyzeDependencies(
  blocks: readonly AnalyzableBlock[]
): DependencyAnalysisResult {
  const sqlBlocks = blocks.filter(b => b.language === 'sql')

  // Build dependency graph
  const graph = buildDependencyGraph(blocks)

  // Check for circular dependencies
  const circularDependencies = detectCircularDependencies(graph)

  // Get execution order
  let executionOrder: string[]
  if (circularDependencies) {
    // If cycles exist, use original order (with warning info in result)
    executionOrder = sqlBlocks.map(b => b.id)
  } else {
    executionOrder = topologicalSort(graph) || sqlBlocks.map(b => b.id)
  }

  // Build dependencies map (for easier consumption)
  const dependencies = new Map<string, string[]>()
  for (const [nodeId, node] of graph) {
    dependencies.set(nodeId, Array.from(node.dependencies))
  }

  // Check for missing dependencies
  const knownBlocks = new Set(sqlBlocks.map(b => b.id))
  const blockNames = new Set<string>()
  for (const block of sqlBlocks) {
    if (block.metadata?.name) {
      blockNames.add(block.metadata.name)
    }
  }

  const missingDependencies: Array<{ blockId: string; missing: string[] }> = []
  for (const [blockId, deps] of dependencies) {
    const missing = deps.filter(d => !knownBlocks.has(d) && !blockNames.has(d))
    if (missing.length > 0) {
      missingDependencies.push({ blockId, missing })
    }
  }

  return {
    executionOrder,
    dependencies,
    circularDependencies,
    missingDependencies,
    graph
  }
}

// ============================================================================
// Pure Functions - Utilities
// ============================================================================

/**
 * Get all blocks that depend on a given block (direct + transitive)
 *
 * @pure No side effects
 */
export function getDependentBlocks(
  blockId: string,
  graph: ReadonlyMap<string, DependencyNode>
): string[] {
  const dependents = new Set<string>()
  const queue = [blockId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const node = graph.get(current)

    if (node) {
      for (const depId of node.dependents) {
        if (!dependents.has(depId)) {
          dependents.add(depId)
          queue.push(depId)
        }
      }
    }
  }

  return Array.from(dependents)
}

/**
 * Get all blocks that a given block depends on (direct + transitive)
 *
 * @pure No side effects
 */
export function getUpstreamBlocks(
  blockId: string,
  graph: ReadonlyMap<string, DependencyNode>
): string[] {
  const upstream = new Set<string>()
  const queue = [blockId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const node = graph.get(current)

    if (node) {
      for (const depId of node.dependencies) {
        if (!upstream.has(depId)) {
          upstream.add(depId)
          queue.push(depId)
        }
      }
    }
  }

  return Array.from(upstream)
}
