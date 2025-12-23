/**
 * REST API Connector
 *
 * Fetches data from REST APIs and loads into DuckDB tables.
 * Supports authentication, pagination, rate limiting, and custom headers.
 *
 * @module core/connectors/rest/connector
 *
 * @example
 * ```typescript
 * const connector = createRestApiConnector({ wasmConnector })
 * await connector.connect({
 *   id: 'api',
 *   name: 'REST API',
 *   type: 'rest',
 *   options: {
 *     baseUrl: 'https://api.example.com',
 *     authMethod: 'bearer',
 *     token: 'your-token'
 *   }
 * })
 *
 * // Load endpoint data into a table
 * await connector.loadEndpoint({
 *   path: '/users',
 *   tableName: 'users',
 *   params: { status: 'active' }
 * })
 *
 * // Query the data
 * await connector.query('SELECT * FROM users')
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
  RestApiConnectorOptions,
  RestApiConnectorDeps,
  RestApiEndpoint,
  RateLimitState,
  HttpMethod
} from './types'

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
 * REST API Connector Implementation
 */
export class RestApiConnector implements Connector {
  readonly type = 'rest' as const

  readonly capabilities: ConnectorCapabilities = {
    supportsStreaming: false,
    supportsTransactions: false,
    supportsDDL: false, // DDL handled by WASM connector
    maxConcurrentQueries: 10,
    supportsPersistence: true // Via WASM connector
  }

  private _status: ConnectionStatus = 'disconnected'
  private _options: RestApiConnectorOptions | null = null
  private _rateLimitState: RateLimitState | null = null
  private _loadedTables = new Set<string>()

  private readonly deps: {
    logger: typeof defaultLogger
    fetch: typeof fetch
    wasmConnector: any
  }

  constructor(deps: RestApiConnectorDeps = {}) {
    if (!deps.wasmConnector) {
      throw new Error('RestApiConnector requires a WASM connector instance')
    }

    this.deps = {
      logger: deps.logger || defaultLogger,
      fetch: deps.fetch || globalThis.fetch.bind(globalThis),
      wasmConnector: deps.wasmConnector
    }
  }

  get status(): ConnectionStatus {
    return this._status
  }

  /**
   * Connect to REST API
   */
  async connect(config: ConnectorConfig): Promise<Result<void, ConnectorError>> {
    if (this._status === 'connected') {
      return err(connectorError('ALREADY_CONNECTED', 'Already connected'))
    }

    this._status = 'connecting'
    const options = config.options as unknown as RestApiConnectorOptions

    if (!options?.baseUrl) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', 'Base URL is required'))
    }

    // Validate auth configuration
    const validationError = this.validateAuthConfig(options)
    if (validationError) {
      this._status = 'error'
      return err(connectorError('INVALID_CONFIG', validationError))
    }

    this._options = {
      ...options,
      baseUrl: options.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      timeout: options.timeout || 30000,
      apiKeyHeader: options.apiKeyHeader || 'X-API-Key'
    }

    // Initialize rate limiting if configured
    if (options.rateLimit) {
      this._rateLimitState = {
        requests: [],
        windowStart: Date.now()
      }
    }

    // Test connection
    const testResult = await this.testConnection()

    if (!testResult.ok) {
      this._status = 'error'
      this._options = null
      return err(testResult.error)
    }

    this._status = 'connected'
    this.deps.logger.info(`REST API connector connected to ${this._options.baseUrl}`)

