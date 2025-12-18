/**
 * HTTP Connector Types
 *
 * Type definitions for HTTP-based DuckDB connector.
 *
 * @module core/connectors/http/types
 */

import type { Logger } from '../types'

/**
 * HTTP connector options
 */
export interface HttpConnectorOptions {
  /**
   * Base URL of the DuckDB HTTP server
   * @example 'http://localhost:8080'
   */
  baseUrl: string

  /**
   * Optional authentication token
   */
  token?: string

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Custom headers to include in requests
   */
  headers?: Record<string, string>

  /**
   * API path configuration
   */
  paths?: {
    /** Query endpoint path */
    query?: string
    /** Health check endpoint path */
    health?: string
    /** Tables list endpoint path */
    tables?: string
  }
}

/**
 * HTTP connector dependencies
 */
export interface HttpConnectorDeps {
  /** Logger instance */
  logger?: Logger

  /** Custom fetch implementation (for testing) */
  fetch?: typeof fetch
}

/**
 * Standard HTTP response format for queries
 */
export interface HttpQueryResponse {
  /** Query result data */
  data: Record<string, unknown>[]

  /** Column schema */
  schema?: Array<{
    name: string
    type: string
    nullable?: boolean
  }>

  /** Row count */
  rowCount?: number

  /** Execution time in ms */
  executionTime?: number

  /** Error message if failed */
  error?: string
}
