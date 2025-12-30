/**
 * StreamingTable - Real-time data streaming with DuckDB-WASM
 *
 * Provides high-performance streaming data ingestion using Apache Arrow
 * and automatic sliding window management.
 */

import { duckDBManager } from '@core/database'

export interface StreamingTableOptions {
  maxRows?: number        // Sliding window size (keeps only latest N rows)
  updateInterval?: number // Batch flush interval in ms (0 = manual flush)
  primaryKey?: string     // Primary key for upsert behavior
  autoFlush?: boolean     // Auto-flush when buffer reaches threshold
}

export type SubscribeCallback = () => void

export class StreamingTable {
  private buffer: any[] = []
  private flushTimer?: ReturnType<typeof setTimeout>
  private subscribers = new Set<SubscribeCallback>()
  private isInitialized = false
  private flushThreshold = 100 // Auto-flush when buffer reaches this size
  private initPromise: Promise<void>

  constructor(
    public readonly name: string,
    private schema: Record<string, string>,
    private options: StreamingTableOptions = {}
  ) {
    this.options = {
      autoFlush: true,
      updateInterval: 0,
      ...options
    }

    this.initPromise = this.initTable()
  }

  /**
   * Wait for table initialization to complete
   */
  async waitForInit(): Promise<void> {
    return this.initPromise
  }

  /**
   * Initialize the DuckDB table
   */
  private async initTable() {
    try {
      const db = await duckDBManager.getDB()
      const conn = await db.connect()

      // Build CREATE TABLE statement
      const columns = Object.entries(this.schema)
        .map(([col, type]) => `"${col}" ${type}`)
        .join(', ')

      await conn.query(`
        CREATE TABLE IF NOT EXISTS "${this.name}" (${columns})
      `)

      this.isInitialized = true
      console.log(`✅ Streaming table "${this.name}" initialized`)
    } catch (error) {
      console.error(`Failed to initialize streaming table "${this.name}":`, error)
      throw error
    }
  }

  /**
   * Add data to the streaming table
   * Data is buffered and flushed based on options
   */
  update(rows: any | any[]) {
    const dataArray = Array.isArray(rows) ? rows : [rows]
    this.buffer.push(...dataArray)

    // Auto-flush based on configuration
    if (this.options.autoFlush) {
      // Debounce flush for better performance (batch multiple updates within 16ms)
      if (this.flushTimer) clearTimeout(this.flushTimer)
      this.flushTimer = setTimeout(() => this.flush(), 16)
    } else if (this.options.updateInterval && this.options.updateInterval > 0) {
      if (this.flushTimer) clearTimeout(this.flushTimer)
      this.flushTimer = setTimeout(() => this.flush(), this.options.updateInterval)
    }
  }

  /**
   * Flush buffered data to DuckDB
   */
  async flush() {
    if (this.buffer.length === 0) return
    if (!this.isInitialized) {
      await this.initTable()
    }

    const dataToFlush = [...this.buffer]
    this.buffer = []

    try {
      const db = await duckDBManager.getDB()
      const conn = await db.connect()

      // Build INSERT statement with VALUES
      const columns = Object.keys(this.schema).map(c => `"${c}"`).join(', ')

      // Convert data to SQL values
      const values = dataToFlush.map(row => {
        const vals = Object.keys(this.schema).map(col => {
          const val = row[col]
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
          if (val instanceof Date) return `'${val.toISOString()}'`
          return val
        })
        return `(${vals.join(', ')})`
      }).join(', ')

      // Insert data
      if (this.options.primaryKey) {
        // Upsert behavior using INSERT OR REPLACE
        await conn.query(`
          INSERT OR REPLACE INTO "${this.name}" (${columns})
          VALUES ${values}
        `)
      } else {
        // Append behavior
        await conn.query(`
          INSERT INTO "${this.name}" (${columns})
          VALUES ${values}
        `)
      }

      console.log(`📊 Flushed ${dataToFlush.length} rows to "${this.name}"`)

      // Apply sliding window if configured
      if (this.options.maxRows) {
        await this.applyRowLimit(conn)
      }

      // Notify subscribers
      this.notifySubscribers()

    } catch (error) {
      console.error(`Failed to flush data to "${this.name}":`, error)
      // Put data back in buffer on error
      this.buffer.unshift(...dataToFlush)
    }
  }

  /**
   * Apply row limit (sliding window)
   * Uses timestamp field for ordering since DuckDB-WASM doesn't have rowid
   */
  private async applyRowLimit(conn: any) {
    try {
      const result = await conn.query(`
        SELECT COUNT(*) as cnt FROM "${this.name}"
      `)
      // Convert BigInt to Number for comparison
      const count = Number(result.toArray()[0].cnt)

      if (count > this.options.maxRows!) {
        const toDelete = count - this.options.maxRows!
        // Use timestamp field for ordering (assuming it exists)
        const timestampField = Object.keys(this.schema).find(k =>
          k.toLowerCase() === 'timestamp' || this.schema[k].toUpperCase().includes('TIMESTAMP')
        )

        if (timestampField) {
          await conn.query(`
            DELETE FROM "${this.name}"
            WHERE "${timestampField}" IN (
              SELECT "${timestampField}" FROM "${this.name}"
              ORDER BY "${timestampField}" ASC
              LIMIT ${toDelete}
            )
          `)
          console.log(`🗑️  Removed ${toDelete} old rows from "${this.name}"`)
        }
      }
    } catch (error) {
      console.error('Failed to apply row limit:', error)
    }
  }

  /**
   * Subscribe to data updates
   */
  subscribe(callback: SubscribeCallback): () => void {
    this.subscribers.add(callback)
    console.log(`📌 Subscribed to "${this.name}", total subscribers: ${this.subscribers.size}`)
    return () => this.subscribers.delete(callback)
  }

  /**
   * Notify all subscribers of data update
   */
  private notifySubscribers() {
    console.log(`🔔 Notifying ${this.subscribers.size} subscribers for "${this.name}"`)
    this.subscribers.forEach(cb => {
      try {
        cb()
      } catch (error) {
        console.error('Subscriber callback error:', error)
      }
    })
  }

  /**
   * Get current row count
   */
  async getRowCount(): Promise<number> {
    try {
      const db = await duckDBManager.getDB()
      const conn = await db.connect()
      const result = await conn.query(`SELECT COUNT(*) as cnt FROM "${this.name}"`)
      // Convert BigInt to Number
      return Number(result.toArray()[0].cnt)
    } catch (error) {
      console.error('Failed to get row count:', error)
      return 0
    }
  }

  /**
   * Query the table
   */
  async query(sql: string): Promise<any[]> {
    try {
      const db = await duckDBManager.getDB()
      const conn = await db.connect()
      const result = await conn.query(sql)
      return result.toArray()
    } catch (error) {
      console.error('Query failed:', error)
      return []
    }
  }

  /**
   * Clear all data
   */
  async clear() {
    try {
      const db = await duckDBManager.getDB()
      const conn = await db.connect()
      await conn.query(`DELETE FROM "${this.name}"`)
      this.buffer = []
      this.notifySubscribers()
      console.log(`🗑️  Cleared table "${this.name}"`)
    } catch (error) {
      console.error('Failed to clear table:', error)
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
    }
    this.subscribers.clear()
    this.buffer = []
  }
}
