/**
 * Connection Store
 *
 * Manages database connections including local WASM,
 * remote DuckDB servers, and MotherDuck cloud.
 *
 * Uses ConnectorManager from core/connectors for actual connections.
 */

import type {
  DatabaseConnection,
  ConnectionState,
  ConnectionFormData,
  ConnectionStatus
} from '@/types/connection'
import {
  DEFAULT_WASM_CONNECTION,
  createConnection
} from '@/types/connection'
import {
  connectorManager,
  secretsManager,
  type ConnectionSecrets
} from '@core/connectors'

const STORAGE_KEY = 'miao-vision-connections'

/**
 * Load connections from localStorage
 */
function loadFromStorage(): DatabaseConnection[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Ensure default WASM connection exists
      const hasWasm = parsed.some((c: DatabaseConnection) => c.id === 'wasm-local')
      if (!hasWasm) {
        return [DEFAULT_WASM_CONNECTION, ...parsed]
      }
      return parsed
    }
  } catch (e) {
    console.error('Failed to load connections from storage:', e)
  }
  return [DEFAULT_WASM_CONNECTION]
}

/**
 * Save connections to localStorage
 */
function saveToStorage(connections: DatabaseConnection[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections))
  } catch (e) {
    console.error('Failed to save connections to storage:', e)
  }
}

/**
 * Create the connection store
 */
