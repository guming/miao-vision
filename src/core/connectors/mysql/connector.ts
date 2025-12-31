/**
 * MySQL Connector
 *
 * HTTP proxy-based connector for MySQL databases.
 * Maintains local-first architecture by routing queries through an HTTP proxy.
 *
 * @module core/connectors/mysql/connector
 *
 * @example
 * ```typescript
 * const connector = createMySQLConnector()
 * await connector.connect({
 *   id: 'mysql-production',
 *   name: 'Production DB',
 *   type: 'mysql',
 *   options: {
 *     proxyUrl: 'http://localhost:3001/api/mysql',
 *     host: 'db.example.com',
 *     port: 3306,
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
  MySQLConnectorOptions,
  MySQLConnectorDeps,
  MySQLProxyRequest,
  MySQLProxyResponse
} from './types'
import { mysqlTypeToString } from './types'

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
 * MySQL Connector Implementation
 */
export class MySQLConnector implements Connector {
  readonly type = 'mysql' as const

  readonly capabilities: ConnectorCapabilities = {
    supportsStreaming: false,
    supportsTransactions: true,
    supportsDDL: true,
    maxConcurrentQueries: 10,
    supportsPersistence: false
  }

  private _status: ConnectionStatus = 'disconnected'
  private _config: MySQLConnectorOptions | null = null
  private _password: string | null = null

  private readonly deps: {
    logger: typeof defaultLogger
    fetch: typeof fetch
  }

  constructor(deps: MySQLConnectorDeps = {}) {
    this.deps = {
      logger: deps.logger || defaultLogger,
      fetch: deps.fetch || globalThis.fetch.bind(globalThis)
    }
  }

  get status(): ConnectionStatus {
    return this._status
  }

  /**
   * Connect to MySQL via HTTP proxy
   */
  async connect(config: ConnectorConfig): Promise<Result<void, ConnectorError>> {
    if (this._status === 'connected') {
      return err(connectorError('ALREADY_CONNECTED', 'Already connected'))
    }

    this._status = 'connecting'
    const options = config.options as unknown as MySQLConnectorOptions

    // Validate required options
    if (!options?.proxyUrl) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'Proxy URL is required'))
    }

    if (!options?.host) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'MySQL host is required'))
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
      port: options.port || 3306,
      timeout: options.timeout || 30000,
      charset: options.charset || 'utf8mb4'
    }
    this._password = password

    // Test connection
    const testResult = await this.testConnection()

    if (!testResult.ok) {
      this._status = 'error'
      this._config = null
      this._password = null
      return err(testResult.error)
    }

    this._status = 'connected'
    this.deps.logger.info(`MySQL connector connected to ${options.host}:${this._config.port}/${options.database}`)

    return ok(undefined)
  }

  /**
   * Disconnect from MySQL
   */
  async disconnect(): Promise<Result<void, ConnectorError>> {
    this._config = null
    this._password = null
    this._status = 'disconnected'
    this.deps.logger.info('MySQL connector disconnected')
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
        const result = await this.executeProxyQuery('SELECT VERSION() as version')

        if (!result.ok) {
          throw new Error(result.error.message)
        }

        const latency = performance.now() - start
        const version = result.value.data?.[0]?.version as string || 'MySQL'

        return {
          latency,
          version,
          info: {
            host: this._config!.host,
            port: this._config!.port,
            database: this._config!.database
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
   * List all tables in the current database
   */
  async listTables(): Promise<Result<TableInfo[], ConnectorError>> {
    const sql = `
      SELECT
        TABLE_NAME as table_name,
        TABLE_ROWS as row_count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = '${this._config!.database}'
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `

    const result = await this.query(sql)

    if (!result.ok) {
      return err(connectorError('UNKNOWN', result.error.message, result.error))
    }

    const tables: TableInfo[] = result.value.data.map((row: any) => ({
      name: row.table_name,
      columns: [],
      rowCount: row.row_count
    }))

    return ok(tables)
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<Result<ColumnInfo[], ConnectorError>> {
    const sql = `
      SELECT
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type,
        COLUMN_TYPE as column_type,
        IS_NULLABLE as is_nullable,
        COLUMN_DEFAULT as column_default,
        COLUMN_KEY as column_key
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = '${this._config!.database}'
        AND TABLE_NAME = '${tableName}'
      ORDER BY ORDINAL_POSITION
    `

    const result = await this.query(sql)

    if (!result.ok) {
      return err(connectorError('UNKNOWN', result.error.message, result.error))
    }

    const columns: ColumnInfo[] = result.value.data.map((row: any) => ({
      name: row.column_name,
      type: this.mysqlTypeToDuckDBType(row.data_type, row.column_type),
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

    const proxyRequest: MySQLProxyRequest = {
      sql,
      connection: {
        host: this._config.host,
        port: this._config.port || 3306,
        database: this._config.database,
        user: this._config.username,
        password: this._password,
        ssl: this._config.ssl,
        charset: this._config.charset,
        timezone: this._config.timezone
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

          const result: MySQLProxyResponse = await response.json()

          if (!result.success || result.error) {
            const errorMsg = result.error || 'Query failed'
            const details = result.details
            throw new Error(
              details?.errno
                ? `${errorMsg} (${details.errno}/${details.sqlState})`
                : errorMsg
            )
          }

          // Map columns from MySQL types
          const columns: ColumnInfo[] = (result.columns || []).map(col => ({
            name: col.name,
            type: col.typeName || mysqlTypeToString(col.type),
            nullable: true
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
   * Map MySQL type to DuckDB type
   */
  private mysqlTypeToDuckDBType(dataType: string, columnType: string): string {
    const type = dataType.toLowerCase()

    // Check for unsigned types
    const isUnsigned = columnType.toLowerCase().includes('unsigned')

    // Common mappings
    const typeMap: Record<string, string> = {
      'tinyint': isUnsigned ? 'UTINYINT' : 'TINYINT',
      'smallint': isUnsigned ? 'USMALLINT' : 'SMALLINT',
      'mediumint': isUnsigned ? 'UINTEGER' : 'INTEGER',
      'int': isUnsigned ? 'UINTEGER' : 'INTEGER',
      'integer': isUnsigned ? 'UINTEGER' : 'INTEGER',
      'bigint': isUnsigned ? 'UBIGINT' : 'BIGINT',
      'float': 'REAL',
      'double': 'DOUBLE',
      'decimal': 'DECIMAL',
      'numeric': 'DECIMAL',
      'bit': 'BOOLEAN',
      'bool': 'BOOLEAN',
      'boolean': 'BOOLEAN',
      'char': 'VARCHAR',
      'varchar': 'VARCHAR',
      'tinytext': 'VARCHAR',
      'text': 'VARCHAR',
      'mediumtext': 'VARCHAR',
      'longtext': 'VARCHAR',
      'binary': 'BLOB',
      'varbinary': 'BLOB',
      'tinyblob': 'BLOB',
      'blob': 'BLOB',
      'mediumblob': 'BLOB',
      'longblob': 'BLOB',
      'date': 'DATE',
      'time': 'TIME',
      'datetime': 'TIMESTAMP',
      'timestamp': 'TIMESTAMP',
      'year': 'INTEGER',
      'enum': 'VARCHAR',
      'set': 'VARCHAR',
      'json': 'JSON'
    }

    return typeMap[type] || 'VARCHAR'
  }
}

/**
 * Create a MySQL connector instance
 *
 * @param deps - Optional dependencies
 * @returns MySQLConnector instance
 */
export function createMySQLConnector(deps?: MySQLConnectorDeps): MySQLConnector {
  return new MySQLConnector(deps)
}
