/**
 * ConnectorRegistry - Unit Tests
 *
 * Tests for connector registration and creation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ConnectorRegistry } from './registry'
import { ok, err, isOk, isErr } from './result'
import { connectorError } from './errors'
import type { Connector, ConnectorConfig, ConnectorCapabilities, ConnectionStatus, QueryResult, TestResult, TableInfo, ColumnInfo } from './types'
import type { ConnectorError, QueryError } from './errors'
import type { Result } from './result'

// ============================================================================
// Mock Connector for testing
// ============================================================================

class MockConnector implements Connector {
  readonly type = 'wasm' as const  // Use valid ConnectorType for testing
  readonly capabilities: ConnectorCapabilities = {
    supportsStreaming: false,
    supportsTransactions: false,
    supportsDDL: true,
    maxConcurrentQueries: 1,
    supportsPersistence: false
  }

  private _status: ConnectionStatus = 'disconnected'
  private _connected = false

  get status(): ConnectionStatus {
    return this._status
  }

  async connect(_config: ConnectorConfig): Promise<Result<void, ConnectorError>> {
    this._status = 'connected'
    this._connected = true
    return ok(undefined)
  }

  async disconnect(): Promise<Result<void, ConnectorError>> {
    this._status = 'disconnected'
    this._connected = false
    return ok(undefined)
  }

  async testConnection(): Promise<Result<TestResult, ConnectorError>> {
    if (!this._connected) {
      return err(connectorError('NOT_INITIALIZED', 'Not connected'))
    }
    return ok({ latency: 1, version: 'mock-1.0' })
  }

  async query(sql: string): Promise<Result<QueryResult, QueryError>> {
    if (!this._connected) {
      return err({ code: 'QUERY_FAILED', message: 'Not connected', sql } as QueryError)
    }
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
  readonly type = 'http' as const  // Use valid ConnectorType for testing
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
    return err(connectorError('CONNECTION_FAILED', 'Always fails'))
  }

  async disconnect(): Promise<Result<void, ConnectorError>> {
    return ok(undefined)
  }

  async testConnection(): Promise<Result<TestResult, ConnectorError>> {
    return err(connectorError('NOT_INITIALIZED', 'Not connected'))
  }

  async query(sql: string): Promise<Result<QueryResult, QueryError>> {
    return err({ code: 'QUERY_FAILED', message: 'Not connected', sql } as QueryError)
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

// ============================================================================
// Tests
// ============================================================================

describe('ConnectorRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    ConnectorRegistry.clear()
  })

  describe('register', () => {
    it('registers a connector factory', () => {
      ConnectorRegistry.register('wasm', () => new MockConnector(), 'Mock connector')

      expect(ConnectorRegistry.has('wasm')).toBe(true)
    })

    it('allows registering multiple types', () => {
      ConnectorRegistry.register('wasm', () => new MockConnector(), 'Mock')
      ConnectorRegistry.register('http', () => new FailingConnector(), 'Failing')

      const types = ConnectorRegistry.list().map(e => e.type)
      expect(types).toContain('wasm')
      expect(types).toContain('http')
    })
  })

  describe('create', () => {
    beforeEach(() => {
      ConnectorRegistry.register('wasm', () => new MockConnector(), 'Mock connector')
    })

    it('creates a registered connector', () => {
      const result = ConnectorRegistry.create('wasm')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.type).toBe('wasm')
      }
    })

    it('returns error for unregistered type', () => {
      const result = ConnectorRegistry.create('unknown' as any)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_CONFIG')
        expect(result.error.message).toContain('unknown')
      }
    })
  })

  describe('createAndConnect', () => {
    beforeEach(() => {
      ConnectorRegistry.register('wasm', () => new MockConnector(), 'Mock connector')
      ConnectorRegistry.register('http', () => new FailingConnector(), 'Failing connector')
    })

    it('creates and connects a connector', async () => {
      const config: ConnectorConfig = {
        id: 'test',
        name: 'Test',
        type: 'wasm',
        options: {}
      }

      const result = await ConnectorRegistry.createAndConnect(config)

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.isConnected()).toBe(true)
        expect(result.value.status).toBe('connected')
      }
    })

    it('returns error if connection fails', async () => {
      const config: ConnectorConfig = {
        id: 'test',
        name: 'Test',
        type: 'http',
        options: {}
      }

      const result = await ConnectorRegistry.createAndConnect(config)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.code).toBe('CONNECTION_FAILED')
      }
    })

    it('returns error for unregistered type', async () => {
      const config: ConnectorConfig = {
        id: 'test',
        name: 'Test',
        type: 'unknown' as any,
        options: {}
      }

      const result = await ConnectorRegistry.createAndConnect(config)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_CONFIG')
      }
    })
  })

  describe('list', () => {
    it('returns empty array when no connectors registered', () => {
      const entries = ConnectorRegistry.list()
      expect(entries).toEqual([])
    })

    it('returns all registered types with descriptions', () => {
      ConnectorRegistry.register('wasm', () => new MockConnector(), 'Mock connector')
      ConnectorRegistry.register('http', () => new FailingConnector(), 'Failing connector')

      const entries = ConnectorRegistry.list()
      expect(entries).toHaveLength(2)

      const wasmEntry = entries.find(e => e.type === 'wasm')
      expect(wasmEntry?.description).toBe('Mock connector')

      const httpEntry = entries.find(e => e.type === 'http')
      expect(httpEntry?.description).toBe('Failing connector')
    })
  })

  describe('has', () => {
    it('returns true for registered type', () => {
      ConnectorRegistry.register('wasm', () => new MockConnector(), 'Mock')
      expect(ConnectorRegistry.has('wasm')).toBe(true)
    })

    it('returns false for unregistered type', () => {
      expect(ConnectorRegistry.has('unknown' as any)).toBe(false)
    })
  })

  describe('clear', () => {
    it('removes all registered connectors', () => {
      ConnectorRegistry.register('wasm', () => new MockConnector(), 'Mock')
      ConnectorRegistry.register('http', () => new FailingConnector(), 'Failing')

      ConnectorRegistry.clear()

      const entries = ConnectorRegistry.list()
      expect(entries).toEqual([])
    })
  })
})

// ============================================================================
// Connector behavior tests
// ============================================================================

describe('MockConnector', () => {
  let connector: MockConnector

  beforeEach(() => {
    connector = new MockConnector()
  })

  it('starts disconnected', () => {
    expect(connector.isConnected()).toBe(false)
    expect(connector.status).toBe('disconnected')
  })

  it('connects successfully', async () => {
    const config: ConnectorConfig = { id: 'test', name: 'Test', type: 'wasm', options: {} }
    const result = await connector.connect(config)

    expect(isOk(result)).toBe(true)
    expect(connector.isConnected()).toBe(true)
    expect(connector.status).toBe('connected')
  })

  it('disconnects successfully', async () => {
    const config: ConnectorConfig = { id: 'test', name: 'Test', type: 'wasm', options: {} }
    await connector.connect(config)
    const result = await connector.disconnect()

    expect(isOk(result)).toBe(true)
    expect(connector.isConnected()).toBe(false)
    expect(connector.status).toBe('disconnected')
  })

  it('executes queries when connected', async () => {
    const config: ConnectorConfig = { id: 'test', name: 'Test', type: 'wasm', options: {} }
    await connector.connect(config)

    const result = await connector.query('SELECT 1')

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.rowCount).toBe(1)
    }
  })

  it('fails queries when not connected', async () => {
    const result = await connector.query('SELECT 1')

    expect(isErr(result)).toBe(true)
  })

  it('tests connection when connected', async () => {
    const config: ConnectorConfig = { id: 'test', name: 'Test', type: 'wasm', options: {} }
    await connector.connect(config)

    const result = await connector.testConnection()

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.version).toBe('mock-1.0')
      expect(result.value.latency).toBeGreaterThanOrEqual(0)
    }
  })
})
