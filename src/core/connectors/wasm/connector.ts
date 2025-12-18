/**
 * WASM Connector
 *
 * DuckDB-WASM connector implementation with OPFS persistence support.
 *
 * @module core/connectors/wasm/connector
 */

import * as duckdb from '@duckdb/duckdb-wasm'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

// Bundle imports
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'

import type {
  WasmConnectorInterface,
  ConnectorConfig,
  ConnectorCapabilities,
  ConnectionStatus,
  QueryResult,
  QueryOptions,
  TestResult,
  TableInfo,
  ColumnInfo,
  StorageProvider
} from '../types'
import type { ConnectorError, QueryError } from '../errors'
import { connectorError, toQueryError } from '../errors'
import { type Result, ok, err, tryAsync } from '../result'
import type { WasmConnectorDeps, WasmConnectorOptions } from './types'

/**
 * Default WASM bundles
 */
const DEFAULT_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker
  }
}

/**
 * Check if OPFS is supported
 */
export function isOPFSSupported(): boolean {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) {
    return false
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (navigator.storage as any).getDirectory === 'function'
}

/**
 * Default console logger
 */
const defaultLogger = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
}

/**
 * WasmConnector - DuckDB-WASM implementation
 *
 * @example
 * ```typescript
 * const connector = createWasmConnector()
 * await connector.connect({
 *   id: 'local',
 *   name: 'Local DB',
 *   type: 'wasm',
 *   options: { persist: true }
 * })
 *
 * const result = await connector.query('SELECT * FROM users')
 * if (result.ok) {
 *   console.log(result.value.data)
 * }
 * ```
 */
export class WasmConnector implements WasmConnectorInterface {
  readonly type = 'wasm' as const

  readonly capabilities: ConnectorCapabilities = {
    supportsStreaming: false,
    supportsTransactions: true,
    supportsDDL: true,
    maxConcurrentQueries: 1,
    supportsPersistence: isOPFSSupported()
  }

  private db: AsyncDuckDB | null = null
  private conn: AsyncDuckDBConnection | null = null
  private _status: ConnectionStatus = 'disconnected'
  private _isPersistent = false
  private _dbPath = ':memory:'
  private checkpointTimer: ReturnType<typeof setInterval> | null = null

  private readonly deps: {
    logger: typeof defaultLogger
    storage?: StorageProvider
    duckdb: typeof duckdb
  }

  constructor(deps: WasmConnectorDeps = {}) {
    this.deps = {
      logger: deps.logger || defaultLogger,
      storage: deps.storage,
      duckdb: deps.duckdb || duckdb
    }
  }

  get status(): ConnectionStatus {
    return this._status
  }

