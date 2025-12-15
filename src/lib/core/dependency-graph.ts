/**
 * Dependency Graph for SQL Block References
 *
 * Provides:
 * - Block dependency extraction from SQL
 * - Dependency graph construction
 * - Topological sorting for execution order
 * - Circular dependency detection
 */

import type { ParsedCodeBlock } from '@/types/report'

/**
 * Dependency graph node
 */
interface DependencyNode {
  blockId: string
  blockName?: string
  dependencies: Set<string>  // Block names/IDs this block depends on
  dependents: Set<string>    // Block names/IDs that depend on this block
}

/**
 * Result of dependency analysis
 */
export interface DependencyAnalysis {
  /** Execution order (topologically sorted) */
  executionOrder: string[]
  /** Map of blockId -> dependencies */
  dependencies: Map<string, string[]>
  /** Circular dependencies detected (if any) */
  circularDependencies: string[][] | null
  /** Blocks with missing dependencies */
  missingDependencies: Array<{ blockId: string; missing: string[] }>
}

/**
 * Extract block references from SQL query
 *
 * Detects patterns:
 * - FROM ${block_name} or JOIN ${block_name}
 * - FROM block_name or JOIN block_name (if block_name is a known block)
 *
 * @param sql - SQL query content
 * @param knownBlockNames - Set of known block names for implicit reference detection
 */
export function extractBlockReferences(
  sql: string,
  knownBlockNames: Set<string>
): string[] {
  const references: Set<string> = new Set()

  // Pattern 1: Explicit template syntax ${block_name}
  const templatePattern = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
  let match
  while ((match = templatePattern.exec(sql)) !== null) {
    const ref = match[1]
    // Skip input references (inputs.xxx)
    if (!ref.startsWith('inputs.') && !ref.includes('.')) {
      references.add(ref)
    }
  }

  // Pattern 2: FROM/JOIN table_name (implicit reference to known blocks)
  // Matches: FROM block_name, JOIN block_name, FROM "block_name"
  const tableRefPattern = /(?:FROM|JOIN)\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/gi
  while ((match = tableRefPattern.exec(sql)) !== null) {
    const tableName = match[1]
    if (knownBlockNames.has(tableName)) {
      references.add(tableName)
    }
  }

  return Array.from(references)
}

/**
 * Build dependency graph from parsed SQL blocks
 */
export function buildDependencyGraph(
  blocks: ParsedCodeBlock[]
): Map<string, DependencyNode> {
  const graph = new Map<string, DependencyNode>()

  // First pass: create nodes for all blocks
  const blockNames = new Set<string>()
  const nameToId = new Map<string, string>()

  for (const block of blocks) {
    if (block.language !== 'sql') continue

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
  for (const block of blocks) {
    if (block.language !== 'sql') continue

    const node = graph.get(block.id)
    if (!node) continue

    const refs = extractBlockReferences(block.content, blockNames)

    for (const ref of refs) {
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

/**
 * Detect circular dependencies using DFS
 */
export function detectCircularDependencies(
  graph: Map<string, DependencyNode>
): string[][] | null {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)

    const node = graph.get(nodeId)
    if (node) {
      for (const depId of node.dependencies) {
        if (!visited.has(depId)) {
          if (dfs(depId)) return true
        } else if (recursionStack.has(depId)) {
          // Found cycle
          const cycleStart = path.indexOf(depId)
          const cycle = path.slice(cycleStart)
          cycle.push(depId) // Complete the cycle
          cycles.push(cycle)
          return true
        }
      }
    }

    path.pop()
    recursionStack.delete(nodeId)
    return false
  }

  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId)
    }
  }

  return cycles.length > 0 ? cycles : null
}

/**
 * Topological sort using Kahn's algorithm
 * Returns blocks in execution order (dependencies first)
 */
export function topologicalSort(
  graph: Map<string, DependencyNode>
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

/**
 * Analyze dependencies for a set of SQL blocks
 * Main entry point for dependency analysis
 */
export function analyzeDependencies(
  blocks: ParsedCodeBlock[]
): DependencyAnalysis {
  const sqlBlocks = blocks.filter(b => b.language === 'sql')

  // Build dependency graph
  const graph = buildDependencyGraph(blocks)

  // Check for circular dependencies
  const circularDependencies = detectCircularDependencies(graph)

  // Get execution order
  let executionOrder: string[]
  if (circularDependencies) {
    // If cycles exist, use original order with warning
    executionOrder = sqlBlocks.map(b => b.id)
  } else {
    executionOrder = topologicalSort(graph) || sqlBlocks.map(b => b.id)
  }

  // Build dependencies map
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
    missingDependencies
  }
}

/**
 * Resolve block reference in SQL to actual table name
 *
 * @param sql - SQL with block references
 * @param tableMapping - Map of block name/id -> DuckDB table name
 */
export function resolveBlockReferences(
  sql: string,
  tableMapping: Map<string, string>
): string {
  let resolvedSQL = sql

  // Replace ${block_name} with actual table name
  const templatePattern = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
  resolvedSQL = resolvedSQL.replace(templatePattern, (match, blockRef) => {
    // Skip input references
    if (blockRef.startsWith('inputs.') || blockRef.includes('.')) {
      return match
    }

    const tableName = tableMapping.get(blockRef)
    if (tableName) {
      return tableName
    }

    // Return original if not found (will error at execution time)
    console.warn(`Block reference "${blockRef}" not found in tableMapping`)
    return match
  })

  return resolvedSQL
}
