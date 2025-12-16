/**
 * Block Utilities - Unit Tests
 *
 * Tests for pure functions in block-utils.ts
 */

import { describe, it, expect } from 'vitest'
import {
  compareInputs,
  getChangedInputs,
  extractBlockInputDependencies,
  findAffectedBlocks,
  filterBlocksByType,
  filterBlocksByLanguage,
  groupBlocksByType,
  findBlock,
  hasInputDependencies,
  orderBlocks,
  type BlockWithDependencies,
  type InputState
} from './block-utils'

// ============================================================================
// Test Fixtures
// ============================================================================

function createSQLBlock(
  id: string,
  content: string,
  inputDeps?: string[]
): BlockWithDependencies {
  return {
    id,
    type: 'sql',
    content,
    dependencies: inputDeps ? { inputs: inputDeps, blocks: [] } : undefined
  }
}

// ============================================================================
// compareInputs
// ============================================================================

describe('compareInputs', () => {
  it('detects changed values', () => {
    const oldInputs: InputState = { region: 'West', year: 2024 }
    const newInputs: InputState = { region: 'East', year: 2024 }

    const result = compareInputs(newInputs, oldInputs)

    expect(result.changed).toContain('region')
    expect(result.changed).not.toContain('year')
    expect(result.hasChanges).toBe(true)
  })

  it('detects added keys', () => {
    const oldInputs: InputState = { region: 'West' }
    const newInputs: InputState = { region: 'West', year: 2024 }

    const result = compareInputs(newInputs, oldInputs)

    expect(result.added).toContain('year')
    expect(result.changed).toEqual([])
    expect(result.hasChanges).toBe(true)
  })

  it('detects removed keys', () => {
    const oldInputs: InputState = { region: 'West', year: 2024 }
    const newInputs: InputState = { region: 'West' }

    const result = compareInputs(newInputs, oldInputs)

    expect(result.removed).toContain('year')
    expect(result.hasChanges).toBe(true)
  })

  it('detects no changes', () => {
    const oldInputs: InputState = { region: 'West', year: 2024 }
    const newInputs: InputState = { region: 'West', year: 2024 }

    const result = compareInputs(newInputs, oldInputs)

    expect(result.hasChanges).toBe(false)
    expect(result.changed).toEqual([])
    expect(result.added).toEqual([])
    expect(result.removed).toEqual([])
  })

  it('handles deep equality for arrays', () => {
    const oldInputs: InputState = { regions: ['West', 'East'] }
    const newInputs: InputState = { regions: ['West', 'East'] }

    const result = compareInputs(newInputs, oldInputs)

    expect(result.hasChanges).toBe(false)
  })

  it('detects array changes', () => {
    const oldInputs: InputState = { regions: ['West', 'East'] }
    const newInputs: InputState = { regions: ['West', 'North'] }

    const result = compareInputs(newInputs, oldInputs)

    expect(result.changed).toContain('regions')
    expect(result.hasChanges).toBe(true)
  })

  it('handles Date comparisons', () => {
    const date = new Date('2024-01-01')
    const sameDate = new Date('2024-01-01')
    const differentDate = new Date('2024-02-01')

    const result1 = compareInputs({ date: sameDate }, { date })
    expect(result1.hasChanges).toBe(false)

    const result2 = compareInputs({ date: differentDate }, { date })
    expect(result2.changed).toContain('date')
  })
})

// ============================================================================
// getChangedInputs
// ============================================================================

describe('getChangedInputs', () => {
  it('returns all changed, added, and removed keys', () => {
    const oldInputs: InputState = { a: 1, b: 2 }
    const newInputs: InputState = { a: 10, c: 3 }

    const changed = getChangedInputs(newInputs, oldInputs)

    expect(changed).toContain('a') // changed
    expect(changed).toContain('b') // removed
    expect(changed).toContain('c') // added
  })

  it('returns empty array when nothing changed', () => {
    const inputs: InputState = { a: 1, b: 2 }

    const changed = getChangedInputs(inputs, inputs)

    expect(changed).toEqual([])
  })
})

