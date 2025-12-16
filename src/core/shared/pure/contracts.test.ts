/**
 * Contracts - Unit Tests
 *
 * Tests for contract validation and type checking functions
 */

import { describe, it, expect } from 'vitest'
import {
  VARIABLE_PATTERNS,
  VARIABLE_NAME_RULES,
  validateVariableName,
  validateBlockDependencies,
  validateTemplateContext,
  isInputValue,
  hasTemplateVariables,
  hasInputVariables,
  extractAllVariables,
  type Block,
  type TemplateContext
} from './contracts'

// ============================================================================
// VARIABLE_PATTERNS
// ============================================================================

describe('VARIABLE_PATTERNS', () => {
  describe('INPUT', () => {
    it('matches input variables', () => {
      const pattern = new RegExp(VARIABLE_PATTERNS.INPUT.source, 'g')
      const matches = 'SELECT * FROM t WHERE region = ${inputs.region}'.match(pattern)
      expect(matches).toEqual(['${inputs.region}'])
    })

    it('captures variable name', () => {
      const pattern = new RegExp(VARIABLE_PATTERNS.INPUT.source)
      const match = '${inputs.my_var}'.match(pattern)
      expect(match?.[1]).toBe('my_var')
    })
  })

  describe('METADATA', () => {
    it('matches metadata variables', () => {
      const pattern = new RegExp(VARIABLE_PATTERNS.METADATA.source, 'g')
      const matches = 'Title: ${metadata.title}'.match(pattern)
      expect(matches).toEqual(['${metadata.title}'])
    })
  })

  describe('BLOCK', () => {
    it('matches simple block references', () => {
      const pattern = new RegExp(VARIABLE_PATTERNS.BLOCK.source, 'g')
      const matches = 'SELECT * FROM ${sales_data}'.match(pattern)
      expect(matches).toEqual(['${sales_data}'])
    })

    it('matches block references starting with underscore', () => {
      const pattern = new RegExp(VARIABLE_PATTERNS.BLOCK.source, 'g')
      const matches = '${_private_data}'.match(pattern)
      expect(matches).toEqual(['${_private_data}'])
    })
  })

  describe('QUERY', () => {
    it('matches query column references', () => {
      const pattern = new RegExp(VARIABLE_PATTERNS.QUERY.source, 'g')
      const matches = '${query.total} > 100'.match(pattern)
      expect(matches).toEqual(['${query.total}'])
    })
  })

  describe('QUERY_INDEXED', () => {
    it('matches indexed query references', () => {
      const pattern = new RegExp(VARIABLE_PATTERNS.QUERY_INDEXED.source, 'g')
      const matches = '${query.revenue[0]}'.match(pattern)
      expect(matches).toEqual(['${query.revenue[0]}'])
    })

    it('captures column name and index', () => {
      const pattern = new RegExp(VARIABLE_PATTERNS.QUERY_INDEXED.source)
      const match = '${query.revenue[5]}'.match(pattern)
      expect(match?.[1]).toBe('revenue')
      expect(match?.[2]).toBe('5')
    })
  })

  describe('ANY', () => {
    it('matches any template variable', () => {
      const pattern = new RegExp(VARIABLE_PATTERNS.ANY.source, 'g')
      const str = '${a} ${inputs.b} ${metadata.c}'
      const matches = str.match(pattern)
      expect(matches).toHaveLength(3)
    })
  })
})

// ============================================================================
// validateVariableName
// ============================================================================

describe('validateVariableName', () => {
  it('accepts valid variable names', () => {
    expect(validateVariableName('region').valid).toBe(true)
    expect(validateVariableName('my_var').valid).toBe(true)
    expect(validateVariableName('_private').valid).toBe(true)
    expect(validateVariableName('var123').valid).toBe(true)
  })

  it('rejects empty names', () => {
    const result = validateVariableName('')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('empty')
  })

  it('rejects names starting with numbers', () => {
    const result = validateVariableName('123abc')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('alphanumeric')
  })

  it('rejects names with special characters', () => {
    const result = validateVariableName('my-var')
    expect(result.valid).toBe(false)
  })

  it('rejects reserved words', () => {
    const result = validateVariableName('inputs')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('reserved')
  })

  it('rejects too long names', () => {
    const longName = 'a'.repeat(VARIABLE_NAME_RULES.maxLength + 1)
    const result = validateVariableName(longName)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('long')
  })
})

// ============================================================================
// validateBlockDependencies
// ============================================================================

