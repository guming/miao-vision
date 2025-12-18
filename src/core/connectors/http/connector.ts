/**
 * HTTP Connector
 *
 * Generic HTTP-based connector for remote DuckDB instances.
 * Works with any DuckDB server that exposes an HTTP API.
 *
 * @module core/connectors/http/connector
 *
 * @example
 * ```typescript
 * const connector = createHttpConnector()
 * await connector.connect({
 *   id: 'remote',
 *   name: 'Remote DB',
 *   type: 'http',
 *   options: {
 *     baseUrl: 'http://localhost:8080',
 *     token: 'secret'
 *   }
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
import type {
  HttpConnectorOptions,
  HttpConnectorDeps,
  HttpQueryResponse
} from './types'

/**
 * Default API paths
 */
const DEFAULT_PATHS = {
  query: '/query',
  health: '/health',
  tables: '/tables'
}

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
 * HTTP Connector Implementation
 */
export class HttpConnector implements Connector {
  readonly type = 'http' as const

  readonly capabilities: ConnectorCapabilities = {
    supportsStreaming: false,
    supportsTransactions: false,
    supportsDDL: true,
    maxConcurrentQueries: 10,
    supportsPersistence: true
  }

  private _status: ConnectionStatus = 'disconnected'
  private _baseUrl: string | null = null
  private _token: string | null = null
  private _timeout: number = 30000
  private _headers: Record<string, string> = {}
  private _paths = DEFAULT_PATHS

  private readonly deps: {
    logger: typeof defaultLogger
    fetch: typeof fetch
  }

  constructor(deps: HttpConnectorDeps = {}) {
    this.deps = {
      logger: deps.logger || defaultLogger,
      fetch: deps.fetch || globalThis.fetch.bind(globalThis)
    }
  }

  get status(): ConnectionStatus {
    return this._status
  }

  /**
   * Connect to HTTP server
   */
  async connect(config: ConnectorConfig): Promise<Result<void, ConnectorError>> {
    if (this._status === 'connected') {
      return err(connectorError('ALREADY_CONNECTED', 'Already connected'))
    }

    this._status = 'connecting'
    const options = config.options as unknown as HttpConnectorOptions

    if (!options?.baseUrl) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'Base URL is required'))
    }

    // Normalize URL (remove trailing slash)
    this._baseUrl = options.baseUrl.replace(/\/$/, '')
    this._token = options.token || null
    this._timeout = options.timeout || 30000
    this._headers = options.headers || {}
    this._paths = { ...DEFAULT_PATHS, ...options.paths }

    // Test connection
    const testResult = await this.testConnection()

    if (!testResult.ok) {
      this._status = 'error'
      this._baseUrl = null
      return err(testResult.error)
    }

    this._status = 'connected'
    this.deps.logger.info(`HTTP connector connected to ${this._baseUrl}`)

    return ok(undefined)
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<Result<void, ConnectorError>> {
    this._baseUrl = null
    this._token = null
    this._status = 'disconnected'
    this.deps.logger.info('HTTP connector disconnected')
    return ok(undefined)
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<Result<TestResult, ConnectorError>> {
    if (!this._baseUrl) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    const start = performance.now()

    return tryAsync(
      async () => {
        // Try health endpoint first
        const healthUrl = `${this._baseUrl}${this._paths.health}`
        const response = await this.executeRequest(healthUrl, 'GET')

        if (!response.ok) {
          // Fall back to simple query
          const queryResponse = await this.executeQuery('SELECT 1 as test')
          if (!queryResponse.ok) {
            throw new Error('Server health check failed')
          }
        }

        const latency = performance.now() - start

        return {
          latency,
          version: 'DuckDB HTTP Server',
          info: {
            baseUrl: this._baseUrl
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
    if (!this._baseUrl) {
      return err(queryError('QUERY_FAILED', 'Not connected', { sql }))
    }

    const startTime = performance.now()

    return tryAsync(
      async () => {
        const result = await this.executeQuery(sql)

        if (!result.ok) {
          throw new Error(result.error.message)
        }

        let data = result.value.data

        // Apply maxRows limit
        if (options?.maxRows && data.length > options.maxRows) {
          data = data.slice(0, options.maxRows)
        }

        const executionTime = performance.now() - startTime

        return {
          data,
          columns: result.value.columns,
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
    return this._status === 'connected' && this._baseUrl !== null
  }

  // ==================== Private methods ====================

  /**
   * Execute query via HTTP
   */
  private async executeQuery(sql: string): Promise<Result<QueryResult, QueryError>> {
    const url = `${this._baseUrl}${this._paths.query}`

    return tryAsync(
      async () => {
        const response = await this.executeRequest(url, 'POST', { sql })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const result: HttpQueryResponse = await response.json()

        if (result.error) {
          throw new Error(result.error)
        }

        const columns: ColumnInfo[] = (result.schema || []).map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable ?? true
        }))

        return {
          data: result.data || [],
          columns,
          rowCount: result.rowCount ?? result.data?.length ?? 0,
          executionTime: result.executionTime ?? 0
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
   * Execute HTTP request
   */
  private async executeRequest(
    url: string,
    method: 'GET' | 'POST' = 'GET',
    body?: object
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this._timeout)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this._headers
      }

      if (this._token) {
        headers['Authorization'] = `Bearer ${this._token}`
      }

      return await this.deps.fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Create an HTTP connector instance
 *
 * @param deps - Optional dependencies
 * @returns HttpConnector instance
 */
export function createHttpConnector(deps?: HttpConnectorDeps): HttpConnector {
  return new HttpConnector(deps)
}