// ============================================================================
// extractBlockInputDependencies
// ============================================================================

describe('extractBlockInputDependencies', () => {
  it('extracts input variable names from SQL', () => {
    const sql = "SELECT * FROM sales WHERE region = ${inputs.region} AND year = ${inputs.year}"
    const deps = extractBlockInputDependencies(sql)

    expect(deps).toContain('region')
    expect(deps).toContain('year')
  })

  it('returns empty array for SQL without inputs', () => {
    const sql = 'SELECT * FROM sales'
    const deps = extractBlockInputDependencies(sql)

    expect(deps).toEqual([])
  })

  it('ignores other variable types', () => {
    const sql = 'SELECT * FROM ${table} WHERE x = ${metadata.title}'
    const deps = extractBlockInputDependencies(sql)

    expect(deps).toEqual([])
  })
})

// ============================================================================
// findAffectedBlocks
// ============================================================================

describe('findAffectedBlocks', () => {
  it('finds blocks affected by changed inputs', () => {
    const blocks: BlockWithDependencies[] = [
      createSQLBlock('block_1', 'SELECT * FROM sales WHERE region = ${inputs.region}'),
      createSQLBlock('block_2', 'SELECT * FROM users')
    ]

    const result = findAffectedBlocks(blocks, ['region'])

    expect(result.affectedBlocks).toHaveLength(1)
    expect(result.affectedBlocks[0].id).toBe('block_1')
  })

  it('uses stored dependencies when available', () => {
    const blocks: BlockWithDependencies[] = [
      createSQLBlock('block_1', 'SELECT 1', ['region']), // stored dep
      createSQLBlock('block_2', 'SELECT * FROM sales WHERE region = ${inputs.region}')
    ]

    const result = findAffectedBlocks(blocks, ['region'])

    expect(result.affectedBlocks).toHaveLength(2)
  })

  it('returns empty when no inputs changed', () => {
    const blocks: BlockWithDependencies[] = [
      createSQLBlock('block_1', 'SELECT * FROM sales WHERE region = ${inputs.region}')
    ]

    const result = findAffectedBlocks(blocks, [])

    expect(result.affectedBlocks).toEqual([])
  })

  it('provides blockDependencies map', () => {
    const blocks: BlockWithDependencies[] = [
      createSQLBlock('block_1', 'SELECT * FROM sales WHERE region = ${inputs.region}')
    ]

    const result = findAffectedBlocks(blocks, ['region'])

    expect(result.blockDependencies.get('block_1')).toContain('region')
  })

  it('provides affectedBy debug info', () => {
    const blocks: BlockWithDependencies[] = [
      createSQLBlock('block_1', 'SELECT * FROM sales WHERE region = ${inputs.region}')
    ]

    const result = findAffectedBlocks(blocks, ['region'])

    expect(result.affectedBy.get('block_1')).toContain('region')
  })

  it('skips non-SQL blocks', () => {
    const blocks: BlockWithDependencies[] = [
      { id: 'md_1', type: 'markdown', content: '${inputs.region}' },
      createSQLBlock('sql_1', 'SELECT * FROM sales WHERE region = ${inputs.region}')
    ]

    const result = findAffectedBlocks(blocks, ['region'])

    expect(result.affectedBlocks).toHaveLength(1)
    expect(result.affectedBlocks[0].id).toBe('sql_1')
  })
})

// ============================================================================
// filterBlocksByType
// ============================================================================

describe('filterBlocksByType', () => {
  it('filters blocks by type', () => {
    const blocks = [
      { id: '1', type: 'sql' },
      { id: '2', type: 'markdown' },
      { id: '3', type: 'sql' }
    ]

    const sqlBlocks = filterBlocksByType(blocks, 'sql')

    expect(sqlBlocks).toHaveLength(2)
    expect(sqlBlocks.every(b => b.type === 'sql')).toBe(true)
  })

  it('returns empty array when no match', () => {
    const blocks = [{ id: '1', type: 'sql' }]

    const chartBlocks = filterBlocksByType(blocks, 'chart')

    expect(chartBlocks).toEqual([])
  })
})

