/**
 * Connector Manager
 *
 * Manages active connector instances and coordinates with
 * the registry and secrets manager.
 *
 * @module core/connectors/manager
 *
 * @example
 * ```typescript
 * // Connect to a database
 * const result = await connectorManager.connect(connection)
 * if (result.ok) {
 *   const queryResult = await connectorManager.query('SELECT 1')
 * }
 *
 * // Switch active connection
 * connectorManager.setActive('conn-123')
 *
 * // Disconnect
 * await connectorManager.disconnect('conn-123')
 * ```
 */

import type {
  Connector,
  ConnectorConfig,
  ConnectorType,
  TestResult,
  QueryResult,
  QueryOptions
} from './types'
import type { ConnectorError, QueryError } from './errors'
import { connectorError } from './errors'
import { type Result, ok, err } from './result'
import { ConnectorRegistry } from './registry'
import { secretsManager, type ConnectionSecrets } from './secrets'

/**
 * Connection data from the UI layer
 * (Matches DatabaseConnection from types/connection.ts)
 */
export interface ConnectionData {
  id: string
  name: string
  scope: 'wasm' | 'http' | 'motherduck' | 'postgres' | 'mysql'
  host: string
  database: string
  /** For WASM: enable OPFS persistence */
  persist?: boolean
  /** Database port (PostgreSQL/MySQL) */
  port?: number
  /** SSL/TLS enabled */
  ssl?: boolean
}

/**
 * Map connection scope to connector type
 */
function scopeToConnectorType(scope: ConnectionData['scope']): ConnectorType {
  switch (scope) {
    case 'wasm':
      return 'wasm'
    case 'http':
      return 'http'
    case 'motherduck':
      return 'motherduck'
    case 'postgres':
      return 'postgres'
    case 'mysql':
      return 'mysql'
    default:
      return 'wasm'
  }
}

/**
 * Build ConnectorConfig from ConnectionData and secrets
 */
function buildConnectorConfig(
  connection: ConnectionData,
  secrets: ConnectionSecrets | null
): ConnectorConfig {
  const type = scopeToConnectorType(connection.scope)

  const options: Record<string, unknown> = {}

  switch (type) {
    case 'wasm':
      options.persist = connection.persist ?? false
      options.dbPath = connection.persist ? (connection.database || 'opfs://miao.db') : undefined
      break

    case 'http':
      options.baseUrl = connection.host.startsWith('http')
        ? connection.host
        : `http://${connection.host}`
      options.token = secrets?.token
      break

    case 'motherduck':
      options.token = secrets?.apiKey || secrets?.token
      options.database = connection.database
      break

    case 'postgres':
      options.host = connection.host
      options.port = connection.port || 5432
      options.database = connection.database
      options.username = secrets?.username
      options.password = secrets?.password
      options.ssl = connection.ssl ?? false
      options.proxyUrl = secrets?.proxyUrl
      break

    case 'mysql':
      options.host = connection.host
      options.port = connection.port || 3306
      options.database = connection.database
      options.username = secrets?.username
      options.password = secrets?.password
      options.ssl = connection.ssl ?? false
      options.proxyUrl = secrets?.proxyUrl
      break
  }

  return {
    id: connection.id,
    name: connection.name,
    type,
    options
  }
}

/**
 * Connector Manager
 *
 * Manages active connector instances and provides a unified interface
 * for database operations.
 */
class ConnectorManager {
  private connectors = new Map<string, Connector>()
  private activeId: string | null = null

  /**
   * Connect to a database
   *
   * @param connection - Connection configuration from UI
   * @param secrets - Optional secrets (if not in secretsManager)
   * @returns Connected connector or error
   */
  async connect(
    connection: ConnectionData,
    secrets?: ConnectionSecrets
  ): Promise<Result<Connector, ConnectorError>> {
    // Check if already connected
    const existing = this.connectors.get(connection.id)
    if (existing?.isConnected()) {
      return ok(existing)
    }

    // Get secrets from manager or parameter
    const connectionSecrets = secrets || secretsManager.get(connection.id)

    // Validate secrets for remote connections
    if (connection.scope === 'motherduck' && !connectionSecrets?.apiKey && !connectionSecrets?.token) {
      return err(connectorError('INVALID_CONFIG', 'MotherDuck API key is required'))
    }

    // Build config
    const config = buildConnectorConfig(connection, connectionSecrets)

    // Create and connect
    const result = await ConnectorRegistry.createAndConnect(config)

    if (!result.ok) {
      return result
    }

    // Store connector
    this.connectors.set(connection.id, result.value)

    // Store secrets if provided
    if (secrets) {
      secretsManager.set(connection.id, secrets)
    }

    return ok(result.value)
  }

