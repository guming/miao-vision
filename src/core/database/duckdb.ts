import * as duckdb from '@duckdb/duckdb-wasm'
import type { DatabaseConfig, QueryResult } from '@/types/database'

// Import bundles
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker
  }
}

export class DuckDBManager {
  private static instance: DuckDBManager | null = null
  private db: duckdb.AsyncDuckDB | null = null
  private conn: duckdb.AsyncDuckDBConnection | null = null
  private logger: duckdb.ConsoleLogger

  private constructor() {
    this.logger = new duckdb.ConsoleLogger()
  }

  static getInstance(): DuckDBManager {
    if (!DuckDBManager.instance) {
      DuckDBManager.instance = new DuckDBManager()
    }
    return DuckDBManager.instance
  }

  async initialize(config: DatabaseConfig = {}): Promise<void> {
    if (this.db) {
      console.log('DuckDB already initialized')
      return
    }

    try {
      const bundles = config.bundles || MANUAL_BUNDLES
      const bundle = await duckdb.selectBundle(bundles)

      if (!bundle.mainWorker) {
        throw new Error('Failed to select DuckDB worker')
      }

      const logger = config.logger || this.logger
      const worker = new Worker(bundle.mainWorker)

      this.db = new duckdb.AsyncDuckDB(logger, worker)
      await this.db.instantiate(bundle.mainModule)

      this.conn = await this.db.connect()

      console.log('DuckDB-WASM initialized successfully')
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error)
      throw error
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.conn) {
      throw new Error('Database not initialized. Call initialize() first.')
    }

    const startTime = performance.now()

    try {
      const result = await this.conn.query(sql)
      const schema = result.schema
      const columns = schema.fields.map(field => field.name)

      // Check which columns are date/timestamp types
      const dateColumnIndices = new Set<number>()
      schema.fields.forEach((field, index) => {
        const typeStr = field.type.toString().toLowerCase()
        if (typeStr.includes('date') || typeStr.includes('timestamp')) {
          dateColumnIndices.add(index)
        }
      })

      // Convert data, handling date columns specially
      const data = result.toArray().map(row => {
        const jsonRow = row.toJSON()

        // Convert date columns from timestamps to date strings
        if (dateColumnIndices.size > 0) {
          columns.forEach((colName, index) => {
            if (dateColumnIndices.has(index) && jsonRow[colName] != null) {
              const timestamp = jsonRow[colName]
              if (typeof timestamp === 'number') {
                // Convert timestamp to YYYY-MM-DD format
                const date = new Date(timestamp)
                if (!isNaN(date.getTime())) {
                  jsonRow[colName] = date.toISOString().split('T')[0]
                }
              }
            }
          })
        }

        return jsonRow
      })

      const executionTime = performance.now() - startTime

      return {
        data,
        columns,
        rowCount: data.length,
        executionTime
      }
    } catch (error) {
      console.error('Query execution failed:', error)
      throw error
    }
  }

  async loadCSV(file: File, tableName: string): Promise<void> {
    if (!this.db || !this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      const buffer = await file.arrayBuffer()
      const fileName = `/${file.name}`

      await this.db.registerFileBuffer(fileName, new Uint8Array(buffer))

      await this.conn.query(`
        CREATE TABLE ${tableName} AS
        SELECT * FROM read_csv_auto('${fileName}')
      `)

      console.log(`CSV file loaded as table: ${tableName}`)
    } catch (error) {
      console.error('Failed to load CSV:', error)
      throw error
    }
  }

  async loadParquet(file: File, tableName: string): Promise<void> {
    if (!this.db || !this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      const buffer = await file.arrayBuffer()
      const fileName = `/${file.name}`

      await this.db.registerFileBuffer(fileName, new Uint8Array(buffer))

      await this.conn.query(`
        CREATE TABLE ${tableName} AS
        SELECT * FROM read_parquet('${fileName}')
      `)

      console.log(`Parquet file loaded as table: ${tableName}`)
    } catch (error) {
      console.error('Failed to load Parquet:', error)
      throw error
    }
  }

  async listTables(): Promise<string[]> {
    if (!this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      const result = await this.query("SHOW TABLES")
      return result.data.map((row: any) => row.name)
    } catch (error) {
      console.error('Failed to list tables:', error)
      return []
    }
  }

  async getTableSchema(tableName: string): Promise<any[]> {
    if (!this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      const result = await this.query(`DESCRIBE ${tableName}`)
      return result.data
    } catch (error) {
      console.error('Failed to get table schema:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.conn) {
      await this.conn.close()
      this.conn = null
    }
    if (this.db) {
      await this.db.terminate()
      this.db = null
    }
    console.log('DuckDB connection closed')
  }

  isInitialized(): boolean {
    return this.db !== null && this.conn !== null
  }

  /**
   * Get the underlying AsyncDuckDB instance
   * Used to share with Mosaic's wasmConnector
   */
  getDB(): duckdb.AsyncDuckDB | null {
    return this.db
  }

  /**
   * Execute a statement without returning results (CREATE, DROP, INSERT, etc.)
   */
  async exec(sql: string): Promise<void> {
    if (!this.conn) {
      throw new Error('Database not initialized. Call initialize() first.')
    }

    try {
      await this.conn.query(sql)
    } catch (error) {
      console.error('Exec failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const duckDBManager = DuckDBManager.getInstance()
