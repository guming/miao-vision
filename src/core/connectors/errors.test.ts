/**
 * Error Utilities - Unit Tests
 *
 * Tests for error factory functions and type guards
 */

import { describe, it, expect } from 'vitest'
import {
  connectorError,
  queryError,
  isConnectorError,
  isQueryError,
  toConnectorError,
  toQueryError
} from './errors'

// ============================================================================
// connectorError
// ============================================================================

describe('connectorError', () => {
  it('creates a connector error with code and message', () => {
    const error = connectorError('CONNECTION_FAILED', 'Failed to connect')

    expect(error.code).toBe('CONNECTION_FAILED')
    expect(error.message).toBe('Failed to connect')
    expect(error.cause).toBeUndefined()
  })

  it('includes cause when provided', () => {
    const cause = new Error('underlying error')
    const error = connectorError('CONNECTION_FAILED', 'Failed to connect', cause)

    expect(error.code).toBe('CONNECTION_FAILED')
    expect(error.message).toBe('Failed to connect')
    expect(error.cause).toBe(cause)
  })

  it('supports all error codes', () => {
    const codes = [
      'NOT_INITIALIZED',
      'ALREADY_CONNECTED',
      'CONNECTION_FAILED',
      'DISCONNECTION_FAILED',
      'INVALID_CONFIG',
      'UNSUPPORTED_OPERATION',
      'STORAGE_ERROR',
      'TIMEOUT',
      'UNKNOWN'
    ] as const

    codes.forEach(code => {
      const error = connectorError(code, 'test')
      expect(error.code).toBe(code)
    })
  })
})

// ============================================================================
// queryError
// ============================================================================

describe('queryError', () => {
  it('creates a query error with code and message', () => {
    const error = queryError('SYNTAX_ERROR', 'Invalid syntax')

    expect(error.code).toBe('SYNTAX_ERROR')
    expect(error.message).toBe('Invalid syntax')
    expect(error.sql).toBeUndefined()
    expect(error.cause).toBeUndefined()
  })

  it('includes SQL and cause when provided', () => {
    const cause = new Error('parse error')
    const error = queryError('SYNTAX_ERROR', 'Invalid syntax', {
      sql: 'SELEC * FROM t',
      cause
    })

    expect(error.code).toBe('SYNTAX_ERROR')
    expect(error.message).toBe('Invalid syntax')
    expect(error.sql).toBe('SELEC * FROM t')
    expect(error.cause).toBe(cause)
  })

  it('includes line and column info when provided', () => {
    const error = queryError('SYNTAX_ERROR', 'Unexpected token', {
      sql: 'SELECT',
      line: 1,
      column: 7
    })

    expect(error.line).toBe(1)
    expect(error.column).toBe(7)
  })

  it('supports all error codes', () => {
    const codes = [
      'QUERY_FAILED',
      'SYNTAX_ERROR',
      'TABLE_NOT_FOUND',
      'COLUMN_NOT_FOUND',
      'PERMISSION_DENIED',
      'TIMEOUT',
      'CANCELLED',
      'UNKNOWN'
    ] as const

    codes.forEach(code => {
      const error = queryError(code, 'test', { sql: 'SELECT 1' })
      expect(error.code).toBe(code)
    })
  })
})

// ============================================================================
// isConnectorError / isQueryError
// ============================================================================

describe('isConnectorError', () => {
  it('returns true for connector errors', () => {
    const error = connectorError('CONNECTION_FAILED', 'test')
    expect(isConnectorError(error)).toBe(true)
  })

  it('returns true for query errors (they extend connector errors)', () => {
    const error = queryError('SYNTAX_ERROR', 'test', { sql: 'SELECT' })
    // Query errors are also connector errors (they have code and message)
    expect(isConnectorError(error)).toBe(true)
  })

  it('returns true for objects with code and message', () => {
    // isConnectorError is a structural check
    expect(isConnectorError({ code: 'CONNECTION_FAILED', message: 'test' })).toBe(true)
  })

  it('returns false for null/undefined', () => {
    expect(isConnectorError(null)).toBe(false)
    expect(isConnectorError(undefined)).toBe(false)
  })

  it('returns false for plain errors', () => {
    expect(isConnectorError(new Error('test'))).toBe(false)
  })
})

