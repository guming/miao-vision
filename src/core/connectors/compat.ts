/**
 * Compatibility Layer
 *
 * Provides backward-compatible API that wraps the new WasmConnector.
 * Allows existing code to work without changes during migration.
 *
 * @module core/connectors/compat
 *
 * @example
 * ```typescript
 * // Old code continues to work
 * import { duckDBManager } from '@core/database'
 *
 * await duckDBManager.initialize()
 * const result = await duckDBManager.query('SELECT * FROM users')
 * ```
 */

import type { AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { DatabaseConfig, QueryResult } from '@/types/database'
import { WasmConnector, createWasmConnector } from './wasm'

/**
 * Legacy DuckDBManager interface
 *
 * Matches the old API for backward compatibility.
 */
export interface LegacyDuckDBManager {
  initialize(config?: DatabaseConfig): Promise<void>
  query(sql: string): Promise<QueryResult>
  exec(sql: string): Promise<void>
  loadCSV(file: File, tableName: string): Promise<void>
  loadParquet(file: File, tableName: string): Promise<void>
  listTables(): Promise<string[]>
  getTableSchema(tableName: string): Promise<any[]>
  close(): Promise<void>
  isInitialized(): boolean
  getDB(): AsyncDuckDB | null
}

/**
 * Create a legacy-compatible manager from a WasmConnector
 *
 * @param connector - WasmConnector instance (optional, creates new if not provided)
 * @returns Legacy-compatible manager
 */
export function createLegacyManager(connector?: WasmConnector): LegacyDuckDBManager {
  let _connector: WasmConnector | null = connector || null

  return {
    /**
     * Initialize the database
     *
     * @param config - Optional database configuration
     * @throws Error if initialization fails
     */
    async initialize(_config: DatabaseConfig = {}): Promise<void> {
      if (_connector?.isConnected()) {
        console.log('DuckDB already initialized')
        return
      }

      _connector = createWasmConnector()

      const result = await _connector.connect({
        id: 'default-wasm',
        name: 'Default DuckDB',
        type: 'wasm',
        options: {
          persist: false // Match old behavior (in-memory)
        }
      })

      if (!result.ok) {
        throw new Error(result.error.message)
      }

      console.log('DuckDB-WASM initialized successfully')
    },

    /**
     * Execute a SQL query
     *
     * @param sql - SQL query string
     * @returns Query result
     * @throws Error if query fails
     */
    async query(sql: string): Promise<QueryResult> {
      if (!_connector?.isConnected()) {
        throw new Error('Database not initialized. Call initialize() first.')
      }

      const result = await _connector.query(sql)

      if (!result.ok) {
        console.error('Query execution failed:', result.error)
        throw new Error(result.error.message)
      }

      // Convert to legacy format (columns as string[])
      return {
        data: result.value.data as any[],
        columns: result.value.columns.map(c => c.name),
        rowCount: result.value.rowCount,
        executionTime: result.value.executionTime
      }
    },

    /**
     * Execute a SQL statement without returning results
     *
     * @param sql - SQL statement
     * @throws Error if execution fails
     */
    async exec(sql: string): Promise<void> {
      if (!_connector?.isConnected()) {
        throw new Error('Database not initialized. Call initialize() first.')
      }

      const result = await _connector.exec(sql)

      if (!result.ok) {
        console.error('Exec failed:', result.error)
        throw new Error(result.error.message)
      }
    },

    /**
     * Load a CSV file into a table
     *
     * @param file - CSV file
     * @param tableName - Target table name
     * @throws Error if loading fails
     */
    async loadCSV(file: File, tableName: string): Promise<void> {
      if (!_connector?.isConnected()) {
        throw new Error('Database not initialized')
      }

      const result = await _connector.loadFile(file, tableName)

      if (!result.ok) {
        console.error('Failed to load CSV:', result.error)
        throw new Error(result.error.message)
      }

      console.log(`CSV file loaded as table: ${tableName}`)
    },

    /**
     * Load a Parquet file into a table
     *
     * @param file - Parquet file
     * @param tableName - Target table name
     * @throws Error if loading fails
     */
    async loadParquet(file: File, tableName: string): Promise<void> {
      if (!_connector?.isConnected()) {
        throw new Error('Database not initialized')
      }

      const result = await _connector.loadFile(file, tableName)

      if (!result.ok) {
        console.error('Failed to load Parquet:', result.error)
        throw new Error(result.error.message)
      }

      console.log(`Parquet file loaded as table: ${tableName}`)
    },

    /**
     * List all tables
     *
     * @returns Array of table names
     */
    async listTables(): Promise<string[]> {
      if (!_connector?.isConnected()) {
        throw new Error('Database not initialized')
      }

      const result = await _connector.listTables()

      if (!result.ok) {
        console.error('Failed to list tables:', result.error)
        return []
      }

      return result.value.map(t => t.name)
    },

    /**
     * Get table schema
     *
     * @param tableName - Table name
     * @returns Array of column info
     * @throws Error if getting schema fails
     */
    async getTableSchema(tableName: string): Promise<any[]> {
      if (!_connector?.isConnected()) {
        throw new Error('Database not initialized')
      }

      // Use direct query for legacy format compatibility
      const queryResult = await this.query(`DESCRIBE ${tableName}`)
      return queryResult.data
    },

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
      if (_connector) {
        await _connector.disconnect()
        _connector = null
      }
      console.log('DuckDB connection closed')
    },

    /**
     * Check if database is initialized
     */
    isInitialized(): boolean {
      return _connector?.isConnected() ?? false
    },

    /**
     * Get the underlying AsyncDuckDB instance
     *
     * Used for Mosaic integration.
     */
    getDB(): AsyncDuckDB | null {
      return _connector?.getDB() as AsyncDuckDB | null
    }
  }
}

/**
 * Default singleton instance for backward compatibility
 *
 * @example
 * ```typescript
 * import { duckDBManagerCompat } from '@core/connectors/compat'
 *
 * await duckDBManagerCompat.initialize()
 * ```
 */
export const duckDBManagerCompat = createLegacyManager()

/**
 * Get the underlying WasmConnector from the compat layer
 *
 * Useful for gradual migration to new API.
 */
export function getConnectorFromCompat(manager: LegacyDuckDBManager): WasmConnector | null {
  // Access internal connector (for migration purposes)
  // Note: This is a workaround - in production, prefer direct connector usage
  return (manager as any)._connector || null
}
