/**
 * Connector Manager - Unit Tests
 *
 * Tests for ConnectorManager that coordinates connectors, secrets, and registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createConnectorManager, type ConnectionData } from './manager'
import { ConnectorRegistry } from './registry'
import { secretsManager } from './secrets'
import { ok, err } from './result'
import { connectorError } from './errors'
import type { Connector, ConnectorConfig, ConnectorCapabilities, ConnectionStatus, QueryResult, TestResult, TableInfo, ColumnInfo } from './types'
import type { ConnectorError, QueryError } from './errors'
import type { Result } from './result'

// Mock secretsManager
vi.mock('./secrets', () => ({
  secretsManager: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    remove: vi.fn(),
    clearAll: vi.fn()
  }
}))

// Mock connector for testing
class MockConnector implements Connector {
  readonly type = 'wasm' as const
  readonly capabilities: ConnectorCapabilities = {
    supportsStreaming: false,
    supportsTransactions: false,
    supportsDDL: true,
    maxConcurrentQueries: 1,
    supportsPersistence: false
  }

  private _status: ConnectionStatus = 'disconnected'
  private _connected = false
  public connectCalled = false
  public disconnectCalled = false
  public testCalled = false

  get status(): ConnectionStatus {
    return this._status
  }

  async connect(_config: ConnectorConfig): Promise<Result<void, ConnectorError>> {
    this.connectCalled = true
    this._status = 'connected'
    this._connected = true
    return ok(undefined)
  }

  async disconnect(): Promise<Result<void, ConnectorError>> {
    this.disconnectCalled = true
    this._status = 'disconnected'
    this._connected = false
    return ok(undefined)
  }

  async testConnection(): Promise<Result<TestResult, ConnectorError>> {
    this.testCalled = true
    if (!this._connected) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }
    return ok({ latency: 50, version: 'mock-1.0' })
  }

  async query(_sql: string): Promise<Result<QueryResult, QueryError>> {
    return ok({
      data: [{ result: 1 }],
      columns: [{ name: 'result', type: 'integer', nullable: false }],
      rowCount: 1,
      executionTime: 1
    })
  }

  async exec(_sql: string): Promise<Result<void, QueryError>> {
    return ok(undefined)
  }

  async listTables(): Promise<Result<TableInfo[], ConnectorError>> {
    return ok([])
  }

  async getTableSchema(_tableName: string): Promise<Result<ColumnInfo[], ConnectorError>> {
    return ok([])
  }

  isConnected(): boolean {
    return this._connected
  }
}

// Failing mock connector
class FailingConnector implements Connector {
  readonly type = 'http' as const
  readonly capabilities: ConnectorCapabilities = {
    supportsStreaming: false,
    supportsTransactions: false,
    supportsDDL: false,
    maxConcurrentQueries: 1,
    supportsPersistence: false
  }

  private _status: ConnectionStatus = 'disconnected'

  get status(): ConnectionStatus {
    return this._status
  }

  async connect(_config: ConnectorConfig): Promise<Result<void, ConnectorError>> {
    this._status = 'error'
    return err(connectorError('CONNECTION_FAILED', 'Connection failed'))
  }

  async disconnect(): Promise<Result<void, ConnectorError>> {
    return ok(undefined)
  }

  async testConnection(): Promise<Result<TestResult, ConnectorError>> {
    return err(connectorError('CONNECTION_FAILED', 'Test failed'))
  }

  async query(sql: string): Promise<Result<QueryResult, QueryError>> {
    return err({ code: 'QUERY_FAILED', message: 'Not connected', sql })
  }

  async exec(_sql: string): Promise<Result<void, QueryError>> {
    return ok(undefined)
  }

  async listTables(): Promise<Result<TableInfo[], ConnectorError>> {
    return ok([])
  }

  async getTableSchema(_tableName: string): Promise<Result<ColumnInfo[], ConnectorError>> {
    return ok([])
  }

  isConnected(): boolean {
    return false
  }
}

describe('ConnectorManager', () => {
  let manager: ReturnType<typeof createConnectorManager>

  beforeEach(() => {
    // Clear registry and mocks
    ConnectorRegistry.clear()
    vi.clearAllMocks()

    // Register mock connectors
    ConnectorRegistry.register('wasm', () => new MockConnector(), 'WASM')
    ConnectorRegistry.register('http', () => new FailingConnector(), 'HTTP')
    ConnectorRegistry.register('motherduck', () => new MockConnector(), 'MotherDuck')

    // Create fresh manager
    manager = createConnectorManager()

    // Default secretsManager mock behavior
    vi.mocked(secretsManager.get).mockReturnValue(null)
    vi.mocked(secretsManager.has).mockReturnValue(false)
  })

  describe('connect', () => {
    it('connects WASM connector without secrets', async () => {
      const connection: ConnectionData = {
        id: 'wasm-1',
        name: 'Test WASM',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }

      const result = await manager.connect(connection)

      expect(result.ok).toBe(true)
      expect(manager.isConnected('wasm-1')).toBe(true)
    })

    it('connects with secrets from secretsManager', async () => {
      vi.mocked(secretsManager.get).mockReturnValue({ token: 'stored-token' })

      const connection: ConnectionData = {
        id: 'http-1',
        name: 'Test HTTP',
        scope: 'http',
        host: 'http://localhost:8080',
        database: 'test'
      }

      // HTTP connector is FailingConnector, so it will fail
      // but we're testing that secretsManager.get was called
      await manager.connect(connection)

      expect(secretsManager.get).toHaveBeenCalledWith('http-1')
    })

    it('stores secrets when provided', async () => {
      const connection: ConnectionData = {
        id: 'wasm-1',
        name: 'Test',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }

      await manager.connect(connection, { token: 'new-token' })

      expect(secretsManager.set).toHaveBeenCalledWith('wasm-1', { token: 'new-token' })
    })

    it('returns existing connector if already connected', async () => {
      const connection: ConnectionData = {
        id: 'wasm-1',
        name: 'Test',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }

      const result1 = await manager.connect(connection)
      const result2 = await manager.connect(connection)

      expect(result1.ok).toBe(true)
      expect(result2.ok).toBe(true)
      // Both should return successfully
    })

    it('requires API key for MotherDuck', async () => {
      const connection: ConnectionData = {
        id: 'md-1',
        name: 'Test MD',
        scope: 'motherduck',
        host: 'md:',
        database: 'mydb'
      }

      const result = await manager.connect(connection)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_CONFIG')
        expect(result.error.message).toContain('API key')
      }
    })

    it('connects MotherDuck with API key', async () => {
      const connection: ConnectionData = {
        id: 'md-1',
        name: 'Test MD',
        scope: 'motherduck',
        host: 'md:',
        database: 'mydb'
      }

      const result = await manager.connect(connection, { apiKey: 'md_xxx' })

      expect(result.ok).toBe(true)
    })
  })

  describe('disconnect', () => {
    it('disconnects a connected connector', async () => {
      const connection: ConnectionData = {
        id: 'wasm-1',
        name: 'Test',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }

      await manager.connect(connection)
      const result = await manager.disconnect('wasm-1')

      expect(result.ok).toBe(true)
      expect(manager.isConnected('wasm-1')).toBe(false)
    })

    it('succeeds silently for non-existent connection', async () => {
      const result = await manager.disconnect('non-existent')

      expect(result.ok).toBe(true)
    })

    it('clears active if disconnecting active connection', async () => {
      const connection: ConnectionData = {
        id: 'wasm-1',
        name: 'Test',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }

      await manager.connect(connection)
      manager.setActive('wasm-1')

      await manager.disconnect('wasm-1')

      expect(manager.getActiveId()).toBeNull()
    })
  })

  describe('disconnectAll', () => {
    it('disconnects all connections and clears secrets', async () => {
      const conn1: ConnectionData = {
        id: 'wasm-1',
        name: 'Test 1',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }
      const conn2: ConnectionData = {
        id: 'wasm-2',
        name: 'Test 2',
        scope: 'wasm',
        host: 'local',
        database: 'memory2'
      }

      await manager.connect(conn1)
      await manager.connect(conn2)

      await manager.disconnectAll()

      expect(manager.isConnected('wasm-1')).toBe(false)
      expect(manager.isConnected('wasm-2')).toBe(false)
      expect(secretsManager.clearAll).toHaveBeenCalled()
    })
  })

  describe('testConnection', () => {
    it('tests connection and returns latency', async () => {
      const connection: ConnectionData = {
        id: 'test-1',
        name: 'Test',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }

      const result = await manager.testConnection(connection, {})

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.latency).toBeGreaterThanOrEqual(0)
      }
    })

    it('requires API key for MotherDuck test', async () => {
      const connection: ConnectionData = {
        id: 'test-1',
        name: 'Test MD',
        scope: 'motherduck',
        host: 'md:',
        database: 'mydb'
      }

      const result = await manager.testConnection(connection, {})

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_CONFIG')
      }
    })

    it('requires host for HTTP test', async () => {
      const connection: ConnectionData = {
        id: 'test-1',
        name: 'Test HTTP',
        scope: 'http',
        host: '',
        database: 'test'
      }

      const result = await manager.testConnection(connection, { token: 'x' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_CONFIG')
      }
    })

    it('disconnects after testing', async () => {
      const connection: ConnectionData = {
        id: 'test-1',
        name: 'Test',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }

      await manager.testConnection(connection, {})

      // The test connector should be disconnected (cleanup)
      // Manager should not have stored it
      expect(manager.get('test-1')).toBeNull()
    })
  })

  describe('setActive / getActive', () => {
    it('sets and gets active connection', async () => {
      const connection: ConnectionData = {
        id: 'wasm-1',
        name: 'Test',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }

      await manager.connect(connection)
      const success = manager.setActive('wasm-1')

      expect(success).toBe(true)
      expect(manager.getActiveId()).toBe('wasm-1')
      expect(manager.getActive()).not.toBeNull()
    })

    it('returns false for non-existent connection', () => {
      const success = manager.setActive('non-existent')

      expect(success).toBe(false)
      expect(manager.getActiveId()).toBeNull()
    })
  })

  describe('query', () => {
    it('queries using active connector', async () => {
      const connection: ConnectionData = {
        id: 'wasm-1',
        name: 'Test',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }

      await manager.connect(connection)
      manager.setActive('wasm-1')

      const result = await manager.query('SELECT 1')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.rowCount).toBe(1)
      }
    })

    it('returns error when no active connection', async () => {
      const result = await manager.query('SELECT 1')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('QUERY_FAILED')
        expect(result.error.message).toContain('No active connection')
      }
    })
  })

  describe('getConnectedIds', () => {
    it('returns list of connected connection IDs', async () => {
      const conn1: ConnectionData = {
        id: 'wasm-1',
        name: 'Test 1',
        scope: 'wasm',
        host: 'local',
        database: 'memory'
      }
      const conn2: ConnectionData = {
        id: 'wasm-2',
        name: 'Test 2',
        scope: 'wasm',
        host: 'local',
        database: 'memory2'
      }

      await manager.connect(conn1)
      await manager.connect(conn2)

      const ids = manager.getConnectedIds()

      expect(ids).toContain('wasm-1')
      expect(ids).toContain('wasm-2')
      expect(ids).toHaveLength(2)
    })
  })
})
