/**
 * Template Utilities - Unit Tests
 *
 * Tests for pure functions in template-utils.ts
 */

import { describe, it, expect } from 'vitest'
import {
  hasTemplateVariables,
  hasInputVariables,
  extractVariables,
  validateContext,
  escapeForSQL,
  interpolateSQL,
  resolveBlockReferences,
  interpolateFullSQL,
  PATTERNS,
  type TemplateContext
} from './template-utils'

// ============================================================================
// hasTemplateVariables
// ============================================================================

describe('hasTemplateVariables', () => {
  it('returns true for template variables', () => {
    expect(hasTemplateVariables('SELECT * FROM ${table}')).toBe(true)
    expect(hasTemplateVariables('${inputs.region}')).toBe(true)
    expect(hasTemplateVariables('${metadata.title}')).toBe(true)
  })

  it('returns false for plain strings', () => {
    expect(hasTemplateVariables('SELECT * FROM users')).toBe(false)
    expect(hasTemplateVariables('no variables here')).toBe(false)
    expect(hasTemplateVariables('')).toBe(false)
  })

  it('handles edge cases', () => {
    expect(hasTemplateVariables('$notvar')).toBe(false)
    expect(hasTemplateVariables('{notvar}')).toBe(false)
    expect(hasTemplateVariables('${}')).toBe(false)
  })
})

// ============================================================================
// hasInputVariables
// ============================================================================

describe('hasInputVariables', () => {
  it('returns true for input variables', () => {
    expect(hasInputVariables('${inputs.region}')).toBe(true)
    expect(hasInputVariables('WHERE region = ${inputs.region}')).toBe(true)
  })

  it('returns false for non-input variables', () => {
    expect(hasInputVariables('${metadata.title}')).toBe(false)
    expect(hasInputVariables('${table_name}')).toBe(false)
    expect(hasInputVariables('SELECT * FROM users')).toBe(false)
  })
})

// ============================================================================
// extractVariables
// ============================================================================

describe('extractVariables', () => {
  it('extracts input variables', () => {
    const result = extractVariables('SELECT * FROM sales WHERE region = ${inputs.region}')
    expect(result.inputs).toEqual(['region'])
    expect(result.metadata).toEqual([])
    expect(result.blocks).toEqual([])
  })

  it('extracts metadata variables', () => {
    const result = extractVariables('/* Title: ${metadata.title} */')
    expect(result.inputs).toEqual([])
    expect(result.metadata).toEqual(['title'])
    expect(result.blocks).toEqual([])
  })

  it('extracts block references', () => {
    const result = extractVariables('SELECT * FROM ${sales_data}')
    expect(result.inputs).toEqual([])
    expect(result.metadata).toEqual([])
    expect(result.blocks).toEqual(['sales_data'])
  })

  it('extracts all variable types', () => {
    const sql = `
      SELECT * FROM \${sales_data}
      WHERE region = \${inputs.region}
      /* Report: \${metadata.title} */
    `
    const result = extractVariables(sql)
    expect(result.inputs).toEqual(['region'])
    expect(result.metadata).toEqual(['title'])
    expect(result.blocks).toEqual(['sales_data'])
  })

  it('deduplicates variables', () => {
    const sql = '${inputs.region} ${inputs.region} ${inputs.region}'
    const result = extractVariables(sql)
    expect(result.inputs).toEqual(['region'])
  })

  it('handles empty string', () => {
    const result = extractVariables('')
    expect(result.inputs).toEqual([])
    expect(result.metadata).toEqual([])
    expect(result.blocks).toEqual([])
  })
})

// ============================================================================
// validateContext
// ============================================================================

