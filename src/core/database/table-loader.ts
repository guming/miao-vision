/**
 * Table Loader
 *
 * Utilities for loading data into DuckDB tables.
 * Used to store SQL query results for chart rendering and SQL references.
 *
 * P1.5: Uses Web Worker for CPU-intensive SQL string building
 * to prevent main thread blocking on large datasets.
 */

import { duckDBManager } from './index'
import { buildTableSQLInWorker, isChartWorkerAvailable } from '@/workers/use-chart-worker'

/**
 * Load data from query result into a DuckDB table
 *
 * With the unified DuckDB instance, this creates the table directly
 * in duckDBManager, which is shared with Mosaic for chart rendering.
 *
 * @param tableName - Name of the table to create
 * @param data - Array of row objects
 * @param columns - Array of column names
 */
export async function loadDataIntoTable(
  tableName: string,
  data: any[],
  columns: string[]
): Promise<void> {
  try {
    // Ensure DuckDB is initialized
    if (!duckDBManager.isInitialized()) {
      await duckDBManager.initialize()
    }

    if (data.length === 0) {
      console.warn(`Cannot create table ${tableName}: no data`)
      return
    }

    const startTime = performance.now()
    let createTableSQL: string

    // P1.5: Use Worker for large datasets to avoid blocking main thread
    const shouldUseWorker = isChartWorkerAvailable() && data.length > 100

    if (shouldUseWorker) {
      console.log(`[TableLoader] Using Worker for ${data.length} rows`)
      try {
        // Build SQL in background worker (non-blocking)
        createTableSQL = await buildTableSQLInWorker(tableName, data, columns)
        const buildTime = performance.now() - startTime
        console.log(`[TableLoader] SQL built in Worker: ${buildTime.toFixed(2)}ms`)
      } catch (workerError) {
        console.warn('[TableLoader] Worker failed, falling back to main thread:', workerError)
        // Fallback to main thread
        createTableSQL = buildTableSQLSync(tableName, data, columns)
      }
    } else {
      // Small datasets or worker not available - use main thread
      console.log(`[TableLoader] Using main thread for ${data.length} rows`)
      createTableSQL = buildTableSQLSync(tableName, data, columns)
    }

    // Execute SQL (DuckDB is already in a worker, so this is async)
    await duckDBManager.query(createTableSQL)

    const totalTime = performance.now() - startTime
    console.log(`Table created: ${tableName} (${data.length} rows) in ${totalTime.toFixed(2)}ms`)
  } catch (error) {
    console.error('Failed to load data into table:', error)
    throw error
  }
}

/**
 * Build SQL synchronously in main thread (fallback)
 * P1.5: This is the original implementation, kept as fallback
 */
function buildTableSQLSync(
  tableName: string,
  data: any[],
  columns: string[]
): string {
  const columnDefs = columns.map(col => `"${col}"`).join(', ')
  const values = data.map(row => {
    const vals = columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return 'NULL'
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
      return String(val)
    })
    return `(${vals.join(', ')})`
  }).join(', ')

  return `
    CREATE OR REPLACE TABLE "${tableName}" AS
    SELECT * FROM (VALUES ${values}) AS t(${columnDefs})
  `
}

/**
 * Drop a table from DuckDB
 *
 * @param tableName - Name of the table to drop
 */
export async function dropTable(tableName: string): Promise<void> {
  try {
    if (!duckDBManager.isInitialized()) {
      return
    }
    await duckDBManager.query(`DROP TABLE IF EXISTS "${tableName}"`)
    console.log(`Table dropped: ${tableName}`)
  } catch (error) {
    console.warn(`Failed to drop table ${tableName}:`, error)
  }
}
