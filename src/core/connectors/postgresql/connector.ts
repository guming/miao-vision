/**
 * PostgreSQL Connector
 *
 * HTTP proxy-based connector for PostgreSQL databases.
 * Maintains local-first architecture by routing queries through an HTTP proxy.
 *
 * @module core/connectors/postgresql/connector
 *
 * @example
 * ```typescript
 * const connector = createPostgreSQLConnector()
 * await connector.connect({
 *   id: 'pg-production',
 *   name: 'Production DB',
 *   type: 'postgres',
 *   options: {
 *     proxyUrl: 'http://localhost:3001/api/postgres',
 *     host: 'db.example.com',
 *     port: 5432,
 *     database: 'myapp',
 *     username: 'user'
 *   },
 *   secrets: {
 *     password: 'secret'
 *   }
 * })
 *
 * const result = await connector.query('SELECT * FROM users LIMIT 10')
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
  PostgreSQLConnectorOptions,
  PostgreSQLConnectorDeps,
  PostgreSQLProxyRequest,
  PostgreSQLProxyResponse
} from './types'
import { pgTypeToString } from './types'

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
 * PostgreSQL Connector Implementation
 */
export class PostgreSQLConnector implements Connector {
  readonly type = 'postgres' as const

  readonly capabilities: ConnectorCapabilities = {
    supportsStreaming: false,
    supportsTransactions: true,
    supportsDDL: true,
    maxConcurrentQueries: 10,
    supportsPersistence: false
  }

  private _status: ConnectionStatus = 'disconnected'
  private _config: PostgreSQLConnectorOptions | null = null
  private _password: string | null = null
  private _schema: string = 'public'

  private readonly deps: {
    logger: typeof defaultLogger
    fetch: typeof fetch
  }

  constructor(deps: PostgreSQLConnectorDeps = {}) {
    this.deps = {
      logger: deps.logger || defaultLogger,
      fetch: deps.fetch || globalThis.fetch.bind(globalThis)
    }
  }

  get status(): ConnectionStatus {
    return this._status
  }

