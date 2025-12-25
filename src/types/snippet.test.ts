/**
 * SQL Snippet Helper Functions - Unit Tests
 *
 * Tests for pure utility functions in snippet.ts
 */

import { describe, it, expect } from 'vitest'
import {
  substituteParameters,
  extractParameterNames,
  validateSnippet,
  isSQLSnippet,
  isSnippetParameter,
  createSnippet,
  type SQLSnippet,
  type SnippetParameter
} from './snippet'

// ============================================================================
// substituteParameters
// ============================================================================

describe('substituteParameters', () => {
  it('replaces simple parameters', () => {
    const template = 'SELECT ${column} FROM ${table}'
    const values = { column: 'name', table: 'users' }
    const result = substituteParameters(template, values)
    expect(result).toBe('SELECT name FROM users')
  })

  it('replaces parameters used multiple times', () => {
    const template = 'SELECT ${col}, ${col} * 2 FROM ${table} ORDER BY ${col}'
    const values = { col: 'revenue', table: 'sales' }
    const result = substituteParameters(template, values)
    expect(result).toBe('SELECT revenue, revenue * 2 FROM sales ORDER BY revenue')
  })

  it('handles empty template', () => {
    const result = substituteParameters('', {})
    expect(result).toBe('')
  })

  it('handles template with no parameters', () => {
    const template = 'SELECT * FROM users'
    const result = substituteParameters(template, {})
    expect(result).toBe('SELECT * FROM users')
  })

  it('handles values with special regex characters', () => {
    const template = 'SELECT ${column} FROM ${table}'
    const values = { column: 'price$', table: 'products[new]' }
    const result = substituteParameters(template, values)
    expect(result).toBe('SELECT price$ FROM products[new]')
  })

  it('leaves missing parameters unchanged', () => {
    const template = 'SELECT ${col1}, ${col2} FROM ${table}'
    const values = { col1: 'name' }
    const result = substituteParameters(template, values)
    expect(result).toBe('SELECT name, ${col2} FROM ${table}')
  })

  it('handles multi-line templates', () => {
    const template = `
      SELECT
        \${column1},
        \${column2}
      FROM \${table}
      WHERE \${condition}
    `
    const values = {
      column1: 'id',
      column2: 'name',
      table: 'users',
      condition: 'active = true'
    }
    const result = substituteParameters(template, values)
    expect(result).toContain('SELECT')
    expect(result).toContain('id,')
    expect(result).toContain('name')
    expect(result).toContain('FROM users')
    expect(result).toContain('WHERE active = true')
  })

  it('handles parameters with underscores and numbers', () => {
    const template = '${col_1} ${col_2} ${table_name_123}'
    const values = { col_1: 'a', col_2: 'b', table_name_123: 'test' }
    const result = substituteParameters(template, values)
    expect(result).toBe('a b test')
  })
})

// ============================================================================
// extractParameterNames
// ============================================================================

describe('extractParameterNames', () => {
  it('extracts simple parameter names', () => {
    const template = 'SELECT ${column} FROM ${table}'
    const names = extractParameterNames(template)
    expect(names).toEqual(['column', 'table'])
  })

  it('deduplicates parameter names', () => {
    const template = 'SELECT ${col}, ${col} * 2 FROM ${table} ORDER BY ${col}'
    const names = extractParameterNames(template)
    expect(names).toEqual(['col', 'table'])
  })

  it('returns empty array for no parameters', () => {
    const template = 'SELECT * FROM users'
    const names = extractParameterNames(template)
    expect(names).toEqual([])
  })

  it('handles empty template', () => {
    const names = extractParameterNames('')
    expect(names).toEqual([])
  })

  it('extracts from multi-line template', () => {
    const template = `
      SELECT
        \${col1},
        \${col2}
      FROM \${table}
    `
    const names = extractParameterNames(template)
    expect(names).toEqual(['col1', 'col2', 'table'])
  })

  it('handles parameters with underscores and numbers', () => {
    const template = '${param_1} ${param_2} ${table_name_123}'
    const names = extractParameterNames(template)
    expect(names).toEqual(['param_1', 'param_2', 'table_name_123'])
  })

  it('preserves order of first occurrence', () => {
    const template = '${z} ${a} ${m} ${a} ${z}'
    const names = extractParameterNames(template)
    expect(names).toEqual(['z', 'a', 'm'])
  })
})