describe('isQueryError', () => {
  it('returns true for query errors with sql', () => {
    const error = queryError('SYNTAX_ERROR', 'test', { sql: 'SELECT' })
    expect(isQueryError(error)).toBe(true)
  })

  it('returns false for connector errors without sql', () => {
    const error = connectorError('CONNECTION_FAILED', 'test')
    expect(isQueryError(error)).toBe(false)
  })

  it('returns true for objects with code, message, and sql', () => {
    // isQueryError is a structural check
    expect(isQueryError({ code: 'SYNTAX_ERROR', message: 'test', sql: 'SELECT' })).toBe(true)
  })

  it('returns false for null/undefined', () => {
    expect(isQueryError(null)).toBe(false)
    expect(isQueryError(undefined)).toBe(false)
  })
})

// ============================================================================
// toConnectorError / toQueryError
// ============================================================================

describe('toConnectorError', () => {
  it('returns existing connector error unchanged', () => {
    const original = connectorError('CONNECTION_FAILED', 'test')
    const converted = toConnectorError(original)

    expect(converted).toBe(original)
  })

  it('converts Error to connector error', () => {
    const error = new Error('something went wrong')
    const converted = toConnectorError(error)

    expect(converted.code).toBe('UNKNOWN')
    expect(converted.message).toBe('something went wrong')
    expect(converted.cause).toBe(error)
  })

  it('converts string to connector error', () => {
    const converted = toConnectorError('error message')

    expect(converted.code).toBe('UNKNOWN')
    expect(converted.message).toBe('error message')
  })

  it('uses custom default code', () => {
    const error = new Error('timeout')
    const converted = toConnectorError(error, 'TIMEOUT')

    expect(converted.code).toBe('TIMEOUT')
  })

  it('handles unknown values', () => {
    const converted = toConnectorError({ random: 'object' })

    expect(converted.code).toBe('UNKNOWN')
    // Object is converted to string
    expect(converted.message).toBe('[object Object]')
  })

  it('handles null/undefined', () => {
    expect(toConnectorError(null).code).toBe('UNKNOWN')
    expect(toConnectorError(undefined).code).toBe('UNKNOWN')
  })
})

describe('toQueryError', () => {
  it('returns existing query error unchanged', () => {
    const original = queryError('SYNTAX_ERROR', 'test', { sql: 'SELECT' })
    const converted = toQueryError(original, 'SELECT')

    expect(converted).toBe(original)
  })

  it('converts Error to query error', () => {
    const error = new Error('query failed')
    const converted = toQueryError(error, 'SELECT * FROM t')

    expect(converted.code).toBe('QUERY_FAILED')
    expect(converted.message).toBe('query failed')
    expect(converted.sql).toBe('SELECT * FROM t')
    expect(converted.cause).toBe(error)
  })

  it('converts string to query error', () => {
    const converted = toQueryError('bad query', 'SELECT')

    expect(converted.code).toBe('UNKNOWN')
    expect(converted.message).toBe('bad query')
    expect(converted.sql).toBe('SELECT')
  })

  it('detects syntax errors from message', () => {
    const error = new Error('Syntax error near SELECT')
    const converted = toQueryError(error, 'SELEC')

    expect(converted.code).toBe('SYNTAX_ERROR')
  })

  it('detects table not found errors', () => {
    const error = new Error('Table "users" not found')
    const converted = toQueryError(error, 'SELECT * FROM users')

    expect(converted.code).toBe('TABLE_NOT_FOUND')
  })

  it('detects timeout errors', () => {
    const error = new Error('Query timeout after 30s')
    const converted = toQueryError(error, 'SELECT * FROM big_table')

    expect(converted.code).toBe('TIMEOUT')
  })

  it('handles unknown values', () => {
    const converted = toQueryError({ random: 'object' }, 'SELECT')

    expect(converted.code).toBe('UNKNOWN')
    expect(converted.message).toBe('[object Object]')
  })
})