  /**
   * Connect to PostgreSQL via HTTP proxy
   */
  async connect(config: ConnectorConfig): Promise<Result<void, ConnectorError>> {
    if (this._status === 'connected') {
      return err(connectorError('ALREADY_CONNECTED', 'Already connected'))
    }

    this._status = 'connecting'
    const options = config.options as unknown as PostgreSQLConnectorOptions

    // Validate required options
    if (!options?.proxyUrl) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'Proxy URL is required'))
    }

    if (!options?.host) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'PostgreSQL host is required'))
    }

    if (!options?.database) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'Database name is required'))
    }

    if (!options?.username) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'Username is required'))
    }

    // Get password from secrets
    const password = config.secrets?.password || options.password
    if (!password) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'Password is required'))
    }

    this._config = {
      ...options,
      port: options.port || 5432,
      timeout: options.timeout || 30000,
      schema: options.schema || 'public'
    }
    this._password = password
    this._schema = this._config.schema || 'public'

    // Test connection
    const testResult = await this.testConnection()

    if (!testResult.ok) {
      this._status = 'error'
      this._config = null
      this._password = null
      return err(testResult.error)
    }

    this._status = 'connected'
    this.deps.logger.info(`PostgreSQL connector connected to ${options.host}:${this._config.port}/${options.database}`)

    return ok(undefined)
  }

  /**
   * Disconnect from PostgreSQL
   */
  async disconnect(): Promise<Result<void, ConnectorError>> {
    this._config = null
    this._password = null
    this._status = 'disconnected'
    this.deps.logger.info('PostgreSQL connector disconnected')
    return ok(undefined)
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<Result<TestResult, ConnectorError>> {
    if (!this._config || !this._password) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    const start = performance.now()

    return tryAsync(
      async () => {
        // Execute simple test query
        const result = await this.executeProxyQuery('SELECT version() as version')

        if (!result.ok) {
          throw new Error(result.error.message)
        }

        const latency = performance.now() - start
        const version = result.value.data?.[0]?.version as string || 'PostgreSQL'

        return {
          latency,
          version,
          info: {
            host: this._config!.host,
            port: this._config!.port,
            database: this._config!.database,
            schema: this._schema
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
    if (!this._config || !this._password) {
      return err(queryError('QUERY_FAILED', 'Not connected', { sql }))
    }

    const startTime = performance.now()

    return tryAsync(
      async () => {
        const result = await this.executeProxyQuery(sql, {
          timeout: options?.timeout,
          maxRows: options?.maxRows
        })

        if (!result.ok) {
          throw new Error(result.error.message)
        }

        const executionTime = performance.now() - startTime

        return {
          data: result.value.data || [],
          columns: result.value.columns,
          rowCount: result.value.data?.length || 0,
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
   * List all tables in the current schema
   */
  async listTables(): Promise<Result<TableInfo[], ConnectorError>> {
    const sql = `
      SELECT
        table_name,
        (SELECT count(*) FROM information_schema.columns c
         WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = '${this._schema}'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    const result = await this.query(sql)

    if (!result.ok) {
      return err(connectorError('UNKNOWN', result.error.message, result.error))
    }

    const tables: TableInfo[] = result.value.data.map((row: any) => ({
      name: row.table_name,
      schema: this._schema,
      columns: []
    }))

    return ok(tables)
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<Result<ColumnInfo[], ConnectorError>> {
    const sql = `
      SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = '${this._schema}'
        AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `

    const result = await this.query(sql)

    if (!result.ok) {
      return err(connectorError('UNKNOWN', result.error.message, result.error))
    }

    const columns: ColumnInfo[] = result.value.data.map((row: any) => ({
      name: row.column_name,
      type: this.pgTypeToDuckDBType(row.data_type, row.udt_name),
      nullable: row.is_nullable === 'YES'
    }))

    return ok(columns)
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this._status === 'connected' && this._config !== null
  }

  // ==================== Private methods ====================

  /**
   * Execute query via HTTP proxy
   */
  private async executeProxyQuery(
    sql: string,
    options?: { timeout?: number; maxRows?: number }
  ): Promise<Result<{ data: Record<string, unknown>[]; columns: ColumnInfo[] }, QueryError>> {
    if (!this._config || !this._password) {
      return err(queryError('QUERY_FAILED', 'Not connected', { sql }))
    }

    const proxyRequest: PostgreSQLProxyRequest = {
      sql,
      connection: {
        host: this._config.host,
        port: this._config.port || 5432,
        database: this._config.database,
        user: this._config.username,
        password: this._password,
        ssl: this._config.ssl,
        sslMode: this._config.sslMode
      },
      options: {
        timeout: options?.timeout || this._config.timeout,
        maxRows: options?.maxRows
      }
    }

    return tryAsync(
      async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(
          () => controller.abort(),
          options?.timeout || this._config!.timeout || 30000
        )

        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...this._config!.headers
          }

          const response = await this.deps.fetch(this._config!.proxyUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(proxyRequest),
            signal: controller.signal
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }

          const result: PostgreSQLProxyResponse = await response.json()

          if (!result.success || result.error) {
            const errorMsg = result.error || 'Query failed'
            const details = result.details
            throw new Error(
              details?.hint
                ? `${errorMsg} (${details.code}): ${details.hint}`
                : errorMsg
            )
          }

          // Map columns from PostgreSQL types
          const columns: ColumnInfo[] = (result.columns || []).map(col => ({
            name: col.name,
            type: col.dataType || pgTypeToString(col.dataTypeID),
            nullable: col.nullable ?? true
          }))

          return {
            data: result.data || [],
            columns
          }
        } finally {
          clearTimeout(timeoutId)
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
   * Map PostgreSQL type to DuckDB type
   */
  private pgTypeToDuckDBType(dataType: string, udtName: string): string {
    const type = dataType.toLowerCase()

    // Array types
    if (type === 'array') {
      return this.pgTypeToDuckDBType(udtName.replace(/^_/, ''), '') + '[]'
    }

    // Common mappings
    const typeMap: Record<string, string> = {
      'integer': 'INTEGER',
      'int': 'INTEGER',
      'int4': 'INTEGER',
      'smallint': 'SMALLINT',
      'int2': 'SMALLINT',
      'bigint': 'BIGINT',
      'int8': 'BIGINT',
      'real': 'REAL',
      'float4': 'REAL',
      'double precision': 'DOUBLE',
      'float8': 'DOUBLE',
      'numeric': 'DECIMAL',
      'decimal': 'DECIMAL',
      'boolean': 'BOOLEAN',
      'bool': 'BOOLEAN',
      'character varying': 'VARCHAR',
      'varchar': 'VARCHAR',
      'character': 'VARCHAR',
      'char': 'VARCHAR',
      'text': 'VARCHAR',
      'date': 'DATE',
      'time': 'TIME',
      'time without time zone': 'TIME',
      'time with time zone': 'TIMETZ',
      'timestamp': 'TIMESTAMP',
      'timestamp without time zone': 'TIMESTAMP',
      'timestamp with time zone': 'TIMESTAMPTZ',
      'uuid': 'UUID',
      'json': 'JSON',
      'jsonb': 'JSON',
      'bytea': 'BLOB',
      'inet': 'VARCHAR',
      'cidr': 'VARCHAR',
      'macaddr': 'VARCHAR'
    }

    return typeMap[type] || 'VARCHAR'
  }
}

/**
 * Create a PostgreSQL connector instance
 *
 * @param deps - Optional dependencies
 * @returns PostgreSQLConnector instance
 */
export function createPostgreSQLConnector(deps?: PostgreSQLConnectorDeps): PostgreSQLConnector {
  return new PostgreSQLConnector(deps)
}
