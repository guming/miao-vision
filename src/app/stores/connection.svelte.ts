/**
 * Connection Store
 *
 * Manages database connections including local WASM,
 * remote DuckDB servers, and MotherDuck cloud.
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
   */
  async function connect(id: string): Promise<boolean> {
    const connection = state.connections.find(c => c.id === id)
    if (!connection) {
      state.error = 'Connection not found'
      return false
    }

    state.loading = true
    state.error = null
    updateConnectionStatus(id, 'connecting')

    try {
      // For now, only WASM connections are fully supported
      if (connection.scope === 'wasm') {
        // WASM connection is handled by databaseStore
        updateConnectionStatus(id, 'connected')
        await setActiveConnection(id)
        return true
      }

      if (connection.scope === 'remote') {
        // TODO: Implement remote DuckDB connection
        // This would typically involve:
        // 1. Establishing HTTP connection to DuckDB server
        // 2. Testing connection with a simple query
        // 3. Storing connection handle
        state.error = 'Remote connections are not yet implemented'
        updateConnectionStatus(id, 'error', 'Remote connections coming soon')
        return false
      }

      if (connection.scope === 'motherduck') {
        // TODO: Implement MotherDuck connection
        // This would involve:
        // 1. Authenticating with MotherDuck API
        // 2. Establishing connection
        state.error = 'MotherDuck connections are not yet implemented'
        updateConnectionStatus(id, 'error', 'MotherDuck connections coming soon')
        return false
      }

      return false
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

    updateConnectionStatus(id, 'disconnected')

    // If disconnecting active connection, it remains active but disconnected
    // User needs to reconnect or switch to another connection

    return true
  }

  /**
   * Test a connection without activating it
   */
  async function testConnection(data: ConnectionFormData): Promise<{ success: boolean; message: string }> {
    if (data.scope === 'wasm') {
      return { success: true, message: 'WASM connection is always available' }
    }

    if (data.scope === 'remote') {
      // TODO: Implement remote connection test
      return { success: false, message: 'Remote connection test not implemented' }
    }

    if (data.scope === 'motherduck') {
      // TODO: Implement MotherDuck connection test
      return { success: false, message: 'MotherDuck connection test not implemented' }
    }

    return { success: false, message: 'Unknown connection type' }
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
    clearError
  }
}

// Export singleton store
export const connectionStore = createConnectionStore()
