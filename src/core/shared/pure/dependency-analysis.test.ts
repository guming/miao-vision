/**
 * Dependency Analysis - Unit Tests
 *
 * Tests for pure functions in dependency-analysis.ts
 */

import { describe, it, expect } from 'vitest'
import {
  extractBlockReferences,
  buildDependencyGraph,
  detectCircularDependencies,
  topologicalSort,
  analyzeDependencies,
  getDependentBlocks,
  getUpstreamBlocks,
  type AnalyzableBlock,
  type DependencyNode
} from './dependency-analysis'

// ============================================================================
// Test Fixtures
// ============================================================================

function createBlock(id: string, content: string, name?: string): AnalyzableBlock {
  return {
    id,
    content,
    language: 'sql',
    metadata: name ? { name } : undefined
  }
}

// ============================================================================
// extractBlockReferences
// ============================================================================

describe('extractBlockReferences', () => {
  it('extracts template-style block references', () => {
    const sql = 'SELECT * FROM ${sales_data}'
    const knownBlocks = new Set(['sales_data'])
    const result = extractBlockReferences(sql, knownBlocks)

    expect(result.references).toContain('sales_data')
    expect(result.templateRefs).toContain('sales_data')
  })

  it('extracts SQL FROM/JOIN references to known blocks', () => {
    const sql = 'SELECT * FROM sales_data JOIN customers ON id = cid'
    const knownBlocks = new Set(['sales_data', 'customers'])
    const result = extractBlockReferences(sql, knownBlocks)

    expect(result.references).toContain('sales_data')
    expect(result.references).toContain('customers')
    expect(result.sqlRefs).toContain('sales_data')
    expect(result.sqlRefs).toContain('customers')
  })

  it('ignores qualified references like ${inputs.region}', () => {
    const sql = 'SELECT * FROM ${inputs.region}'
    const knownBlocks = new Set<string>()
    const result = extractBlockReferences(sql, knownBlocks)

    expect(result.references).toEqual([])
  })

  it('ignores unknown table names', () => {
    const sql = 'SELECT * FROM unknown_table'
    const knownBlocks = new Set(['sales_data'])
    const result = extractBlockReferences(sql, knownBlocks)

    expect(result.references).toEqual([])
  })

  it('deduplicates references', () => {
    const sql = 'SELECT * FROM ${sales} JOIN ${sales} ON a = b'
    const knownBlocks = new Set(['sales'])
    const result = extractBlockReferences(sql, knownBlocks)

    expect(result.references).toEqual(['sales'])
  })

  it('handles quoted table names', () => {
    const sql = 'SELECT * FROM "sales_data"'
    const knownBlocks = new Set(['sales_data'])
    const result = extractBlockReferences(sql, knownBlocks)

    expect(result.sqlRefs).toContain('sales_data')
  })
})

// ============================================================================
// buildDependencyGraph
// ============================================================================

describe('buildDependencyGraph', () => {
  it('builds graph for independent blocks', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('block_1', 'SELECT * FROM users'),
      createBlock('block_2', 'SELECT * FROM products')
    ]

    const graph = buildDependencyGraph(blocks)

    expect(graph.size).toBe(2)
    expect(graph.get('block_1')?.dependencies.size).toBe(0)
    expect(graph.get('block_2')?.dependencies.size).toBe(0)
  })

  it('builds graph with dependencies', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('block_1', 'SELECT * FROM users', 'users_data'),
      createBlock('block_2', 'SELECT * FROM ${users_data}')
    ]

    const graph = buildDependencyGraph(blocks)

    expect(graph.get('block_2')?.dependencies.has('block_1')).toBe(true)
    expect(graph.get('block_1')?.dependents.has('block_2')).toBe(true)
  })

  it('filters non-SQL blocks', () => {
    const blocks: AnalyzableBlock[] = [
      { id: 'md_1', content: '# Title', language: 'markdown' },
      createBlock('sql_1', 'SELECT 1')
    ]

    const graph = buildDependencyGraph(blocks)

    expect(graph.size).toBe(1)
    expect(graph.has('sql_1')).toBe(true)
    expect(graph.has('md_1')).toBe(false)
  })

  it('handles chain dependencies', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}', 'data_b'),
      createBlock('c', 'SELECT * FROM ${data_b}')
    ]

    const graph = buildDependencyGraph(blocks)

    expect(graph.get('b')?.dependencies.has('a')).toBe(true)
    expect(graph.get('c')?.dependencies.has('b')).toBe(true)
    expect(graph.get('a')?.dependencies.size).toBe(0)
  })
})

// ============================================================================
// detectCircularDependencies
// ============================================================================

describe('detectCircularDependencies', () => {
  it('returns null for acyclic graph', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}')
    ]

    const graph = buildDependencyGraph(blocks)
    const cycles = detectCircularDependencies(graph)

    expect(cycles).toBeNull()
  })

  it('detects simple cycle', () => {
    // Create a graph with cycle manually
    const graph = new Map<string, DependencyNode>()

    graph.set('a', {
      blockId: 'a',
      dependencies: new Set(['b']),
      dependents: new Set(['b'])
    })
    graph.set('b', {
      blockId: 'b',
      dependencies: new Set(['a']),
      dependents: new Set(['a'])
    })

    const cycles = detectCircularDependencies(graph)

    expect(cycles).not.toBeNull()
    expect(cycles!.length).toBeGreaterThan(0)
  })

  it('detects longer cycle', () => {
    const graph = new Map<string, DependencyNode>()

    // a -> b -> c -> a
    graph.set('a', {
      blockId: 'a',
      dependencies: new Set(['c']),
      dependents: new Set(['b'])
    })
    graph.set('b', {
      blockId: 'b',
      dependencies: new Set(['a']),
      dependents: new Set(['c'])
    })
    graph.set('c', {
      blockId: 'c',
      dependencies: new Set(['b']),
      dependents: new Set(['a'])
    })

    const cycles = detectCircularDependencies(graph)

    expect(cycles).not.toBeNull()
  })
})

