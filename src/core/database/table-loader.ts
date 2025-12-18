/**
 * Table Loader
 *
 * Utilities for loading data into DuckDB tables.
 * Used to store SQL query results for chart rendering and SQL references.
 */

import { duckDBManager } from './index'

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

    // Create table from data array using duckDBManager
    // This table will be visible to both SQL references and Mosaic charts
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

    const createTableSQL = `
      CREATE OR REPLACE TABLE "${tableName}" AS
      SELECT * FROM (VALUES ${values}) AS t(${columnDefs})
    `

    await duckDBManager.query(createTableSQL)
    console.log(`Table created: ${tableName} (${data.length} rows)`)
  } catch (error) {
    console.error('Failed to load data into table:', error)
    throw error
  }
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
