/**
 * Database Connection Types
 *
 * Type definitions for managing database connections.
 * Supports local WASM, remote DuckDB, and MotherDuck connections.
 */

/**
 * Connection scope/type
 */
export type ConnectionScope = 'wasm' | 'remote' | 'motherduck'

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
    value: 'remote',
    label: 'Remote',
    description: 'Remote DuckDB server via HTTP',
    icon: '🔗'
  },
  {
    value: 'motherduck',
    label: 'MotherDuck',
    description: 'MotherDuck cloud service',
    icon: '🦆'
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
    createdAt: new Date().toISOString()
  }
}