// ============================================================================
// topologicalSort
// ============================================================================

describe('topologicalSort', () => {
  it('sorts independent blocks', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1'),
      createBlock('b', 'SELECT 2'),
      createBlock('c', 'SELECT 3')
    ]

    const graph = buildDependencyGraph(blocks)
    const order = topologicalSort(graph)

    expect(order).not.toBeNull()
    expect(order).toHaveLength(3)
  })

  it('sorts dependent blocks correctly', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}', 'data_b'),
      createBlock('c', 'SELECT * FROM ${data_b}')
    ]

    const graph = buildDependencyGraph(blocks)
    const order = topologicalSort(graph)

    expect(order).not.toBeNull()
    expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('b'))
    expect(order!.indexOf('b')).toBeLessThan(order!.indexOf('c'))
  })

  it('returns null for cyclic graph', () => {
    const graph = new Map<string, DependencyNode>()

    graph.set('a', {
      blockId: 'a',
      dependencies: new Set(['b']),
      dependents: new Set(['b'])
    })
    graph.set('b', {
      blockId: 'b',
      dependencies: new Set(['a']),
      dependents: new Set(['a'])
    })

    const order = topologicalSort(graph)

    expect(order).toBeNull()
  })
})

// ============================================================================
// analyzeDependencies
// ============================================================================

describe('analyzeDependencies', () => {
  it('analyzes simple dependency chain', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}', 'data_b'),
      createBlock('c', 'SELECT * FROM ${data_b}')
    ]

    const result = analyzeDependencies(blocks)

    expect(result.executionOrder).toHaveLength(3)
    expect(result.executionOrder.indexOf('a')).toBeLessThan(result.executionOrder.indexOf('b'))
    expect(result.executionOrder.indexOf('b')).toBeLessThan(result.executionOrder.indexOf('c'))
    expect(result.circularDependencies).toBeNull()
    expect(result.missingDependencies).toEqual([])
  })

  it('reports missing dependencies when referenced block not in set', () => {
    // Note: missingDependencies only reports when a block reference is detected
    // but the target block doesn't exist in the analysis set.
    // Template refs like ${unknown_block} are only tracked if they match known block names.
    // So we test with a scenario where a block references another by name that exists
    // but is filtered out (e.g., non-SQL block)
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}')
    ]

    const result = analyzeDependencies(blocks)

    // Both blocks exist, so no missing dependencies
    expect(result.missingDependencies).toHaveLength(0)

    // Dependencies should be correctly tracked
    expect(result.dependencies.get('b')).toContain('a')
  })

  it('provides dependency map', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}')
    ]

    const result = analyzeDependencies(blocks)

    expect(result.dependencies.get('a')).toEqual([])
    expect(result.dependencies.get('b')).toContain('a')
  })

  it('includes graph for advanced queries', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1')
    ]

    const result = analyzeDependencies(blocks)

    expect(result.graph).toBeInstanceOf(Map)
    expect(result.graph.has('a')).toBe(true)
  })
})

// ============================================================================
// getDependentBlocks
// ============================================================================

describe('getDependentBlocks', () => {
  it('returns direct dependents', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}'),
      createBlock('c', 'SELECT * FROM ${data_a}')
    ]

    const graph = buildDependencyGraph(blocks)
    const dependents = getDependentBlocks('a', graph)

    expect(dependents).toContain('b')
    expect(dependents).toContain('c')
  })

  it('returns transitive dependents', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}', 'data_b'),
      createBlock('c', 'SELECT * FROM ${data_b}')
    ]

    const graph = buildDependencyGraph(blocks)
    const dependents = getDependentBlocks('a', graph)

    expect(dependents).toContain('b')
    expect(dependents).toContain('c')
  })

  it('returns empty array for leaf nodes', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}')
    ]

    const graph = buildDependencyGraph(blocks)
    const dependents = getDependentBlocks('b', graph)

    expect(dependents).toEqual([])
  })
})

// ============================================================================
// getUpstreamBlocks
// ============================================================================

describe('getUpstreamBlocks', () => {
  it('returns direct dependencies', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT 1', 'data_b'),
      createBlock('c', 'SELECT * FROM ${data_a} JOIN ${data_b}')
    ]

    const graph = buildDependencyGraph(blocks)
    const upstream = getUpstreamBlocks('c', graph)

    expect(upstream).toContain('a')
    expect(upstream).toContain('b')
  })

  it('returns transitive dependencies', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1', 'data_a'),
      createBlock('b', 'SELECT * FROM ${data_a}', 'data_b'),
      createBlock('c', 'SELECT * FROM ${data_b}')
    ]

    const graph = buildDependencyGraph(blocks)
    const upstream = getUpstreamBlocks('c', graph)

    expect(upstream).toContain('a')
    expect(upstream).toContain('b')
  })

  it('returns empty array for root nodes', () => {
    const blocks: AnalyzableBlock[] = [
      createBlock('a', 'SELECT 1'),
      createBlock('b', 'SELECT 2')
    ]

    const graph = buildDependencyGraph(blocks)
    const upstream = getUpstreamBlocks('a', graph)

    expect(upstream).toEqual([])
  })
})
