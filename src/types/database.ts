import type * as duckdb from '@duckdb/duckdb-wasm'

export interface DatabaseConfig {
  bundles?: duckdb.DuckDBBundles
  logger?: duckdb.Logger
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