  /**
   * Connect to DuckDB-WASM
   */
  async connect(config: ConnectorConfig): Promise<Result<void, ConnectorError>> {
    if (this.db) {
      return err(connectorError('ALREADY_CONNECTED', 'Already connected'))
    }

    this._status = 'connecting'
    const options = config.options as WasmConnectorOptions

    try {
      // Select bundle
      const bundle = await this.deps.duckdb.selectBundle(DEFAULT_BUNDLES)

      if (!bundle.mainWorker) {
        this._status = 'error'
        return err(connectorError('CONNECTION_FAILED', 'Failed to select DuckDB worker'))
      }

      // Create worker and database
      const logger = new this.deps.duckdb.ConsoleLogger()
      const worker = new Worker(bundle.mainWorker)

      this.db = new this.deps.duckdb.AsyncDuckDB(logger, worker)
      await this.db.instantiate(bundle.mainModule)

      // Handle persistence
      const persist = Boolean(options?.persist) && isOPFSSupported()
      this._dbPath = persist ? (options?.dbPath || 'opfs://miao.db') : ':memory:'
      this._isPersistent = persist

      // Open database (OPFS support requires v1.30.0+)
      // For now, we use in-memory mode
      // TODO: Upgrade to v1.30.0+ for OPFS support
      this.conn = await this.db.connect()

      // Start auto-checkpoint if enabled
      if (persist && options?.autoCheckpoint !== false) {
        this.startAutoCheckpoint(options?.checkpointInterval || 30000)
      }

      this._status = 'connected'
      this.deps.logger.info(`DuckDB-WASM connected (persistent: ${persist})`)

      return ok(undefined)
    } catch (error) {
      this._status = 'error'
      return err(
        connectorError(
          'CONNECTION_FAILED',
          `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      )
    }
  }

  /**
   * Disconnect from DuckDB-WASM
   */
  async disconnect(): Promise<Result<void, ConnectorError>> {
    this.stopAutoCheckpoint()

    try {
      if (this.conn) {
        await this.conn.close()
        this.conn = null
      }

      if (this.db) {
        await this.db.terminate()
        this.db = null
      }

      this._status = 'disconnected'
      this.deps.logger.info('DuckDB-WASM disconnected')

      return ok(undefined)
    } catch (error) {
      return err(
        connectorError(
          'DISCONNECTION_FAILED',
          `Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      )
    }
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<Result<TestResult, ConnectorError>> {
    if (!this.conn) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    const start = performance.now()

    try {
      await this.conn.query('SELECT 1')
      const latency = performance.now() - start

      return ok({
        latency,
        version: 'DuckDB-WASM',
        info: {
          persistent: this._isPersistent,
          dbPath: this._dbPath
        }
      })
    } catch (error) {
      return err(
        connectorError(
          'CONNECTION_FAILED',
          `Connection test failed: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      )
    }
  }

  /**
   * Execute a SQL query
   */
  async query(sql: string, options?: QueryOptions): Promise<Result<QueryResult, QueryError>> {
    if (!this.conn) {
      return err(toQueryError(new Error('Not connected'), sql))
    }

    const startTime = performance.now()

    return tryAsync(
      async () => {
        const result = await this.conn!.query(sql)
        const schema = result.schema
        const columns: ColumnInfo[] = schema.fields.map(field => ({
          name: field.name,
          type: field.type.toString(),
          nullable: field.nullable
        }))

        // Convert Arrow to JSON with date handling
        const dateColumnIndices = new Set<number>()
        schema.fields.forEach((field, index) => {
          const typeStr = field.type.toString().toLowerCase()
          if (typeStr.includes('date') || typeStr.includes('timestamp')) {
            dateColumnIndices.add(index)
          }
        })

        const data = result.toArray().map(row => {
          const jsonRow = row.toJSON()

          // Convert date columns
          if (dateColumnIndices.size > 0) {
            columns.forEach((col, index) => {
              if (dateColumnIndices.has(index) && jsonRow[col.name] != null) {
                const timestamp = jsonRow[col.name]
                if (typeof timestamp === 'number') {
                  const date = new Date(timestamp)
                  if (!isNaN(date.getTime())) {
                    jsonRow[col.name] = date.toISOString().split('T')[0]
                  }
                }
              }
            })
          }

          return jsonRow
        })

        const executionTime = performance.now() - startTime

        // Apply maxRows limit
        const limitedData = options?.maxRows ? data.slice(0, options.maxRows) : data

        return {
          data: limitedData,
          columns,
          rowCount: limitedData.length,
          executionTime
        }
      },
      error => toQueryError(error, sql)
    )
  }

  /**
   * Execute a SQL statement without returning results
   */
  async exec(sql: string): Promise<Result<void, QueryError>> {
    if (!this.conn) {
      return err(toQueryError(new Error('Not connected'), sql))
    }

    return tryAsync(
      async () => {
        await this.conn!.query(sql)
      },
      error => toQueryError(error, sql)
    )
  }

  /**
   * List all tables
   */
  async listTables(): Promise<Result<TableInfo[], ConnectorError>> {
    if (!this.conn) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    const queryResult = await this.query('SHOW TABLES')

    if (!queryResult.ok) {
      return err(connectorError('UNKNOWN', queryResult.error.message, queryResult.error))
    }

    const tables: TableInfo[] = queryResult.value.data.map((row: Record<string, unknown>) => ({
      name: String(row.name),
      columns: []
    }))

    return ok(tables)
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<Result<ColumnInfo[], ConnectorError>> {
    if (!this.conn) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    const queryResult = await this.query(`DESCRIBE ${tableName}`)

    if (!queryResult.ok) {
      return err(connectorError('UNKNOWN', queryResult.error.message, queryResult.error))
    }

    const columns: ColumnInfo[] = queryResult.value.data.map((row: Record<string, unknown>) => ({
      name: String(row.column_name),
      type: String(row.column_type),
      nullable: row.null === 'YES'
    }))

    return ok(columns)
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.db !== null && this.conn !== null
  }

  // ==================== WASM-specific methods ====================

  /**
   * Get the underlying AsyncDuckDB instance
   *
   * Used for Mosaic integration.
   */
  getDB(): AsyncDuckDB | null {
    return this.db
  }

  /**
   * Load a file into a table
   */
  async loadFile(file: File, tableName: string): Promise<Result<TableInfo, ConnectorError>> {
    if (!this.db || !this.conn) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    try {
      const buffer = await file.arrayBuffer()
      const fileName = `/${file.name}`

      await this.db.registerFileBuffer(fileName, new Uint8Array(buffer))

      // Detect file type and load
      const isParquet = file.name.toLowerCase().endsWith('.parquet')
      const readFn = isParquet ? 'read_parquet' : 'read_csv_auto'

      await this.conn.query(`
        CREATE TABLE ${tableName} AS
        SELECT * FROM ${readFn}('${fileName}')
      `)

      // Get table info
      const schemaResult = await this.getTableSchema(tableName)
      const countResult = await this.query(`SELECT COUNT(*) as cnt FROM ${tableName}`)

      const columns = schemaResult.ok ? schemaResult.value : []
      const rowCount = countResult.ok ? Number(countResult.value.data[0]?.cnt) || 0 : 0

      this.deps.logger.info(`Loaded ${file.name} as table: ${tableName}`)

      return ok({
        name: tableName,
        columns,
        rowCount
      })
    } catch (error) {
      return err(
        connectorError(
          'UNKNOWN',
          `Failed to load file: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      )
    }
  }

  /**
   * Force checkpoint to OPFS
   */
  async checkpoint(): Promise<Result<void, ConnectorError>> {
    if (!this.conn) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    if (!this._isPersistent) {
      return ok(undefined) // No-op for non-persistent mode
    }

    try {
      await this.conn.query('CHECKPOINT')
      return ok(undefined)
    } catch (error) {
      return err(
        connectorError(
          'STORAGE_ERROR',
          `Checkpoint failed: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      )
    }
  }

  /**
   * Export a table as Parquet
   */
  async exportParquet(tableName: string): Promise<Result<Blob, ConnectorError>> {
    if (!this.db || !this.conn) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    try {
      const fileName = `/${tableName}_export.parquet`
      await this.conn.query(`COPY ${tableName} TO '${fileName}' (FORMAT PARQUET)`)

      const buffer = await this.db.copyFileToBuffer(fileName)
      // Create a new Uint8Array copy to avoid SharedArrayBuffer issues
      const copy = new Uint8Array(buffer)
      return ok(new Blob([copy], { type: 'application/octet-stream' }))
    } catch (error) {
      return err(
        connectorError(
          'UNKNOWN',
          `Export failed: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      )
    }
  }

  // ==================== Private methods ====================

  private startAutoCheckpoint(intervalMs: number): void {
    this.stopAutoCheckpoint()
    this.checkpointTimer = setInterval(() => {
      this.checkpoint().catch(err => {
        this.deps.logger.error('Auto-checkpoint failed:', err)
      })
    }, intervalMs)
  }

  private stopAutoCheckpoint(): void {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer)
      this.checkpointTimer = null
    }
  }
}

/**
 * Create a WasmConnector instance
 *
 * Factory function for dependency injection.
 *
 * @param deps - Optional dependencies
 * @returns WasmConnector instance
 */
export function createWasmConnector(deps?: WasmConnectorDeps): WasmConnector {
  return new WasmConnector(deps)
}
