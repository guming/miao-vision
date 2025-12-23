/**
 * Connector Type Definitions
 *
 * Core interfaces for the pluggable connector system.
 * All connectors must implement these interfaces.
 *
 * @module core/connectors/types
 */

import type { Result } from './result'
import type { ConnectorError, QueryError } from './errors'

/** Supported connector types */
export type ConnectorType = 'wasm' | 'motherduck' | 'http' | 'rest' | 'postgres' | 'mysql' | 'csv' | 'parquet'

/** Connection status */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * Connector configuration
 *
 * @example
 * ```typescript
 * const config: ConnectorConfig = {
 *   id: 'local-wasm',
 *   name: 'Local DuckDB',
 *   type: 'wasm',
 *   options: { persist: true, dbPath: 'opfs://miao.db' }
 * }
 * ```
 */
export interface ConnectorConfig {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Connector type */
  type: ConnectorType
  /** Type-specific options */
  options: Record<string, unknown>
  /** Sensitive data (tokens, passwords) - stored separately */
  secrets?: Record<string, string>
}

/**
 * Connector capabilities
 *
 * Describes what features a connector supports.
 */
export interface ConnectorCapabilities {
  /** Can stream large result sets */
  supportsStreaming: boolean
  /** Supports database transactions */
  supportsTransactions: boolean
  /** Can execute DDL (CREATE, DROP, ALTER) */
  supportsDDL: boolean
  /** Maximum concurrent queries */
  maxConcurrentQueries: number
  /** Supports OPFS persistence (WASM only) */
  supportsPersistence: boolean
}

/**
 * Column information
 */
export interface ColumnInfo {
  /** Column name */
  name: string
  /** Column data type */
  type: string
  /** Is nullable */
  nullable: boolean
}

/**
 * Table information
 */
export interface TableInfo {
  /** Table name */
  name: string
  /** Schema name (if applicable) */
  schema?: string
  /** Column definitions */
  columns: ColumnInfo[]
  /** Approximate row count */
  rowCount?: number
}

/**
 * Query result
 *
 * Immutable data structure returned from queries.
 */
export interface QueryResult {
  /** Result rows */
  readonly data: ReadonlyArray<Record<string, unknown>>
  /** Column information */
  readonly columns: ReadonlyArray<ColumnInfo>
  /** Total row count */
  readonly rowCount: number
  /** Query execution time in milliseconds */
  readonly executionTime: number
}

/**
 * Query options
 */
export interface QueryOptions {
  /** Query timeout in milliseconds */
  timeout?: number
  /** Maximum rows to return */
  maxRows?: number
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Connection test result
 */
export interface TestResult {
  /** Connection latency in milliseconds */
  latency: number
  /** Server version (if available) */
  version?: string
  /** Additional info */
  info?: Record<string, unknown>
}

/**
 * Connector interface
 *
 * All connectors must implement this interface.
 *
 * @example
 * ```typescript
 * class WasmConnector implements Connector {
 *   readonly type = 'wasm'
 *   readonly capabilities = { ... }
 *
 *   async connect(config) { ... }
 *   async query(sql) { ... }
 * }
 * ```
 */
export interface Connector {
  /** Connector type identifier */
  readonly type: ConnectorType

  /** Connector capabilities */
  readonly capabilities: ConnectorCapabilities

  /** Current connection status */
  readonly status: ConnectionStatus

  /**
   * Connect to the data source
   *
   * @param config - Connection configuration
   * @returns Success or error
   */
  connect(config: ConnectorConfig): Promise<Result<void, ConnectorError>>

  /**
   * Disconnect from the data source
   *
   * @returns Success or error
   */
  disconnect(): Promise<Result<void, ConnectorError>>

  /**
   * Test the connection
   *
   * @returns Test result or error
   */
  testConnection(): Promise<Result<TestResult, ConnectorError>>

  /**
   * Execute a SQL query
   *
   * @param sql - SQL query string
   * @param options - Query options
   * @returns Query result or error
   */
  query(sql: string, options?: QueryOptions): Promise<Result<QueryResult, QueryError>>

  /**
   * Execute a SQL statement without returning results
   *
   * @param sql - SQL statement (CREATE, INSERT, etc.)
   * @returns Success or error
   */
  exec(sql: string): Promise<Result<void, QueryError>>

  /**
   * List all tables
   *
   * @returns Array of table info or error
   */
  listTables(): Promise<Result<TableInfo[], ConnectorError>>

  /**
   * Get table schema
   *
   * @param tableName - Table name
   * @returns Column information or error
   */
  getTableSchema(tableName: string): Promise<Result<ColumnInfo[], ConnectorError>>

  /**
   * Check if connected
   */
  isConnected(): boolean
}

/**
 * WASM-specific connector interface
 *
 * Extends base Connector with DuckDB-WASM specific methods.
 */
export interface WasmConnectorInterface extends Connector {
  readonly type: 'wasm'

  /**
   * Get the underlying AsyncDuckDB instance
   *
   * Used for Mosaic integration.
   */
  getDB(): unknown | null

  /**
   * Load a file into a table
   *
   * @param file - File to load (CSV or Parquet)
   * @param tableName - Target table name
   */
  loadFile(file: File, tableName: string): Promise<Result<TableInfo, ConnectorError>>

  /**
   * Force checkpoint to OPFS
   *
   * Only available when persistence is enabled.
   */
  checkpoint(): Promise<Result<void, ConnectorError>>

  /**
   * Export a table as Parquet
   *
   * @param tableName - Table to export
   * @returns Parquet data as Blob
   */
  exportParquet(tableName: string): Promise<Result<Blob, ConnectorError>>
}

/**
 * Connector constructor type
 *
 * Used by ConnectorRegistry for creating connector instances.
 */
export interface ConnectorConstructor {
  new (deps?: ConnectorDeps): Connector
}

/**
 * Connector dependencies
 *
 * Injected dependencies for testability.
 */
export interface ConnectorDeps {
  /** Logger instance */
  logger?: Logger
  /** Storage provider (for persistence) */
  storage?: StorageProvider
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

/**
 * Storage provider interface
 *
 * Abstraction for OPFS or other storage backends.
 */
export interface StorageProvider {
  /** Check if storage is available */
  isAvailable(): boolean
  /** Get storage usage info */
  getUsage(): Promise<{ used: number; quota: number }>
  /** Clear all stored data */
  clear(): Promise<void>
}
