/**
 * Connector Error Definitions
 *
 * Typed error classes for explicit error handling.
 * All errors include a code for programmatic handling.
 *
 * @module core/connectors/errors
 */

/** Error codes for connector operations */
export type ConnectorErrorCode =
  | 'NOT_INITIALIZED'
  | 'ALREADY_CONNECTED'
  | 'CONNECTION_FAILED'
  | 'DISCONNECTION_FAILED'
  | 'INVALID_CONFIG'
  | 'UNSUPPORTED_OPERATION'
  | 'STORAGE_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN'

/** Error codes for query operations */
export type QueryErrorCode =
  | 'QUERY_FAILED'
  | 'SYNTAX_ERROR'
  | 'TABLE_NOT_FOUND'
  | 'COLUMN_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNKNOWN'

/**
 * Base error interface
 */
export interface BaseError {
  /** Error code for programmatic handling */
  code: string
  /** Human-readable error message */
  message: string
  /** Original error (if wrapped) */
  cause?: unknown
}

/**
 * Connector error
 *
 * Errors related to connection lifecycle.
 *
 * @example
 * ```typescript
 * const error: ConnectorError = {
 *   code: 'CONNECTION_FAILED',
 *   message: 'Failed to connect to database',
 *   cause: originalError
 * }
 * ```
 */
export interface ConnectorError extends BaseError {
  code: ConnectorErrorCode
}

/**
 * Query error
 *
 * Errors related to query execution.
 *
 * @example
 * ```typescript
 * const error: QueryError = {
 *   code: 'SYNTAX_ERROR',
 *   message: 'Syntax error at line 1',
 *   sql: 'SELEC * FROM users'
 * }
 * ```
 */
export interface QueryError extends BaseError {
  code: QueryErrorCode
  /** The SQL that caused the error */
  sql?: string
  /** Line number (if available) */
  line?: number
  /** Column number (if available) */
  column?: number
}

/**
 * Create a connector error
 *
 * @param code - Error code
 * @param message - Error message
 * @param cause - Original error
 */
export function connectorError(
  code: ConnectorErrorCode,
  message: string,
  cause?: unknown
): ConnectorError {
  return { code, message, cause }
}

/**
 * Create a query error
 *
 * @param code - Error code
 * @param message - Error message
 * @param options - Additional options
 */
export function queryError(
  code: QueryErrorCode,
  message: string,
  options?: { sql?: string; cause?: unknown; line?: number; column?: number }
): QueryError {
  return {
    code,
    message,
    sql: options?.sql,
    cause: options?.cause,
    line: options?.line,
    column: options?.column
  }
}

/**
 * Check if an error is a ConnectorError
 */
export function isConnectorError(error: unknown): error is ConnectorError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as ConnectorError).code === 'string'
  )
}

/**
 * Check if an error is a QueryError
 */
export function isQueryError(error: unknown): error is QueryError {
  return isConnectorError(error) && 'sql' in error
}

/**
 * Convert unknown error to ConnectorError
 *
 * @param error - Unknown error
 * @param defaultCode - Default error code
 */
export function toConnectorError(
  error: unknown,
  defaultCode: ConnectorErrorCode = 'UNKNOWN'
): ConnectorError {
  if (isConnectorError(error)) {
    return error
  }

  if (error instanceof Error) {
    return connectorError(defaultCode, error.message, error)
  }

  return connectorError(defaultCode, String(error))
}

/**
 * Convert unknown error to QueryError
 *
 * @param error - Unknown error
 * @param sql - SQL that caused the error
 */
export function toQueryError(error: unknown, sql?: string): QueryError {
  if (isQueryError(error)) {
    return error
  }

  if (error instanceof Error) {
    // Try to detect error type from message
    const message = error.message.toLowerCase()

    if (message.includes('syntax')) {
      return queryError('SYNTAX_ERROR', error.message, { sql, cause: error })
    }
    if (message.includes('not found') || message.includes('does not exist')) {
      return queryError('TABLE_NOT_FOUND', error.message, { sql, cause: error })
    }
    if (message.includes('timeout')) {
      return queryError('TIMEOUT', error.message, { sql, cause: error })
    }

    return queryError('QUERY_FAILED', error.message, { sql, cause: error })
  }

  return queryError('UNKNOWN', String(error), { sql })
}