// ============================================================================
// filterBlocksByLanguage
// ============================================================================

describe('filterBlocksByLanguage', () => {
  it('filters blocks by language', () => {
    const blocks = [
      { id: '1', language: 'sql' },
      { id: '2', language: 'javascript' },
      { id: '3', language: 'sql' }
    ]

    const sqlBlocks = filterBlocksByLanguage(blocks, 'sql')

    expect(sqlBlocks).toHaveLength(2)
  })
})

// ============================================================================
// groupBlocksByType
// ============================================================================

describe('groupBlocksByType', () => {
  it('groups blocks by type', () => {
    const blocks = [
      { id: '1', type: 'sql' },
      { id: '2', type: 'markdown' },
      { id: '3', type: 'sql' },
      { id: '4', type: 'chart' }
    ]

    const groups = groupBlocksByType(blocks)

    expect(groups.get('sql')).toHaveLength(2)
    expect(groups.get('markdown')).toHaveLength(1)
    expect(groups.get('chart')).toHaveLength(1)
  })

  it('returns empty map for empty input', () => {
    const groups = groupBlocksByType([])

    expect(groups.size).toBe(0)
  })
})

// ============================================================================
// findBlock
// ============================================================================

describe('findBlock', () => {
  it('finds block by id', () => {
    const blocks = [
      { id: 'block_1', metadata: { name: 'data_a' } },
      { id: 'block_2', metadata: { name: 'data_b' } }
    ]

    const found = findBlock(blocks, 'block_1')

    expect(found?.id).toBe('block_1')
  })

  it('finds block by name', () => {
    const blocks = [
      { id: 'block_1', metadata: { name: 'data_a' } },
      { id: 'block_2', metadata: { name: 'data_b' } }
    ]

    const found = findBlock(blocks, 'data_a')

    expect(found?.id).toBe('block_1')
  })

  it('returns undefined when not found', () => {
    const blocks = [{ id: 'block_1' }]

    const found = findBlock(blocks, 'nonexistent')

    expect(found).toBeUndefined()
  })
})

// ============================================================================
// hasInputDependencies
// ============================================================================

describe('hasInputDependencies', () => {
  it('returns true for block with stored input dependencies', () => {
    const block = createSQLBlock('1', 'SELECT 1', ['region'])

    expect(hasInputDependencies(block)).toBe(true)
  })

  it('returns true for block with input variables in content', () => {
    const block = createSQLBlock('1', 'SELECT * FROM sales WHERE region = ${inputs.region}')

    expect(hasInputDependencies(block)).toBe(true)
  })

  it('returns false for block without input dependencies', () => {
    const block = createSQLBlock('1', 'SELECT * FROM sales')

    expect(hasInputDependencies(block)).toBe(false)
  })
})

// ============================================================================
// orderBlocks
// ============================================================================

describe('orderBlocks', () => {
  it('orders blocks according to ID array', () => {
    const blocks = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' }
    ]

    const ordered = orderBlocks(blocks, ['c', 'a', 'b'])

    expect(ordered.map(b => b.id)).toEqual(['c', 'a', 'b'])
  })

  it('appends blocks not in order array at end', () => {
    const blocks = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' }
    ]

    const ordered = orderBlocks(blocks, ['b'])

    expect(ordered.map(b => b.id)).toEqual(['b', 'a', 'c'])
  })

  it('skips missing IDs in order array', () => {
    const blocks = [
      { id: 'a' },
      { id: 'b' }
    ]

    const ordered = orderBlocks(blocks, ['c', 'a', 'b'])

    expect(ordered.map(b => b.id)).toEqual(['a', 'b'])
  })

  it('preserves original array', () => {
    const blocks = [{ id: 'a' }, { id: 'b' }]
    const originalOrder = blocks.map(b => b.id)

    orderBlocks(blocks, ['b', 'a'])

    expect(blocks.map(b => b.id)).toEqual(originalOrder)
  })
})
