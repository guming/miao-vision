/**
 * MotherDuck Connector Types
 *
 * Type definitions for MotherDuck cloud DuckDB connector.
 *
 * @module core/connectors/motherduck/types
 */

import type { Logger } from '../types'

/**
 * MotherDuck connector options
 */
export interface MotherDuckConnectorOptions {
  /**
   * MotherDuck authentication token
   */
  token: string

  /**
   * Database name (optional, uses default if not specified)
   */
  database?: string

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Retry configuration
   */
  retry?: {
    /** Maximum retry attempts */
    maxAttempts?: number
    /** Initial backoff delay in ms */
    initialDelay?: number
    /** Maximum backoff delay in ms */
    maxDelay?: number
  }
}

/**
 * MotherDuck connector dependencies
 */
export interface MotherDuckConnectorDeps {
  /** Logger instance */
  logger?: Logger

  /** Custom fetch implementation (for testing) */
  fetch?: typeof fetch
}