// ============================================================================
// validateSnippet
// ============================================================================

describe('validateSnippet', () => {
  const createValidSnippet = (): SQLSnippet => ({
    id: 'test-1',
    name: 'Test Snippet',
    description: 'A test snippet',
    category: 'custom',
    tags: ['test'],
    template: 'SELECT ${column} FROM ${table}',
    parameters: [
      { name: 'column', description: 'Column name', type: 'column', required: true },
      { name: 'table', description: 'Table name', type: 'table', required: true }
    ],
    isBuiltIn: false,
    isFavorite: false,
    usageCount: 0,
    createdAt: new Date(),
    lastModified: new Date()
  })

  it('validates correct snippet', () => {
    const snippet = createValidSnippet()
    const result = validateSnippet(snippet)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('requires name', () => {
    const snippet = createValidSnippet()
    snippet.name = ''
    const result = validateSnippet(snippet)
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      field: 'name',
      message: 'Snippet name is required',
      severity: 'error'
    })
  })

  it('requires template', () => {
    const snippet = createValidSnippet()
    snippet.template = ''
    const result = validateSnippet(snippet)
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      field: 'template',
      message: 'SQL template is required',
      severity: 'error'
    })
  })

  it('warns about missing description', () => {
    const snippet = createValidSnippet()
    snippet.description = ''
    const result = validateSnippet(snippet)
    expect(result.valid).toBe(true) // Still valid, just warning
    expect(result.errors).toContainEqual({
      field: 'description',
      message: 'Description is recommended for clarity',
      severity: 'warning'
    })
  })

  it('validates template parameters match definitions', () => {
    const snippet = createValidSnippet()
    snippet.template = 'SELECT ${column} FROM ${table} WHERE ${missing}'
    const result = validateSnippet(snippet)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e =>
      e.message.includes('missing') && e.severity === 'error'
    )).toBe(true)
  })

  it('warns about unused parameters', () => {
    const snippet = createValidSnippet()
    snippet.parameters.push({
      name: 'unused',
      description: 'Not in template',
      type: 'string',
      required: false
    })
    const result = validateSnippet(snippet)
    expect(result.valid).toBe(true) // Warning, not error
    expect(result.errors.some(e =>
      e.message.includes('unused') && e.severity === 'warning'
    )).toBe(true)
  })

  it('validates trigger word format', () => {
    const snippet = createValidSnippet()
    snippet.trigger = 'Invalid Trigger!'
    const result = validateSnippet(snippet)
    expect(result.errors.some(e =>
      e.field === 'trigger' && e.severity === 'warning'
    )).toBe(true)
  })

  it('accepts valid trigger words', () => {
    const snippet = createValidSnippet()
    snippet.trigger = 'valid-trigger_123'
    const result = validateSnippet(snippet)
    expect(result.errors.some(e => e.field === 'trigger')).toBe(false)
  })
})

// ============================================================================
// isSQLSnippet
// ============================================================================