describe('validateBlockDependencies', () => {
  it('validates block with existing dependencies', () => {
    const block: Block = {
      id: 'block_1',
      type: 'sql',
      content: 'SELECT * FROM ${data}',
      dependencies: { inputs: [], blocks: ['data'] }
    }
    const available = new Set(['data', 'block_1'])

    const result = validateBlockDependencies(block, available)
    expect(result.valid).toBe(true)
  })

  it('detects unknown block references', () => {
    const block: Block = {
      id: 'block_1',
      type: 'sql',
      content: 'SELECT * FROM ${unknown}',
      dependencies: { inputs: [], blocks: ['unknown'] }
    }
    const available = new Set(['block_1'])

    const result = validateBlockDependencies(block, available)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('unknown')
  })

  it('detects self-reference', () => {
    const block: Block = {
      id: 'block_1',
      type: 'sql',
      content: 'SELECT * FROM ${block_1}',
      dependencies: { inputs: [], blocks: ['block_1'] }
    }
    const available = new Set(['block_1'])

    const result = validateBlockDependencies(block, available)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('itself')
  })

  it('accepts block without dependencies', () => {
    const block: Block = {
      id: 'block_1',
      type: 'sql',
      content: 'SELECT 1'
    }

    const result = validateBlockDependencies(block, new Set())
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// validateTemplateContext
// ============================================================================

describe('validateTemplateContext', () => {
  it('validates complete context', () => {
    const template = 'SELECT * FROM t WHERE region = ${inputs.region}'
    const context: TemplateContext = {
      inputs: { region: 'West' },
      metadata: {}
    }

    const result = validateTemplateContext(template, context)
    expect(result.valid).toBe(true)
  })

  it('detects missing input variables', () => {
    const template = 'SELECT * FROM t WHERE region = ${inputs.region}'
    const context: TemplateContext = {
      inputs: {},
      metadata: {}
    }

    const result = validateTemplateContext(template, context)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('region')
  })

  it('detects missing metadata properties', () => {
    const template = 'Title: ${metadata.title}'
    const context: TemplateContext = {
      inputs: {},
      metadata: {}
    }

    const result = validateTemplateContext(template, context)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('title')
  })

  it('validates multiple variables', () => {
    const template = '${inputs.a} ${inputs.b} ${metadata.c}'
    const context: TemplateContext = {
      inputs: { a: 1, b: 2 },
      metadata: { c: 'x' }
    }

    const result = validateTemplateContext(template, context)
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// isInputValue
// ============================================================================

describe('isInputValue', () => {
  it('accepts primitive values', () => {
    expect(isInputValue('string')).toBe(true)
    expect(isInputValue(123)).toBe(true)
    expect(isInputValue(true)).toBe(true)
    expect(isInputValue(null)).toBe(true)
    expect(isInputValue(undefined)).toBe(true)
  })

  it('accepts Date values', () => {
    expect(isInputValue(new Date())).toBe(true)
  })

  it('accepts arrays of primitives', () => {
    expect(isInputValue(['a', 'b', 'c'])).toBe(true)
    expect(isInputValue([1, 2, 3])).toBe(true)
    expect(isInputValue([true, false])).toBe(true)
    expect(isInputValue([null, undefined])).toBe(true)
  })

  it('rejects objects', () => {
    expect(isInputValue({})).toBe(false)
    expect(isInputValue({ key: 'value' })).toBe(false)
  })

  it('rejects arrays with objects', () => {
    expect(isInputValue([{ a: 1 }])).toBe(false)
  })

  it('rejects functions', () => {
    expect(isInputValue(() => {})).toBe(false)
  })
})

// ============================================================================
// hasTemplateVariables
// ============================================================================

describe('hasTemplateVariables', () => {
  it('detects template variables', () => {
    expect(hasTemplateVariables('${anything}')).toBe(true)
    expect(hasTemplateVariables('text ${var} text')).toBe(true)
  })

  it('returns false for plain strings', () => {
    expect(hasTemplateVariables('no variables')).toBe(false)
    expect(hasTemplateVariables('$notvar')).toBe(false)
    expect(hasTemplateVariables('{notvar}')).toBe(false)
  })
})

// ============================================================================
// hasInputVariables
// ============================================================================

describe('hasInputVariables', () => {
  it('detects input variables', () => {
    expect(hasInputVariables('${inputs.region}')).toBe(true)
    expect(hasInputVariables('text ${inputs.x} text')).toBe(true)
  })

  it('returns false for other variable types', () => {
    expect(hasInputVariables('${metadata.title}')).toBe(false)
    expect(hasInputVariables('${block_name}')).toBe(false)
    expect(hasInputVariables('${query.col}')).toBe(false)
  })
})

// ============================================================================
// extractAllVariables
// ============================================================================

describe('extractAllVariables', () => {
  it('extracts input variables', () => {
    const refs = extractAllVariables('SELECT * FROM t WHERE x = ${inputs.region}')
    expect(refs).toHaveLength(1)
    expect(refs[0]).toEqual({
      type: 'input',
      name: 'region',
      raw: '${inputs.region}'
    })
  })

  it('extracts metadata variables', () => {
    const refs = extractAllVariables('Title: ${metadata.title}')
    expect(refs).toHaveLength(1)
    expect(refs[0]).toEqual({
      type: 'metadata',
      name: 'title',
      raw: '${metadata.title}'
    })
  })

  it('extracts block references', () => {
    const refs = extractAllVariables('SELECT * FROM ${sales_data}')
    expect(refs).toHaveLength(1)
    expect(refs[0]).toEqual({
      type: 'block',
      name: 'sales_data',
      raw: '${sales_data}'
    })
  })

  it('extracts query variables', () => {
    const refs = extractAllVariables('${query.total} > 100')
    expect(refs).toHaveLength(1)
    expect(refs[0]).toEqual({
      type: 'query',
      name: 'total',
      raw: '${query.total}'
    })
  })

  it('extracts indexed query variables', () => {
    const refs = extractAllVariables('${query.revenue[0]}')
    expect(refs).toHaveLength(1)
    expect(refs[0]).toEqual({
      type: 'query',
      name: 'revenue',
      index: 0,
      raw: '${query.revenue[0]}'
    })
  })

  it('extracts all variable types from complex string', () => {
    const str = `
      SELECT * FROM \${sales_data}
      WHERE region = \${inputs.region}
      -- Report: \${metadata.title}
    `
    const refs = extractAllVariables(str)

    expect(refs.find(r => r.type === 'input' && r.name === 'region')).toBeDefined()
    expect(refs.find(r => r.type === 'metadata' && r.name === 'title')).toBeDefined()
    expect(refs.find(r => r.type === 'block' && r.name === 'sales_data')).toBeDefined()
  })

  it('deduplicates variables', () => {
    const refs = extractAllVariables('${inputs.x} ${inputs.x} ${inputs.x}')
    expect(refs).toHaveLength(1)
  })

  it('returns empty array for string without variables', () => {
    const refs = extractAllVariables('SELECT * FROM users')
    expect(refs).toEqual([])
  })
})
