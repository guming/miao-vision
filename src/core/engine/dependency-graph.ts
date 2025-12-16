/**
 * Dependency Graph for SQL Block References
 *
 * This module re-exports pure functions from @/lib/pure/dependency-analysis
 * and adds logging wrappers for debugging.
 *
 * Provides:
 * - Block dependency extraction from SQL
 * - Dependency graph construction
 * - Topological sorting for execution order
 * - Circular dependency detection
 */

import type { ParsedCodeBlock } from '@/types/report'
import {
  extractBlockReferences as pureExtractBlockReferences,
  buildDependencyGraph as pureBuildDependencyGraph,
  detectCircularDependencies as pureDetectCircularDependencies,
  topologicalSort as pureTopologicalSort,
  analyzeDependencies as pureAnalyzeDependencies,
  resolveBlockReferences as pureResolveBlockReferences,
  type DependencyNode,
  type AnalyzableBlock
} from '@core/shared/pure'

/**
 * Result of dependency analysis
 * Re-exported for backward compatibility
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
 * Wraps pure function for backward compatibility.
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
  const result = pureExtractBlockReferences(sql, knownBlockNames)
  return result.references
}

/**
 * Build dependency graph from parsed SQL blocks
 *
 * Wraps pure function with type conversion.
 */
export function buildDependencyGraph(
  blocks: ParsedCodeBlock[]
): Map<string, DependencyNode> {
  // Convert ParsedCodeBlock to AnalyzableBlock format
  const analyzableBlocks: AnalyzableBlock[] = blocks
    .filter(b => b.language === 'sql')
    .map(b => ({
      id: b.id,
      content: b.content,
      language: b.language,
      metadata: b.metadata && 'name' in b.metadata ? { name: (b.metadata as { name?: string }).name } : undefined
    }))

  return pureBuildDependencyGraph(analyzableBlocks)
}

/**
 * Detect circular dependencies using DFS
 *
 * Re-exported from pure layer.
 */
export function detectCircularDependencies(
  graph: Map<string, DependencyNode>
): string[][] | null {
  return pureDetectCircularDependencies(graph)
}

/**
 * Topological sort using Kahn's algorithm
 * Returns blocks in execution order (dependencies first)
 *
 * Re-exported from pure layer.
 */
export function topologicalSort(
  graph: Map<string, DependencyNode>
): string[] | null {
  return pureTopologicalSort(graph)
}

/**
 * Analyze dependencies for a set of SQL blocks
 * Main entry point for dependency analysis
 *
 * Wraps pure function with type conversion and logging.
 */
export function analyzeDependencies(
  blocks: ParsedCodeBlock[]
): DependencyAnalysis {
  // Convert ParsedCodeBlock to AnalyzableBlock format
  const analyzableBlocks: AnalyzableBlock[] = blocks
    .filter(b => b.language === 'sql')
    .map(b => ({
      id: b.id,
      content: b.content,
      language: b.language,
      metadata: b.metadata && 'name' in b.metadata ? { name: (b.metadata as { name?: string }).name } : undefined
    }))

  const result = pureAnalyzeDependencies(analyzableBlocks)

  // Log circular dependencies if found
  if (result.circularDependencies) {
    console.warn('Circular dependencies detected:', result.circularDependencies)
  }

  // Log missing dependencies if found
  if (result.missingDependencies.length > 0) {
    console.warn('Missing dependencies:', result.missingDependencies)
  }

  return {
    executionOrder: result.executionOrder,
    dependencies: result.dependencies,
    circularDependencies: result.circularDependencies,
    missingDependencies: result.missingDependencies
  }
}

/**
 * Resolve block reference in SQL to actual table name
 *
 * Wraps pure function with logging for debugging.
 *
 * @param sql - SQL with block references
 * @param tableMapping - Map of block name/id -> DuckDB table name
 */
export function resolveBlockReferences(
  sql: string,
  tableMapping: Map<string, string>
): string {
  const result = pureResolveBlockReferences(sql, tableMapping)

  // Log warnings for missing block references
  if (result.missingVariables.length > 0) {
    for (const missing of result.missingVariables) {
      console.warn(`Block reference "${missing}" not found in tableMapping`)
    }
  }

  return result.output
}
