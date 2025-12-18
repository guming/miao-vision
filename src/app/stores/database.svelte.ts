import { duckDBManager } from '@core/database'
import type { DatabaseState, DataSource, QueryResult } from '@/types/database'
import { connectionStore } from './connection.svelte'

// Database state using Svelte 5 runes
export function createDatabaseStore() {
  let state = $state<DatabaseState>({
    initialized: false,
    loading: false,
    error: null,
    dataSources: []
  })

  // Track current connection ID
  let currentConnectionId = $state<string>('wasm-local')

  async function initialize() {
    state.loading = true
    state.error = null

    try {
      await duckDBManager.initialize()
      state.initialized = true
      // Update connection status
      connectionStore.updateConnectionStatus('wasm-local', 'connected')
      console.log('Database store initialized')
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to initialize database'
      connectionStore.updateConnectionStatus('wasm-local', 'error', state.error)
      console.error('Database initialization error:', error)
    } finally {
      state.loading = false
    }
  }

  /**
   * Switch to a different database connection
   */
  async function switchConnection(connectionId: string): Promise<boolean> {
    const connection = connectionStore.getConnection(connectionId)
    if (!connection) {
      state.error = 'Connection not found'
      return false
    }

    // For now, only WASM connections are fully supported
    if (connection.scope === 'wasm') {
      // WASM is always the same instance
      currentConnectionId = connectionId
      connectionStore.updateConnectionStatus(connectionId, 'connected')
      await connectionStore.setActiveConnection(connectionId)
      return true
    }

    if (connection.scope === 'remote') {
      // TODO: Implement remote DuckDB connection
      state.error = 'Remote connections are not yet implemented'
      connectionStore.updateConnectionStatus(connectionId, 'error', 'Remote connections coming soon')
      return false
    }

    if (connection.scope === 'motherduck') {
      // TODO: Implement MotherDuck connection
      state.error = 'MotherDuck connections are not yet implemented'
      connectionStore.updateConnectionStatus(connectionId, 'error', 'MotherDuck connections coming soon')
      return false
    }

    return false
  }

  /**
   * Get the current connection ID
   */
  function getCurrentConnectionId(): string {
    return currentConnectionId
  }

  async function loadFile(file: File, tableName?: string) {
    if (!state.initialized) {
      throw new Error('Database not initialized')
    }

    state.loading = true
    state.error = null

    const extension = file.name.split('.').pop()?.toLowerCase()
    const type = extension === 'parquet' ? 'parquet' : extension === 'csv' ? 'csv' : 'json'
    const table = tableName || `table_${Date.now()}`

    try {
      if (type === 'csv') {
        await duckDBManager.loadCSV(file, table)
      } else if (type === 'parquet') {
        await duckDBManager.loadParquet(file, table)
      } else {
        throw new Error('Unsupported file type')
      }

      const dataSource: DataSource = {
        name: file.name,
        type,
        file,
        tableName: table,
        loaded: true
      }

      state.dataSources = [...state.dataSources, dataSource]
      console.log(`File loaded: ${file.name} as ${table}`)
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to load file'
      console.error('File loading error:', error)
      throw error
    } finally {
      state.loading = false
    }
  }

  async function executeQuery(sql: string): Promise<QueryResult> {
    if (!state.initialized) {
      throw new Error('Database not initialized')
    }

    state.loading = true
    state.error = null

    try {
      const result = await duckDBManager.query(sql)
      return result
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Query execution failed'
      console.error('Query error:', error)
      throw error
    } finally {
      state.loading = false
    }
  }

  async function listTables(): Promise<string[]> {
    if (!state.initialized) {
      return []
    }

    try {
      return await duckDBManager.listTables()
    } catch (error) {
      console.error('Failed to list tables:', error)
      return []
    }
  }

  async function getTableSchema(tableName: string) {
    if (!state.initialized) {
      throw new Error('Database not initialized')
    }

    try {
      return await duckDBManager.getTableSchema(tableName)
    } catch (error) {
      console.error('Failed to get table schema:', error)
      throw error
    }
  }

  function removeDataSource(tableName: string) {
    state.dataSources = state.dataSources.filter(ds => ds.tableName !== tableName)
  }

  return {
    get state() {
      return state
    },
    get currentConnectionId() {
      return currentConnectionId
    },
    initialize,
    loadFile,
    executeQuery,
    listTables,
    getTableSchema,
    removeDataSource,
    switchConnection,
    getCurrentConnectionId
  }
}

// Export singleton store
export const databaseStore = createDatabaseStore()