describe('isSQLSnippet', () => {
  it('returns true for valid snippet', () => {
    const snippet: SQLSnippet = {
      id: 'test-1',
      name: 'Test',
      description: 'Test snippet',
      category: 'custom',
      tags: [],
      template: 'SELECT * FROM test',
      parameters: [],
      isBuiltIn: false,
      isFavorite: false,
      usageCount: 0,
      createdAt: new Date(),
      lastModified: new Date()
    }
    expect(isSQLSnippet(snippet)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isSQLSnippet(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSQLSnippet(undefined)).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(isSQLSnippet('string')).toBe(false)
    expect(isSQLSnippet(123)).toBe(false)
    expect(isSQLSnippet(true)).toBe(false)
  })

  it('returns false for missing required fields', () => {
    const invalid = {
      id: 'test',
      name: 'Test'
      // missing other fields
    }
    expect(isSQLSnippet(invalid)).toBe(false)
  })

  it('returns false for wrong field types', () => {
    const invalid = {
      id: 123, // should be string
      name: 'Test',
      description: 'Test',
      category: 'custom',
      tags: [],
      template: 'SELECT',
      parameters: [],
      isBuiltIn: false,
      isFavorite: false,
      usageCount: 0,
      createdAt: new Date(),
      lastModified: new Date()
    }
    expect(isSQLSnippet(invalid)).toBe(false)
  })

  it('returns false for invalid date types', () => {
    const invalid = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      category: 'custom',
      tags: [],
      template: 'SELECT',
      parameters: [],
      isBuiltIn: false,
      isFavorite: false,
      usageCount: 0,
      createdAt: 'not a date',
      lastModified: new Date()
    }
    expect(isSQLSnippet(invalid)).toBe(false)
  })
})

// ============================================================================
// isSnippetParameter
// ============================================================================

describe('isSnippetParameter', () => {
  it('returns true for valid parameter', () => {
    const param: SnippetParameter = {
      name: 'test',
      description: 'Test param',
      type: 'string'
    }
    expect(isSnippetParameter(param)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isSnippetParameter(null)).toBe(false)
  })

  it('returns false for missing required fields', () => {
    const invalid = {
      name: 'test'
      // missing description and type
    }
    expect(isSnippetParameter(invalid)).toBe(false)
  })

  it('returns false for invalid type', () => {
    const invalid = {
      name: 'test',
      description: 'Test',
      type: 'invalid-type'
    }
    expect(isSnippetParameter(invalid)).toBe(false)
  })

  it('accepts all valid parameter types', () => {
    const types = ['string', 'number', 'column', 'table', 'date', 'enum']
    types.forEach(type => {
      const param = {
        name: 'test',
        description: 'Test',
        type
      }
      expect(isSnippetParameter(param)).toBe(true)
    })
  })
})

// ============================================================================
// createSnippet
// ============================================================================

describe('createSnippet', () => {
  it('creates snippet with default values', () => {
    const partial = {
      name: 'Test Snippet',
      description: 'Test description',
      category: 'custom' as const,
      tags: ['test'],
      template: 'SELECT * FROM test',
      parameters: []
    }
    const snippet = createSnippet(partial)

    expect(snippet.name).toBe('Test Snippet')
    expect(snippet.description).toBe('Test description')
    expect(snippet.isBuiltIn).toBe(false)
    expect(snippet.isFavorite).toBe(false)
    expect(snippet.usageCount).toBe(0)
    expect(snippet.id).toMatch(/^custom-\d+-[a-z0-9]+$/)
    expect(snippet.createdAt).toBeInstanceOf(Date)
    expect(snippet.lastModified).toBeInstanceOf(Date)
  })

  it('generates unique IDs', () => {
    const partial = {
      name: 'Test',
      description: 'Test',
      category: 'custom' as const,
      tags: [],
      template: 'SELECT',
      parameters: []
    }
    const snippet1 = createSnippet(partial)
    const snippet2 = createSnippet(partial)

    expect(snippet1.id).not.toBe(snippet2.id)
  })

  it('preserves optional fields', () => {
    const partial = {
      name: 'Test',
      description: 'Test',
      category: 'custom' as const,
      tags: ['tag1', 'tag2'],
      template: 'SELECT',
      parameters: [],
      trigger: 'test',
      author: 'John Doe'
    }
    const snippet = createSnippet(partial)

    expect(snippet.trigger).toBe('test')
    expect(snippet.author).toBe('John Doe')
    expect(snippet.tags).toEqual(['tag1', 'tag2'])
  })
})
