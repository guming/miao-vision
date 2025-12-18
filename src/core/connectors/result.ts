/**
 * Result Type Utilities
 *
 * Explicit error handling without exceptions.
 * Inspired by Rust's Result type.
 *
 * @module core/connectors/result
 */

/**
 * Result type for explicit error handling
 *
 * @example
 * ```typescript
 * async function divide(a: number, b: number): Promise<Result<number, string>> {
 *   if (b === 0) {
 *     return err('Division by zero')
 *   }
 *   return ok(a / b)
 * }
 *
 * const result = await divide(10, 2)
 * if (result.ok) {
 *   console.log(result.value) // 5
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/**
 * Create a success result
 *
 * @param value - Success value
 *
 * @example
 * ```typescript
 * return ok({ data: rows, rowCount: 100 })
 * ```
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/**
 * Create an error result
 *
 * @param error - Error value
 *
 * @example
 * ```typescript
 * return err({ code: 'NOT_FOUND', message: 'Table not found' })
 * ```
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * Check if result is success
 *
 * @param result - Result to check
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok
}

/**
 * Check if result is error
 *
 * @param result - Result to check
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok
}

/**
 * Unwrap a result, throwing if error
 *
 * @param result - Result to unwrap
 * @throws Error if result is an error
 *
 * @example
 * ```typescript
 * const value = unwrap(await query('SELECT 1'))
 * ```
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value
  }
  throw new Error(`Unwrap called on error result: ${JSON.stringify(result.error)}`)
}

/**
 * Unwrap a result with a default value
 *
 * @param result - Result to unwrap
 * @param defaultValue - Default value if error
 *
 * @example
 * ```typescript
 * const tables = unwrapOr(await listTables(), [])
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue
}

/**
 * Map the success value of a result
 *
 * @param result - Result to map
 * @param fn - Mapping function
 *
 * @example
 * ```typescript
 * const countResult = map(queryResult, r => r.rowCount)
 * ```
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.value))
  }
  return result
}

/**
 * Map the error value of a result
 *
 * @param result - Result to map
 * @param fn - Mapping function
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (!result.ok) {
    return err(fn(result.error))
  }
  return result
}

/**
 * Chain results (flatMap)
 *
 * @param result - Result to chain
 * @param fn - Function returning a new Result
 *
 * @example
 * ```typescript
 * const result = await andThen(
 *   await connect(config),
 *   () => query('SELECT 1')
 * )
 * ```
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.ok) {
    return fn(result.value)
  }
  return result
}

/**
 * Chain async results
 *
 * @param result - Result to chain
 * @param fn - Async function returning a new Result
 */
export async function andThenAsync<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> {
  if (result.ok) {
    return fn(result.value)
  }
  return result
}

/**
 * Try to execute a function and return a Result
 *
 * @param fn - Function to execute
 * @param errorMapper - Function to map errors
 *
 * @example
 * ```typescript
 * const result = await tryAsync(
 *   () => db.query(sql),
 *   (e) => ({ code: 'QUERY_FAILED', message: e.message })
 * )
 * ```
 */
export async function tryAsync<T, E>(
  fn: () => Promise<T>,
  errorMapper: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const value = await fn()
    return ok(value)
  } catch (error) {
    return err(errorMapper(error))
  }
}

/**
 * Try to execute a sync function and return a Result
 *
 * @param fn - Function to execute
 * @param errorMapper - Function to map errors
 */
export function trySync<T, E>(
  fn: () => T,
  errorMapper: (error: unknown) => E
): Result<T, E> {
  try {
    const value = fn()
    return ok(value)
  } catch (error) {
    return err(errorMapper(error))
  }
}

/**
 * Combine multiple results into one
 *
 * @param results - Array of results
 * @returns Combined result with all values or first error
 *
 * @example
 * ```typescript
 * const [a, b, c] = unwrap(combine([resultA, resultB, resultC]))
 * ```
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = []

  for (const result of results) {
    if (!result.ok) {
      return result
    }
    values.push(result.value)
  }

  return ok(values)
}