export function createConnectionStore() {
  // Initialize with stored connections
  const initialConnections = loadFromStorage()

  let state = $state<ConnectionState>({
    connections: initialConnections,
    activeConnectionId: initialConnections.find(c => c.isActive)?.id || 'wasm-local',
    loading: false,
    error: null
  })

  /**
   * Get the currently active connection
   */
  function getActiveConnection(): DatabaseConnection | null {
    return state.connections.find(c => c.id === state.activeConnectionId) || null
  }

  /**
   * Add a new connection
   */
  function addConnection(data: ConnectionFormData): DatabaseConnection {
    const connection = createConnection(data)
    state.connections = [...state.connections, connection]
    saveToStorage(state.connections)
    return connection
  }

  /**
   * Update an existing connection
   */
  function updateConnection(id: string, data: Partial<ConnectionFormData>): boolean {
    const index = state.connections.findIndex(c => c.id === id)
    if (index === -1) return false

    const updated = {
      ...state.connections[index],
      ...data
    }
    state.connections = [
      ...state.connections.slice(0, index),
      updated,
      ...state.connections.slice(index + 1)
    ]
    saveToStorage(state.connections)
    return true
  }

  /**
   * Delete a connection
   */
  function deleteConnection(id: string): boolean {
    // Cannot delete the default WASM connection
    if (id === 'wasm-local') {
      state.error = 'Cannot delete the default WASM connection'
      return false
    }

    const index = state.connections.findIndex(c => c.id === id)
    if (index === -1) return false

    // If deleting active connection, switch to WASM
    if (state.activeConnectionId === id) {
      state.activeConnectionId = 'wasm-local'
      updateConnectionStatus('wasm-local', 'connected')
    }

    state.connections = state.connections.filter(c => c.id !== id)
    saveToStorage(state.connections)
    return true
  }

  /**
   * Update connection status
   */
  function updateConnectionStatus(
    id: string,
    status: ConnectionStatus,
    errorMessage?: string
  ) {
    const index = state.connections.findIndex(c => c.id === id)
    if (index === -1) return

    const updated: DatabaseConnection = {
      ...state.connections[index],
      status,
      errorMessage: status === 'error' ? errorMessage : undefined,
      lastConnectedAt: status === 'connected' ? new Date().toISOString() : state.connections[index].lastConnectedAt
    }

    state.connections = [
      ...state.connections.slice(0, index),
      updated,
      ...state.connections.slice(index + 1)
    ]
    saveToStorage(state.connections)
  }

  /**
   * Set the active connection
   */
  async function setActiveConnection(id: string): Promise<boolean> {
    const connection = state.connections.find(c => c.id === id)
    if (!connection) {
      state.error = 'Connection not found'
      return false
    }

    // Mark previous connection as inactive
    if (state.activeConnectionId) {
      const prevIndex = state.connections.findIndex(c => c.id === state.activeConnectionId)
      if (prevIndex !== -1) {
        state.connections[prevIndex] = {
          ...state.connections[prevIndex],
          isActive: false,
          status: 'disconnected'
        }
      }
    }

    // Mark new connection as active
    const newIndex = state.connections.findIndex(c => c.id === id)
    state.connections[newIndex] = {
      ...state.connections[newIndex],
      isActive: true
    }

    state.activeConnectionId = id
    saveToStorage(state.connections)

    return true
  }

  /**
   * Connect to a database
   *
   * @param id - Connection ID
   * @param secrets - Optional secrets for authentication
   */
  async function connect(id: string, secrets?: ConnectionSecrets): Promise<boolean> {
    const connection = state.connections.find(c => c.id === id)
    if (!connection) {
      state.error = 'Connection not found'
      return false
    }

    state.loading = true
    state.error = null
    updateConnectionStatus(id, 'connecting')

    try {
      // Use ConnectorManager for all connection types
      const result = await connectorManager.connect(
        {
          id: connection.id,
          name: connection.name,
          scope: connection.scope,
          host: connection.host,
          database: connection.database
        },
        secrets
      )

      if (!result.ok) {
        state.error = result.error.message
        updateConnectionStatus(id, 'error', result.error.message)
        return false
      }

      updateConnectionStatus(id, 'connected')
      await setActiveConnection(id)

      // Set as active in ConnectorManager too
      connectorManager.setActive(id)

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed'
      state.error = message
      updateConnectionStatus(id, 'error', message)
      return false
    } finally {
      state.loading = false
    }
  }

  /**
   * Disconnect from a database
   */
  async function disconnect(id: string): Promise<boolean> {
    const connection = state.connections.find(c => c.id === id)
    if (!connection) return false

    try {
      // Use ConnectorManager to disconnect
      await connectorManager.disconnect(id)
      updateConnectionStatus(id, 'disconnected')

      // If disconnecting active connection, it remains active but disconnected
      // User needs to reconnect or switch to another connection

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Disconnect failed'
      state.error = message
      return false
    }
  }

  /**
   * Test a connection without activating it
   *
   * @param data - Connection form data
   * @param secrets - Secrets for authentication
   */
  async function testConnection(
    data: ConnectionFormData,
    secrets?: ConnectionSecrets
  ): Promise<{ success: boolean; message: string; latency?: number }> {
    // WASM is always available
    if (data.scope === 'wasm') {
      return { success: true, message: 'WASM connection is always available' }
    }

    // Build connection data for testing
    const connectionData = {
      id: `test-${Date.now()}`,
      name: data.name,
      scope: data.scope,
      host: data.host,
      database: data.database
    }

    // Build secrets from form data
    const testSecrets: ConnectionSecrets = {
      token: secrets?.token || data.token,
      apiKey: secrets?.apiKey || data.apiKey
    }

    try {
      const result = await connectorManager.testConnection(connectionData, testSecrets)

      if (!result.ok) {
        return { success: false, message: result.error.message }
      }

      return {
        success: true,
        message: `Connected successfully (${result.value.latency.toFixed(0)}ms)`,
        latency: result.value.latency
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      }
    }
  }

  /**
   * Get connection by ID
   */
  function getConnection(id: string): DatabaseConnection | undefined {
    return state.connections.find(c => c.id === id)
  }

  /**
   * Clear any error
   */
  function clearError() {
    state.error = null
  }

  /**
   * Save secrets for a connection
   *
   * @param connectionId - Connection ID
   * @param secrets - Secrets to save
   */
  function saveSecrets(connectionId: string, secrets: ConnectionSecrets) {
    secretsManager.set(connectionId, secrets)
  }

  /**
   * Get saved secrets for a connection
   *
   * @param connectionId - Connection ID
   */
  function getSecrets(connectionId: string): ConnectionSecrets | null {
    return secretsManager.get(connectionId)
  }

  /**
   * Check if secrets are required for a connection
   *
   * @param connection - Connection to check
   */
  function needsSecrets(connection: DatabaseConnection): boolean {
    if (connection.scope === 'wasm') return false
    return !secretsManager.has(connection.id)
  }

  /**
   * Get the active connector instance
   */
  function getActiveConnector() {
    return connectorManager.getActive()
  }

  return {
    get state() {
      return state
    },
    getActiveConnection,
    getConnection,
    addConnection,
    updateConnection,
    deleteConnection,
    setActiveConnection,
    connect,
    disconnect,
    testConnection,
    updateConnectionStatus,
    clearError,
    saveSecrets,
    getSecrets,
    needsSecrets,
    getActiveConnector
  }
}

// Export singleton store
export const connectionStore = createConnectionStore()