describe('validateContext', () => {
  it('returns valid when all variables have values', () => {
    const context: TemplateContext = {
      inputs: { region: 'West' },
      metadata: { title: 'Report' }
    }
    const result = validateContext(
      'SELECT * FROM sales WHERE region = ${inputs.region}',
      context
    )
    expect(result.valid).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('returns missing variables', () => {
    const context: TemplateContext = {
      inputs: {},
      metadata: {}
    }
    const result = validateContext(
      '${inputs.region} ${metadata.title}',
      context
    )
    expect(result.valid).toBe(false)
    expect(result.missing).toContain('inputs.region')
    expect(result.missing).toContain('metadata.title')
  })

  it('treats null as missing', () => {
    const context: TemplateContext = {
      inputs: { region: null },
      metadata: {}
    }
    const result = validateContext('${inputs.region}', context)
    expect(result.valid).toBe(false)
    expect(result.missing).toContain('inputs.region')
  })
})

// ============================================================================
// escapeForSQL
// ============================================================================

describe('escapeForSQL', () => {
  it('escapes strings with single quotes', () => {
    expect(escapeForSQL('hello')).toBe("'hello'")
    expect(escapeForSQL("it's")).toBe("'it''s'")
    expect(escapeForSQL("O'Brien")).toBe("'O''Brien'")
  })

  it('returns numbers as-is', () => {
    expect(escapeForSQL(42)).toBe('42')
    expect(escapeForSQL(3.14)).toBe('3.14')
    expect(escapeForSQL(-100)).toBe('-100')
  })

  it('returns booleans as-is', () => {
    expect(escapeForSQL(true)).toBe('true')
    expect(escapeForSQL(false)).toBe('false')
  })

  it('returns NULL for null/undefined', () => {
    expect(escapeForSQL(null)).toBe('NULL')
    expect(escapeForSQL(undefined)).toBe('NULL')
  })

  it('formats dates as ISO strings', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    expect(escapeForSQL(date)).toBe("'2024-01-15T10:30:00.000Z'")
  })

  it('formats arrays as SQL tuples', () => {
    expect(escapeForSQL(['a', 'b', 'c'])).toBe("('a', 'b', 'c')")
    expect(escapeForSQL([1, 2, 3])).toBe('(1, 2, 3)')
    expect(escapeForSQL(["it's", 'fine'])).toBe("('it''s', 'fine')")
  })

  it('returns NULL for unknown types', () => {
    expect(escapeForSQL({})).toBe('NULL')
    expect(escapeForSQL(Symbol('test'))).toBe('NULL')
  })
})

// ============================================================================
// interpolateSQL
// ============================================================================

describe('interpolateSQL', () => {
  it('replaces input variables', () => {
    const context: TemplateContext = {
      inputs: { region: 'West' },
      metadata: {}
    }
    const result = interpolateSQL(
      "SELECT * FROM sales WHERE region = ${inputs.region}",
      context
    )
    expect(result.output).toBe("SELECT * FROM sales WHERE region = 'West'")
    expect(result.replacedVariables).toContain('inputs.region')
    expect(result.missingVariables).toEqual([])
  })

  it('replaces metadata variables', () => {
    const context: TemplateContext = {
      inputs: {},
      metadata: { title: 'Sales Report' }
    }
    const result = interpolateSQL(
      "-- Title: ${metadata.title}",
      context
    )
    expect(result.output).toBe("-- Title: 'Sales Report'")
    expect(result.replacedVariables).toContain('metadata.title')
  })

  it('replaces missing variables with NULL', () => {
    const context: TemplateContext = {
      inputs: {},
      metadata: {}
    }
    const result = interpolateSQL(
      "SELECT * FROM sales WHERE region = ${inputs.region}",
      context
    )
    expect(result.output).toBe("SELECT * FROM sales WHERE region = NULL")
    expect(result.missingVariables).toContain('inputs.region')
  })

  it('handles multiple variables', () => {
    const context: TemplateContext = {
      inputs: { region: 'West', year: 2024 },
      metadata: { title: 'Report' }
    }
    const result = interpolateSQL(
      "SELECT * FROM sales WHERE region = ${inputs.region} AND year = ${inputs.year}",
      context
    )
    expect(result.output).toBe("SELECT * FROM sales WHERE region = 'West' AND year = 2024")
    expect(result.replacedVariables).toHaveLength(2)
  })

  it('handles array values with IN clause', () => {
    const context: TemplateContext = {
      inputs: { regions: ['West', 'East', 'North'] },
      metadata: {}
    }
    const result = interpolateSQL(
      "SELECT * FROM sales WHERE region IN ${inputs.regions}",
      context
    )
    expect(result.output).toBe("SELECT * FROM sales WHERE region IN ('West', 'East', 'North')")
  })
})

// ============================================================================
// resolveBlockReferences
// ============================================================================

describe('resolveBlockReferences', () => {
  it('replaces block references with table names', () => {
    const tableMapping = new Map([['sales_data', 'chart_data_block_0']])
    const result = resolveBlockReferences(
      'SELECT * FROM ${sales_data}',
      tableMapping
    )
    expect(result.output).toBe('SELECT * FROM chart_data_block_0')
    expect(result.replacedVariables).toContain('sales_data')
  })

  it('keeps qualified references unchanged', () => {
    const tableMapping = new Map<string, string>()
    const result = resolveBlockReferences(
      'WHERE region = ${inputs.region}',
      tableMapping
    )
    expect(result.output).toBe('WHERE region = ${inputs.region}')
  })

  it('reports missing block references', () => {
    const tableMapping = new Map<string, string>()
    const result = resolveBlockReferences(
      'SELECT * FROM ${unknown_block}',
      tableMapping
    )
    expect(result.output).toBe('SELECT * FROM ${unknown_block}')
    expect(result.missingVariables).toContain('unknown_block')
  })

  it('handles multiple block references', () => {
    const tableMapping = new Map([
      ['sales', 'table_sales'],
      ['customers', 'table_customers']
    ])
    const result = resolveBlockReferences(
      'SELECT * FROM ${sales} JOIN ${customers} ON sales.id = customers.id',
      tableMapping
    )
    expect(result.output).toBe(
      'SELECT * FROM table_sales JOIN table_customers ON sales.id = customers.id'
    )
  })
})

// ============================================================================
// interpolateFullSQL
// ============================================================================

describe('interpolateFullSQL', () => {
  it('resolves block refs and interpolates variables', () => {
    const tableMapping = new Map([['sales_data', 'chart_data_0']])
    const context: TemplateContext = {
      inputs: { region: 'West' },
      metadata: {}
    }
    const result = interpolateFullSQL(
      "SELECT * FROM ${sales_data} WHERE region = ${inputs.region}",
      tableMapping,
      context
    )
    expect(result.output).toBe("SELECT * FROM chart_data_0 WHERE region = 'West'")
    expect(result.replacedVariables).toContain('sales_data')
    expect(result.replacedVariables).toContain('inputs.region')
  })

  it('combines missing variables from both steps', () => {
    const tableMapping = new Map<string, string>()
    const context: TemplateContext = {
      inputs: {},
      metadata: {}
    }
    const result = interpolateFullSQL(
      "SELECT * FROM ${unknown_table} WHERE x = ${inputs.missing}",
      tableMapping,
      context
    )
    expect(result.missingVariables).toContain('unknown_table')
    expect(result.missingVariables).toContain('inputs.missing')
  })
})

// ============================================================================
// PATTERNS - Regex Validation
// ============================================================================

describe('PATTERNS', () => {
  describe('TEMPLATE_VAR', () => {
    it('matches simple variable references', () => {
      const matches = '${foo} ${bar_123} ${_test}'.match(new RegExp(PATTERNS.TEMPLATE_VAR.source, 'g'))
      expect(matches).toEqual(['${foo}', '${bar_123}', '${_test}'])
    })
  })

  describe('INPUT_VAR', () => {
    it('matches input variable references', () => {
      const matches = '${inputs.region} ${inputs.year}'.match(new RegExp(PATTERNS.INPUT_VAR.source, 'g'))
      expect(matches).toEqual(['${inputs.region}', '${inputs.year}'])
    })
  })

  describe('METADATA_VAR', () => {
    it('matches metadata variable references', () => {
      const matches = '${metadata.title} ${metadata.author}'.match(new RegExp(PATTERNS.METADATA_VAR.source, 'g'))
      expect(matches).toEqual(['${metadata.title}', '${metadata.author}'])
    })
  })
})
