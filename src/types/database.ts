import type * as duckdb from '@duckdb/duckdb-wasm'

export interface DatabaseConfig {
  bundles?: duckdb.DuckDBBundles
  logger?: duckdb.Logger
  /**
   * @deprecated Memory-only mode - persist option is no longer supported
   * @default false (in-memory)
   */
  persist?: boolean
  /**
   * @deprecated Memory-only mode - path option is no longer supported
   * @default 'duckdb.db'
   */
  path?: string
}

export interface QueryResult {
  data: any[]
  columns: string[]
  rowCount: number
  executionTime: number
}

export interface DataSource {
  name: string
  type: 'csv' | 'parquet' | 'json'
  file: File
  tableName: string
  loaded: boolean
}

export interface DatabaseState {
  initialized: boolean
  loading: boolean
  error: string | null
  dataSources: DataSource[]
}