    return ok(undefined)
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<Result<void, ConnectorError>> {
    this._options = null
    this._rateLimitState = null
    this._loadedTables.clear()
    this._status = 'disconnected'
    this.deps.logger.info('REST API connector disconnected')
    return ok(undefined)
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<Result<TestResult, ConnectorError>> {
    if (!this._options) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    const start = performance.now()

    return tryAsync(
      async () => {
        // Try a simple HEAD or GET request to the base URL
        const response = await this.executeRequest(this._options!.baseUrl, 'GET')

        if (!response.ok) {
          throw new Error(`Connection test failed: HTTP ${response.status}`)
        }

        const latency = performance.now() - start

        return {
          latency,
          version: 'REST API',
          info: {
            baseUrl: this._options!.baseUrl,
            authMethod: this._options!.authMethod || 'none'
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
   *
   * Delegates to the WASM connector
   */
  async query(sql: string, options?: QueryOptions): Promise<Result<QueryResult, QueryError>> {
    if (!this.isConnected()) {
      return err(queryError('QUERY_FAILED', 'Not connected', { sql }))
    }

    return this.deps.wasmConnector.query(sql, options)
  }

  /**
   * Execute a SQL statement
   */
  async exec(sql: string): Promise<Result<void, QueryError>> {
    if (!this.isConnected()) {
      return err(queryError('QUERY_FAILED', 'Not connected', { sql }))
    }

    return this.deps.wasmConnector.exec(sql)
  }

  /**
   * List all tables
   */
  async listTables(): Promise<Result<TableInfo[], ConnectorError>> {
    if (!this.isConnected()) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    return this.deps.wasmConnector.listTables()
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<Result<ColumnInfo[], ConnectorError>> {
    if (!this.isConnected()) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    return this.deps.wasmConnector.getTableSchema(tableName)
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this._status === 'connected' && this._options !== null
  }

  // ==================== REST API specific methods ====================

  /**
   * Load data from a REST API endpoint into a DuckDB table
   *
   * @param endpoint - Endpoint configuration
   * @returns Success or error
   */
  async loadEndpoint(endpoint: RestApiEndpoint): Promise<Result<TableInfo, ConnectorError>> {
    if (!this.isConnected()) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }

    const options = { ...this._options!, ...endpoint.options }

    return tryAsync(
      async () => {
        this.deps.logger.info(`Loading REST API endpoint: ${endpoint.path}`)

        // Fetch data (with pagination if configured)
        const data = await this.fetchAllData(endpoint, options)

        if (data.length === 0) {
          throw new Error('No data returned from API')
        }

        // Convert to JSON and create a virtual file
        const jsonString = JSON.stringify(data)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const file = new File([blob], `${endpoint.tableName}.json`, { type: 'application/json' })

        // Load the file into DuckDB using WASM connector
        const tableName = endpoint.tableName
        const loadResult = await this.deps.wasmConnector.loadFile(file, tableName)

        if (!loadResult.ok) {
          throw new Error(`Failed to load data into table: ${loadResult.error.message}`)
        }

        this._loadedTables.add(tableName)

        this.deps.logger.info(`Loaded ${data.length} rows into table '${tableName}'`)

        // Return table info from loadFile result
        return loadResult.value
      },
      error => connectorError(
        'UNKNOWN',
        `Failed to load endpoint: ${error instanceof Error ? error.message : String(error)}`,
        error
      )
    )
  }

  // ==================== Private methods ====================

  /**
   * Fetch all data (with pagination support)
   */
  private async fetchAllData(
    endpoint: RestApiEndpoint,
    options: RestApiConnectorOptions
  ): Promise<any[]> {
    const allData: any[] = []
    let page = 0
    let hasMore = true

    const pagination = options.pagination
    const maxPages = pagination?.maxPages || 10

    while (hasMore && page < maxPages) {
      // Build request URL with params
      const url = this.buildUrl(endpoint, page, options)

      // Execute request
      const response = await this.executeRequest(
        url,
        endpoint.method || 'GET',
        endpoint.body
      )

      if (!response.ok) {
        throw new Error(`API request failed: HTTP ${response.status}`)
      }

      const json = await response.json()

      // Extract data from response using dataPath
      const pageData = this.extractData(json, options.dataPath)

      if (!Array.isArray(pageData)) {
        throw new Error('API response must be an array or contain an array at dataPath')
      }

      allData.push(...pageData)

      // Check if there's more data
      if (pagination) {
        hasMore = this.hasMorePages(json, pageData, pagination)
      } else {
        hasMore = false
      }

      page++
    }

    return allData
  }

  /**
   * Build request URL with parameters
   */
  private buildUrl(
    endpoint: RestApiEndpoint,
    page: number,
    options: RestApiConnectorOptions
  ): string {
    const url = new URL(endpoint.path, options.baseUrl)

    // Add endpoint params
    if (endpoint.params) {
      Object.entries(endpoint.params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })
    }

    // Add pagination params
    if (options.pagination) {
      const { type, pageSize, offsetParam, limitParam, pageParam } = options.pagination

      switch (type) {
        case 'offset':
          url.searchParams.set(offsetParam || 'offset', String(page * pageSize))
          url.searchParams.set(limitParam || 'limit', String(pageSize))
          break

        case 'page':
          url.searchParams.set(pageParam || 'page', String(page + 1))
          url.searchParams.set(limitParam || 'limit', String(pageSize))
          break

        case 'cursor':
          // Cursor pagination handled separately
          break
      }
    }

    return url.toString()
  }

  /**
   * Extract data from response using dot notation path
   */
  private extractData(data: any, path?: string): any {
    if (!path) {
      return data
    }

    const keys = path.split('.')
    let result = data

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key]
      } else {
        throw new Error(`Path '${path}' not found in response`)
      }
    }

    return result
  }

  /**
   * Check if there are more pages to fetch
   */
  private hasMorePages(
    response: any,
    pageData: any[],
    pagination: NonNullable<RestApiConnectorOptions['pagination']>
  ): boolean {
    // No more data if page is empty or smaller than page size
    if (pageData.length === 0 || pageData.length < pagination.pageSize) {
      return false
    }

    // For cursor pagination, check if nextCursor exists
    if (pagination.type === 'cursor' && pagination.nextCursorPath) {
      const nextCursor = this.extractData(response, pagination.nextCursorPath)
      return nextCursor != null
    }

    // For offset/page pagination, assume more data if page is full
    return true
  }

  /**
   * Execute HTTP request with authentication and rate limiting
   */
  private async executeRequest(
    url: string,
    method: HttpMethod = 'GET',
    body?: object
  ): Promise<Response> {
    // Apply rate limiting
    if (this._rateLimitState && this._options?.rateLimit) {
      await this.applyRateLimit(this._options.rateLimit)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this._options!.timeout)

    try {
      const headers = this.buildHeaders()

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

  /**
   * Build request headers with authentication
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this._options!.headers
    }

    const { authMethod, token, apiKeyHeader, username, password } = this._options!

    switch (authMethod) {
      case 'bearer':
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        break

      case 'apiKey':
        if (token && apiKeyHeader) {
          headers[apiKeyHeader] = token
        }
        break

      case 'basic':
        if (username && password) {
          const encoded = btoa(`${username}:${password}`)
          headers['Authorization'] = `Basic ${encoded}`
        }
        break

      case 'none':
      default:
        // No authentication
        break
    }

    return headers
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(rateLimit: NonNullable<RestApiConnectorOptions['rateLimit']>): Promise<void> {
    const now = Date.now()
    const state = this._rateLimitState!

    // Remove old requests outside the window
    state.requests = state.requests.filter(
      timestamp => timestamp > now - rateLimit.windowMs
    )

    // Wait if we've hit the limit
    if (state.requests.length >= rateLimit.maxRequests) {
      const oldestRequest = state.requests[0]
      const waitTime = rateLimit.windowMs - (now - oldestRequest)

      if (waitTime > 0) {
        this.deps.logger.debug(`Rate limit reached, waiting ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    // Record this request
    state.requests.push(Date.now())
  }

  /**
   * Validate authentication configuration
   */
  private validateAuthConfig(options: RestApiConnectorOptions): string | null {
    const { authMethod, token, username, password } = options

    switch (authMethod) {
      case 'bearer':
        if (!token) {
          return 'Bearer token is required for Bearer authentication'
        }
        break

      case 'apiKey':
        if (!token) {
          return 'API key is required for API Key authentication'
        }
        break

      case 'basic':
        if (!username || !password) {
          return 'Username and password are required for Basic authentication'
        }
        break

      case 'none':
      case undefined:
        // No validation needed
        break

      default:
        return `Unsupported authentication method: ${authMethod}`
    }

    return null
  }
}

/**
 * Create a REST API connector instance
 *
 * @param deps - Dependencies
 * @returns RestApiConnector instance
 */
export function createRestApiConnector(deps: RestApiConnectorDeps): RestApiConnector {
  return new RestApiConnector(deps)
}
