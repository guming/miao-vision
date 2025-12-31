/**
 * Database Connection Types
 *
 * Type definitions for managing database connections.
 * Supports local WASM, remote DuckDB, and MotherDuck connections.
 */

/**
 * Connection scope/type
 * Maps to ConnectorType in core/connectors/types.ts
 */
export type ConnectionScope = 'wasm' | 'http' | 'motherduck' | 'postgres' | 'mysql'

/**
 * Connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

/**
 * Environment label for connections
 */
export type ConnectionEnvironment = 'APP' | 'DEV' | 'STAGING' | 'PROD'

/**
 * Database connection configuration
 */
export interface DatabaseConnection {
  /** Unique identifier */
  id: string
  /** Display name for the connection */
  name: string
  /** Connection type/scope */
  scope: ConnectionScope
  /** Host address ('local' for WASM, 'hostname:port' for remote) */
  host: string
  /** Database name or path ('memory', file path, or remote db name) */
  database: string
  /** Environment label */
  environment: ConnectionEnvironment
  /** Current connection status */
  status: ConnectionStatus
  /** Whether this is the default/active connection */
  isActive: boolean
  /** Error message if status is 'error' */
  errorMessage?: string
  /** Creation timestamp */
  createdAt: string
  /** Last connection attempt timestamp */
  lastConnectedAt?: string
  /** Database port (PostgreSQL/MySQL) */
  port?: number
  /** SSL/TLS enabled */
  ssl?: boolean
}

/**
 * Form data for creating/editing a connection
 */
export interface ConnectionFormData {
  name: string
  scope: ConnectionScope
  host: string
  database: string
  environment: ConnectionEnvironment
  /** For remote connections: authentication token */
  token?: string
  /** For MotherDuck: API key */
  apiKey?: string
  /** For PostgreSQL/MySQL: port number */
  port?: number
  /** For PostgreSQL/MySQL: username */
  username?: string
  /** For PostgreSQL/MySQL: password */
  password?: string
  /** For PostgreSQL/MySQL: HTTP proxy URL */
  proxyUrl?: string
  /** For PostgreSQL/MySQL: SSL mode */
  ssl?: boolean
}

/**
 * Connection store state
 */
export interface ConnectionState {
  /** All configured connections */
  connections: DatabaseConnection[]
  /** Currently active connection ID */
  activeConnectionId: string | null
  /** Whether connections are being loaded */
  loading: boolean
  /** Global error message */
  error: string | null
}

/**
 * Default WASM connection (always available)
 */
export const DEFAULT_WASM_CONNECTION: DatabaseConnection = {
  id: 'wasm-local',
  name: 'Local (WASM)',
  scope: 'wasm',
  host: 'local',
  database: 'memory',
  environment: 'APP',
  status: 'disconnected',
  isActive: true,
  createdAt: new Date().toISOString()
}

/**
 * Scope display configuration
 */
export const CONNECTION_SCOPES: Array<{
  value: ConnectionScope
  label: string
  description: string
  icon: string
}> = [
  {
    value: 'wasm',
    label: 'WASM',
    description: 'In-browser DuckDB (local memory)',
    icon: '🌐'
  },
  {
    value: 'http',
    label: 'Remote HTTP',
    description: 'Remote DuckDB server via HTTP API',
    icon: '🔗'
  },
  {
    value: 'motherduck',
    label: 'MotherDuck',
    description: 'MotherDuck cloud service',
    icon: '🦆'
  },
  {
    value: 'postgres',
    label: 'PostgreSQL',
    description: 'PostgreSQL database via HTTP proxy',
    icon: '🐘'
  },
  {
    value: 'mysql',
    label: 'MySQL',
    description: 'MySQL database via HTTP proxy',
    icon: '🐬'
  }
]

/**
 * Environment display configuration
 */
export const CONNECTION_ENVIRONMENTS: Array<{
  value: ConnectionEnvironment
  label: string
  color: string
}> = [
  { value: 'APP', label: 'App', color: '#22C55E' },
  { value: 'DEV', label: 'Development', color: '#3B82F6' },
  { value: 'STAGING', label: 'Staging', color: '#F59E0B' },
  { value: 'PROD', label: 'Production', color: '#EF4444' }
]

/**
 * Generate a unique connection ID
 */
export function generateConnectionId(): string {
  return `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a new connection with defaults
 */
export function createConnection(data: ConnectionFormData): DatabaseConnection {
  return {
    id: generateConnectionId(),
    name: data.name,
    scope: data.scope,
    host: data.host,
    database: data.database,
    environment: data.environment,
    status: 'disconnected',
    isActive: false,
    createdAt: new Date().toISOString(),
    port: data.port,
    ssl: data.ssl
  }
}
