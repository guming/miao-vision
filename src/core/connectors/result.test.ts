/**
 * Result Utilities - Unit Tests
 *
 * Tests for Result type utilities (ok, err, map, andThen, etc.)
 */

import { describe, it, expect } from 'vitest'
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  andThen,
  andThenAsync,
  tryAsync,
  trySync,
  combine
} from './result'

// ============================================================================
// ok / err
// ============================================================================

describe('ok', () => {
  it('creates a successful result', () => {
    const result = ok(42)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(42)
    }
  })

  it('works with different value types', () => {
    const strResult = ok('string')
    const objResult = ok({ a: 1 })
    const arrResult = ok([1, 2, 3])
    const nullResult = ok(null)
    const undefResult = ok(undefined)

    if (strResult.ok) expect(strResult.value).toBe('string')
    if (objResult.ok) expect(objResult.value).toEqual({ a: 1 })
    if (arrResult.ok) expect(arrResult.value).toEqual([1, 2, 3])
    if (nullResult.ok) expect(nullResult.value).toBe(null)
    if (undefResult.ok) expect(undefResult.value).toBe(undefined)
  })
})

describe('err', () => {
  it('creates a failed result', () => {
    const result = err('error message')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('error message')
    }
  })

  it('works with error objects', () => {
    const error = new Error('test error')
    const result = err(error)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe(error)
    }
  })

  it('works with custom error types', () => {
    const customError = { code: 'NOT_FOUND', message: 'Resource not found' }
    const result = err(customError)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toEqual(customError)
    }
  })
})

// ============================================================================
// isOk / isErr
// ============================================================================

describe('isOk', () => {
  it('returns true for successful results', () => {
    expect(isOk(ok(42))).toBe(true)
    expect(isOk(ok(null))).toBe(true)
  })

  it('returns false for failed results', () => {
    expect(isOk(err('error'))).toBe(false)
  })
})

describe('isErr', () => {
  it('returns true for failed results', () => {
    expect(isErr(err('error'))).toBe(true)
  })

  it('returns false for successful results', () => {
    expect(isErr(ok(42))).toBe(false)
    expect(isErr(ok(null))).toBe(false)
  })
})

// ============================================================================
// unwrap / unwrapOr
// ============================================================================

describe('unwrap', () => {
  it('returns value for successful result', () => {
    expect(unwrap(ok(42))).toBe(42)
    expect(unwrap(ok('test'))).toBe('test')
  })

  it('throws for failed result', () => {
    expect(() => unwrap(err('error message'))).toThrow('error message')
  })

  it('throws with error message from error object', () => {
    const error = { message: 'custom error' }
    expect(() => unwrap(err(error))).toThrow('custom error')
  })
})

describe('unwrapOr', () => {
  it('returns value for successful result', () => {
    expect(unwrapOr(ok(42), 0)).toBe(42)
  })

  it('returns default for failed result', () => {
    expect(unwrapOr(err('error'), 0)).toBe(0)
    expect(unwrapOr(err('error'), 'default')).toBe('default')
  })
})

// ============================================================================
// map / mapErr
// ============================================================================

describe('map', () => {
  it('transforms successful result value', () => {
    const result = map(ok(5), x => x * 2)
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe(10)
  })

  it('passes through failed result unchanged', () => {
    const original = err('error')
    const result = map(original, (x: number) => x * 2)
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error).toBe('error')
    }
  })

  it('can change value type', () => {
    const result = map(ok(42), x => x.toString())
    expect(unwrap(result)).toBe('42')
  })
})

describe('mapErr', () => {
  it('transforms error in failed result', () => {
    const result = mapErr(err('error'), e => `wrapped: ${e}`)
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error).toBe('wrapped: error')
    }
  })

  it('passes through successful result unchanged', () => {
    const result = mapErr(ok(42), e => `wrapped: ${e}`)
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe(42)
  })
})

// ============================================================================
// andThen / andThenAsync
// ============================================================================

describe('andThen', () => {
  it('chains successful operations', () => {
    const divide = (a: number, b: number) =>
      b === 0 ? err('division by zero') : ok(a / b)

    const result = andThen(ok(10), x => divide(x, 2))
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe(5)
  })

  it('short-circuits on first error', () => {
    const divide = (a: number, b: number) =>
      b === 0 ? err('division by zero') : ok(a / b)

    const result = andThen(ok(10), x => divide(x, 0))
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error).toBe('division by zero')
    }
  })

  it('propagates initial error', () => {
    const result = andThen(err('initial error'), (x: number) => ok(x * 2))
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error).toBe('initial error')
    }
  })
})

describe('andThenAsync', () => {
  it('chains async successful operations', async () => {
    const asyncDouble = async (x: number) => ok(x * 2)

    const result = await andThenAsync(ok(5), asyncDouble)
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe(10)
  })

  it('short-circuits on error', async () => {
    const asyncFail = async (_x: number) => err('async error')

    const result = await andThenAsync(ok(5), asyncFail)
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error).toBe('async error')
    }
  })

  it('propagates initial error without calling fn', async () => {
    let called = false
    const asyncFn = async (x: number) => {
      called = true
      return ok(x * 2)
    }

    const result = await andThenAsync(err('initial'), asyncFn)
    expect(called).toBe(false)
    expect(isErr(result)).toBe(true)
  })
})

// ============================================================================
// tryAsync / trySync
// ============================================================================

describe('tryAsync', () => {
  it('wraps successful async operation', async () => {
    const result = await tryAsync(
      async () => 42,
      e => String(e)
    )
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe(42)
  })

  it('catches async errors', async () => {
    const result = await tryAsync(
      async () => { throw new Error('async failure') },
      e => (e as Error).message
    )
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error).toBe('async failure')
    }
  })

  it('uses error mapper for custom error types', async () => {
    const result = await tryAsync(
      async () => { throw new Error('test') },
      e => ({ code: 'ERROR', message: (e as Error).message })
    )
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error).toEqual({ code: 'ERROR', message: 'test' })
    }
  })
})

describe('trySync', () => {
  it('wraps successful sync operation', () => {
    const result = trySync(
      () => 42,
      e => String(e)
    )
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe(42)
  })

  it('catches sync errors', () => {
    const result = trySync(
      () => { throw new Error('sync failure') },
      e => (e as Error).message
    )
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error).toBe('sync failure')
    }
  })
})

// ============================================================================
// combine
// ============================================================================

describe('combine', () => {
  it('combines all successful results', () => {
    const results = [ok(1), ok(2), ok(3)]
    const combined = combine(results)

    expect(isOk(combined)).toBe(true)
    expect(unwrap(combined)).toEqual([1, 2, 3])
  })

  it('returns first error if any fails', () => {
    const results = [ok(1), err('error'), ok(3)]
    const combined = combine(results)

    expect(isErr(combined)).toBe(true)
    if (!combined.ok) {
      expect(combined.error).toBe('error')
    }
  })

  it('returns first error when multiple errors exist', () => {
    const results = [err('first'), err('second'), err('third')]
    const combined = combine(results)

    expect(isErr(combined)).toBe(true)
    if (!combined.ok) {
      expect(combined.error).toBe('first')
    }
  })

  it('handles empty array', () => {
    const combined = combine([])
    expect(isOk(combined)).toBe(true)
    expect(unwrap(combined)).toEqual([])
  })

  it('preserves types in combined array', () => {
    const results = [ok('a'), ok('b'), ok('c')]
    const combined = combine(results)

    if (isOk(combined)) {
      expect(combined.value).toEqual(['a', 'b', 'c'])
    }
  })
})
