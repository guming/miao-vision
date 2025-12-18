/**
 * WASM Connector Types
 *
 * DuckDB-WASM specific type definitions.
 *
 * @module core/connectors/wasm/types
 */

import type { ConnectorDeps } from '../types'

/**
 * WASM connector configuration options
 */
export interface WasmConnectorOptions {
  /** Enable OPFS persistence (default: false) */
  persist?: boolean
  /** Database path for OPFS (default: 'opfs://miao.db') */
  dbPath?: string
  /** Enable auto-checkpoint (default: true when persist=true) */
  autoCheckpoint?: boolean
  /** Checkpoint interval in ms (default: 30000) */
  checkpointInterval?: number
}

/**
 * WASM connector dependencies
 */
export interface WasmConnectorDeps extends ConnectorDeps {
  /** DuckDB module (for testing injection) */
  duckdb?: typeof import('@duckdb/duckdb-wasm')
}

/**
 * DuckDB bundle configuration
 */
export interface DuckDBBundle {
  mainModule: string
  mainWorker: string
}

/**
 * DuckDB bundles (MVP and EH variants)
 */
export interface DuckDBBundles {
  mvp: DuckDBBundle
  eh: DuckDBBundle
}

/**
 * File load result
 */
export interface FileLoadResult {
  tableName: string
  rowCount: number
  columns: string[]
}

/**
 * OPFS storage info
 */
export interface StorageInfo {
  isOPFSSupported: boolean
  isPersistent: boolean
  dbPath: string
  estimatedSize?: number
}
