/**
 * MotherDuck Connector
 *
 * Cloud DuckDB connector using MotherDuck's API.
 * Provides serverless DuckDB with cloud persistence.
 *
 * @module core/connectors/motherduck/connector
 *
 * @example
 * ```typescript
 * const connector = createMotherDuckConnector()
 * await connector.connect({
 *   id: 'cloud',
 *   name: 'Cloud DB',
 *   type: 'motherduck',
 *   options: { token: 'md_xxx', database: 'my_db' }
 * })
 *
 * const result = await connector.query('SELECT * FROM users')
 * ```
 */

import type {
  Connector,
  ConnectorConfig,
  ConnectorCapabilities,
  ConnectionStatus,
  QueryResult,
  QueryOptions,
  TestResult,
  TableInfo,
  ColumnInfo
} from '../types'
import type { ConnectorError, QueryError } from '../errors'
import { connectorError, queryError } from '../errors'
import { type Result, ok, err, tryAsync } from '../result'
import type { MotherDuckConnectorOptions, MotherDuckConnectorDeps } from './types'

/**
 * MotherDuck API base URL
 */
const MOTHERDUCK_API_URL = 'https://api.motherduck.com/v1'

/**
 * Default logger
 */
const defaultLogger = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
}

/**
 * MotherDuck Connector Implementation
 *
 * Note: This is a reference implementation. The actual MotherDuck API
 * may differ - please refer to MotherDuck documentation for details.
 */
export class MotherDuckConnector implements Connector {
  readonly type = 'motherduck' as const

  readonly capabilities: ConnectorCapabilities = {
    supportsStreaming: false,
    supportsTransactions: true,
    supportsDDL: true,
    maxConcurrentQueries: 10,
    supportsPersistence: true
  }

  private _status: ConnectionStatus = 'disconnected'
  private _token: string | null = null
  private _database: string | null = null
  private _timeout: number = 30000

  private readonly deps: {
    logger: typeof defaultLogger
    fetch: typeof fetch
  }

  constructor(deps: MotherDuckConnectorDeps = {}) {
    this.deps = {
      logger: deps.logger || defaultLogger,
      fetch: deps.fetch || globalThis.fetch.bind(globalThis)
    }
  }

  get status(): ConnectionStatus {
    return this._status
  }

  /**
   * Connect to MotherDuck
   */
  async connect(config: ConnectorConfig): Promise<Result<void, ConnectorError>> {
    if (this._status === 'connected') {
      return err(connectorError('ALREADY_CONNECTED', 'Already connected to MotherDuck'))
    }

    this._status = 'connecting'
    const options = config.options as unknown as MotherDuckConnectorOptions

    if (!options?.token) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'MotherDuck token is required'))
    }

    this._token = options.token
    this._database = options.database || null
    this._timeout = options.timeout || 30000

    // Validate connection by running a test query
    const testResult = await this.testConnection()

    if (!testResult.ok) {
      this._status = 'error'
      this._token = null
      return err(testResult.error)
    }

    this._status = 'connected'
    this.deps.logger.info(`MotherDuck connected (database: ${this._database || 'default'})`)

    return ok(undefined)
  }

  /**
   * Disconnect from MotherDuck
   */
  async disconnect(): Promise<Result<void, ConnectorError>> {
    this._token = null
    this._database = null
    this._status = 'disconnected'
    this.deps.logger.info('MotherDuck disconnected')
    return ok(undefined)
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<Result<TestResult, ConnectorError>> {
    if (!this._token) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    const start = performance.now()

    return tryAsync(
      async () => {
        const response = await this.executeRequest('SELECT 1 as test')

        if (!response.ok) {
          throw new Error(`MotherDuck API error: ${response.status}`)
        }

        const latency = performance.now() - start

        return {
          latency,
          version: 'MotherDuck',
          info: {
            database: this._database || 'default'
          }
        }
      },
      error => connectorError(
        'CONNECTION_FAILED',
        `Connection test failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      )
    )
  }

  /**
   * Execute a SQL query
   */
  async query(sql: string, options?: QueryOptions): Promise<Result<QueryResult, QueryError>> {
    if (!this._token) {
      return err(queryError('QUERY_FAILED', 'Not connected', { sql }))
    }

    const startTime = performance.now()

    return tryAsync(
      async () => {
        const response = await this.executeRequest(sql)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Query failed: ${errorText}`)
        }

        const result = await response.json()

        // Parse MotherDuck response format
        const columns: ColumnInfo[] = (result.schema || []).map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable ?? true
        }))

        let data = result.data || []

        // Apply maxRows limit
        if (options?.maxRows && data.length > options.maxRows) {
          data = data.slice(0, options.maxRows)
        }

        const executionTime = performance.now() - startTime

        return {
          data,
          columns,
          rowCount: data.length,
          executionTime
        }
      },
      error => queryError(
        'QUERY_FAILED',
        error instanceof Error ? error.message : String(error),
        { sql, cause: error }
      )
    )
  }

  /**
   * Execute a SQL statement without returning results
   */
  async exec(sql: string): Promise<Result<void, QueryError>> {
    const result = await this.query(sql)

    if (!result.ok) {
      return err(result.error)
    }

    return ok(undefined)
  }

  /**
   * List all tables
   */
  async listTables(): Promise<Result<TableInfo[], ConnectorError>> {
    const result = await this.query('SHOW TABLES')

    if (!result.ok) {
      return err(connectorError('UNKNOWN', result.error.message, result.error))
    }

    const tables: TableInfo[] = result.value.data.map((row: any) => ({
      name: row.name || row.table_name,
      columns: []
    }))

    return ok(tables)
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<Result<ColumnInfo[], ConnectorError>> {
    const result = await this.query(`DESCRIBE ${tableName}`)

    if (!result.ok) {
      return err(connectorError('UNKNOWN', result.error.message, result.error))
    }

    const columns: ColumnInfo[] = result.value.data.map((row: any) => ({
      name: row.column_name,
      type: row.column_type,
      nullable: row.null === 'YES'
    }))

    return ok(columns)
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this._status === 'connected' && this._token !== null
  }

  // ==================== Private methods ====================

  /**
   * Execute a request to MotherDuck API
   */
  private async executeRequest(sql: string): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this._timeout)

    try {
      const url = this._database
        ? `${MOTHERDUCK_API_URL}/query?database=${encodeURIComponent(this._database)}`
        : `${MOTHERDUCK_API_URL}/query`

      return await this.deps.fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this._token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql }),
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Create a MotherDuck connector instance
 *
 * @param deps - Optional dependencies
 * @returns MotherDuckConnector instance
 */
export function createMotherDuckConnector(deps?: MotherDuckConnectorDeps): MotherDuckConnector {
  return new MotherDuckConnector(deps)
}