  /**
   * Disconnect from a database
   *
   * @param connectionId - Connection identifier
   * @returns Success or error
   */
  async disconnect(connectionId: string): Promise<Result<void, ConnectorError>> {
    const connector = this.connectors.get(connectionId)

    if (!connector) {
      return ok(undefined) // Already disconnected
    }

    const result = await connector.disconnect()

    if (result.ok) {
      this.connectors.delete(connectionId)

      // Clear active if this was the active connection
      if (this.activeId === connectionId) {
        this.activeId = null
      }
    }

    return result
  }

  /**
   * Disconnect all connections
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connectors.keys()).map(id =>
      this.disconnect(id)
    )
    await Promise.all(promises)
    secretsManager.clearAll()
  }

  /**
   * Test a connection without storing it
   *
   * @param connection - Connection configuration
   * @param secrets - Secrets for authentication
   * @returns Test result or error
   */
  async testConnection(
    connection: ConnectionData,
    secrets: ConnectionSecrets
  ): Promise<Result<TestResult, ConnectorError>> {
    // Validate secrets for remote connections
    if (connection.scope === 'motherduck' && !secrets.apiKey && !secrets.token) {
      return err(connectorError('INVALID_CONFIG', 'MotherDuck API key is required'))
    }

    if (connection.scope === 'http' && !connection.host) {
      return err(connectorError('INVALID_CONFIG', 'Host URL is required'))
    }

    // Validate PostgreSQL/MySQL connections
    if (connection.scope === 'postgres' || connection.scope === 'mysql') {
      if (!connection.host) {
        return err(connectorError('INVALID_CONFIG', 'Host is required'))
      }
      if (!secrets.proxyUrl) {
        return err(connectorError('INVALID_CONFIG', 'HTTP Proxy URL is required for database connections'))
      }
    }

    // Build config
    const config = buildConnectorConfig(connection, secrets)
    const type = scopeToConnectorType(connection.scope)

    // Create connector
    const createResult = ConnectorRegistry.create(type)

    if (!createResult.ok) {
      return createResult
    }

    const connector = createResult.value

    // Connect
    const connectResult = await connector.connect(config)

    if (!connectResult.ok) {
      return err(connectResult.error)
    }

    // Test connection
    const testResult = await connector.testConnection()

    // Disconnect (cleanup)
    await connector.disconnect()

    return testResult
  }

  /**
   * Set the active connection
   *
   * @param connectionId - Connection identifier
   * @returns True if successful
   */
  setActive(connectionId: string): boolean {
    if (!this.connectors.has(connectionId)) {
      return false
    }
    this.activeId = connectionId
    return true
  }

  /**
   * Get the active connection ID
   */
  getActiveId(): string | null {
    return this.activeId
  }

  /**
   * Get a connector by ID
   *
   * @param connectionId - Connection identifier
   * @returns Connector or null
   */
  get(connectionId: string): Connector | null {
    return this.connectors.get(connectionId) || null
  }

  /**
   * Get the active connector
   *
   * @returns Active connector or null
   */
  getActive(): Connector | null {
    if (!this.activeId) return null
    return this.connectors.get(this.activeId) || null
  }

  /**
   * Check if a connection is active
   *
   * @param connectionId - Connection identifier
   * @returns True if connected
   */
  isConnected(connectionId: string): boolean {
    const connector = this.connectors.get(connectionId)
    return connector?.isConnected() ?? false
  }

  /**
   * Execute a query on the active connection
   *
   * @param sql - SQL query
   * @param options - Query options
   * @returns Query result or error
   */
  async query(sql: string, options?: QueryOptions): Promise<Result<QueryResult, QueryError>> {
    const connector = this.getActive()

    if (!connector) {
      return err({
        code: 'QUERY_FAILED',
        message: 'No active connection',
        sql
      })
    }

    return connector.query(sql, options)
  }

  /**
   * Get list of connected connection IDs
   */
  getConnectedIds(): string[] {
    return Array.from(this.connectors.keys())
  }
}

/**
 * Singleton connector manager instance
 */
export const connectorManager = new ConnectorManager()

/**
 * Create a new connector manager (for testing)
 */
export function createConnectorManager(): ConnectorManager {
  return new ConnectorManager()
}
