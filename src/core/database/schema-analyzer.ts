/**
 * Schema Analyzer Service
 *
 * Provides comprehensive schema analysis for DuckDB tables including:
 * - Table metadata (row counts, column info)
 * - Column statistics (min/max, null %, distinct count)
 * - Foreign key detection (heuristic)
 * - Data preview
 */

import type { QueryResult } from '@/types/database'
import type {
  TableSchema,
  ColumnSchema,
  ColumnStats,
  DatabaseSummary,
  SchemaAnalysisOptions,
  ForeignKeyInfo
} from '@/types/schema'
import { getTypeCategory, DEFAULT_SCHEMA_OPTIONS } from '@/types/schema'

/**
 * Interface for database query execution
 * Allows decoupling from specific database implementation
 */
export interface IQueryExecutor {
  query(sql: string): Promise<QueryResult>
  listTables(): Promise<string[]>
}

/**
 * Schema Analyzer class
 */
export class SchemaAnalyzer {
  private queryExecutor: IQueryExecutor
  private schemaCache = new Map<string, TableSchema>()
  private statsCache = new Map<string, Map<string, ColumnStats>>()

  constructor(queryExecutor: IQueryExecutor) {
    this.queryExecutor = queryExecutor
  }

  /**
   * Get database summary (all tables with basic info)
   */
  async getDatabaseSummary(): Promise<DatabaseSummary> {
    const tableNames = await this.queryExecutor.listTables()
    let totalRows = 0

    for (const tableName of tableNames) {
      try {
        const result = await this.queryExecutor.query(
          `SELECT COUNT(*) as cnt FROM "${tableName}"`
        )
        if (result.data?.[0]?.cnt) {
          totalRows += Number(result.data[0].cnt)
        }
      } catch {
        // Ignore count errors for individual tables
      }
    }

    return {
      tableCount: tableNames.length,
      totalRows,
      tableNames,
      lastRefreshed: new Date().toISOString()
    }
  }

  /**
   * Get enhanced table schema with optional statistics
   */
  async getTableSchema(
    tableName: string,
    options: SchemaAnalysisOptions = DEFAULT_SCHEMA_OPTIONS
  ): Promise<TableSchema> {
    // Check cache first
    const cacheKey = `${tableName}:${JSON.stringify(options)}`
    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!
    }

    // Get basic column info
    const describeResult = await this.queryExecutor.query(`DESCRIBE "${tableName}"`)
    const rowCountResult = await this.queryExecutor.query(
      `SELECT COUNT(*) as cnt FROM "${tableName}"`
    )
    const rowCount = Number(rowCountResult.data?.[0]?.cnt ?? 0)

    // Parse columns from DESCRIBE result
    const columns: ColumnSchema[] = describeResult.data.map((row: any) => {
      const name = row.column_name || row.name
      const type = row.column_type || row.type
      const nullable = row.null !== 'NO'

      return {
        name,
        type,
        typeCategory: getTypeCategory(type),
        nullable,
        isPrimaryKey: false,
        isForeignKey: false,
        defaultValue: row.default ?? undefined
      }
    })

    // Detect primary keys (heuristic: columns named 'id' or ending with '_id' that are unique)
    const primaryKey: string[] = []
    for (const col of columns) {
      if (col.name.toLowerCase() === 'id' || col.name.toLowerCase().endsWith('_pk')) {
        // Check if unique
        try {
          const uniqueCheck = await this.queryExecutor.query(`
            SELECT COUNT(*) = COUNT(DISTINCT "${col.name}") as is_unique
            FROM "${tableName}"
            WHERE "${col.name}" IS NOT NULL
            LIMIT 10000
          `)
          if (uniqueCheck.data?.[0]?.is_unique) {
            col.isPrimaryKey = true
            primaryKey.push(col.name)
          }
        } catch {
          // Ignore check errors
        }
      }
    }

    // Detect foreign keys (heuristic)
    const foreignKeys: ForeignKeyInfo[] = []
    if (options.detectForeignKeys) {
      const allTables = await this.queryExecutor.listTables()
      for (const col of columns) {
        const fk = this.detectForeignKey(col.name, tableName, allTables)
        if (fk) {
          col.isForeignKey = true
          col.foreignKeyRef = fk
          foreignKeys.push(fk)
        }
      }
    }

    // Load column statistics if requested
    if (options.includeStats) {
      await this.loadColumnStats(tableName, columns, rowCount, options)
    }

    const schema: TableSchema = {
      name: tableName,
      rowCount,
      columns,
      primaryKey,
      foreignKeys
    }

    // Cache the result
    this.schemaCache.set(cacheKey, schema)

    return schema
  }

  /**
   * Get column statistics for a specific column
   */
  async getColumnStats(
    tableName: string,
    columnName: string,
    columnType: string,
    rowCount: number,
    options: SchemaAnalysisOptions = DEFAULT_SCHEMA_OPTIONS
  ): Promise<ColumnStats> {
    // Check cache first
    const tableStatsCache = this.statsCache.get(tableName)
    if (tableStatsCache?.has(columnName)) {
      return tableStatsCache.get(columnName)!
    }

    const typeCategory = getTypeCategory(columnType)
    const sampleLimit = options.sampleSize || 10000

    // Base statistics query
    const baseStatsResult = await this.queryExecutor.query(`
      SELECT
        COUNT(*) as total_rows,
        COUNT("${columnName}") as non_null_count,
        COUNT(*) - COUNT("${columnName}") as null_count,
        COUNT(DISTINCT "${columnName}") as distinct_count
      FROM (SELECT "${columnName}" FROM "${tableName}" LIMIT ${sampleLimit})
    `)

    const baseData = baseStatsResult.data[0] || {}
    const totalRows = Number(baseData.total_rows || rowCount)
    const nullCount = Number(baseData.null_count || 0)
    const distinctCount = Number(baseData.distinct_count || 0)

    const stats: ColumnStats = {
      totalRows,
      nullCount,
      nullPercent: totalRows > 0 ? (nullCount / totalRows) * 100 : 0,
      distinctCount,
      isUnique: distinctCount === totalRows - nullCount && nullCount < totalRows
    }

    // Type-specific statistics
    if (typeCategory === 'numeric') {
      try {
        const numericResult = await this.queryExecutor.query(`
          SELECT
            MIN("${columnName}") as min_val,
            MAX("${columnName}") as max_val,
            AVG("${columnName}") as avg_val,
            SUM("${columnName}") as sum_val
          FROM (SELECT "${columnName}" FROM "${tableName}" WHERE "${columnName}" IS NOT NULL LIMIT ${sampleLimit})
        `)
        const numData = numericResult.data[0] || {}
        stats.numeric = {
          min: Number(numData.min_val ?? 0),
          max: Number(numData.max_val ?? 0),
          avg: Number(numData.avg_val ?? 0),
          sum: Number(numData.sum_val ?? 0)
        }
      } catch {
        // Ignore numeric stats errors
      }
    } else if (typeCategory === 'string') {
      try {
        const stringResult = await this.queryExecutor.query(`
          SELECT
            MIN(LENGTH("${columnName}")) as min_len,
            MAX(LENGTH("${columnName}")) as max_len,
            AVG(LENGTH("${columnName}")) as avg_len
          FROM (SELECT "${columnName}" FROM "${tableName}" WHERE "${columnName}" IS NOT NULL LIMIT ${sampleLimit})
        `)
        const strData = stringResult.data[0] || {}
        stats.string = {
          minLength: Number(strData.min_len ?? 0),
          maxLength: Number(strData.max_len ?? 0),
          avgLength: Number(strData.avg_len ?? 0)
        }

        // Get top values if requested
        if (options.includeTopValues) {
          const topCount = options.topValuesCount || 5
          const topResult = await this.queryExecutor.query(`
            SELECT "${columnName}" as value, COUNT(*) as cnt
            FROM (SELECT "${columnName}" FROM "${tableName}" WHERE "${columnName}" IS NOT NULL LIMIT ${sampleLimit})
            GROUP BY "${columnName}"
            ORDER BY cnt DESC
            LIMIT ${topCount}
          `)
          stats.string.topValues = topResult.data.map((row: any) => ({
            value: String(row.value),
            count: Number(row.cnt)
          }))
        }
      } catch {
        // Ignore string stats errors
      }
    } else if (typeCategory === 'date') {
      try {
        const dateResult = await this.queryExecutor.query(`
          SELECT
            MIN("${columnName}")::VARCHAR as min_date,
            MAX("${columnName}")::VARCHAR as max_date
          FROM (SELECT "${columnName}" FROM "${tableName}" WHERE "${columnName}" IS NOT NULL LIMIT ${sampleLimit})
        `)
        const dateData = dateResult.data[0] || {}
        const minDate = String(dateData.min_date || '')
        const maxDate = String(dateData.max_date || '')

        // Calculate range in days
        let rangeDays = 0
        if (minDate && maxDate) {
          const min = new Date(minDate)
          const max = new Date(maxDate)
          rangeDays = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24))
        }

        stats.date = {
          min: minDate,
          max: maxDate,
          rangeDays
        }
      } catch {
        // Ignore date stats errors
      }
    }

    // Cache the result
    if (!this.statsCache.has(tableName)) {
      this.statsCache.set(tableName, new Map())
    }
    this.statsCache.get(tableName)!.set(columnName, stats)

    return stats
  }

  /**
   * Get data preview for a table
   */
  async getDataPreview(
    tableName: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<QueryResult> {
    return this.queryExecutor.query(
      `SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset}`
    )
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.schemaCache.clear()
    this.statsCache.clear()
  }

  /**
   * Clear cache for a specific table
   */
  clearTableCache(tableName: string): void {
    // Clear schema cache entries containing this table
    for (const key of this.schemaCache.keys()) {
      if (key.startsWith(`${tableName}:`)) {
        this.schemaCache.delete(key)
      }
    }
    this.statsCache.delete(tableName)
  }

  /**
   * Load column statistics for all columns in a table
   */
  private async loadColumnStats(
    tableName: string,
    columns: ColumnSchema[],
    rowCount: number,
    options: SchemaAnalysisOptions
  ): Promise<void> {
    for (const column of columns) {
      try {
        column.stats = await this.getColumnStats(
          tableName,
          column.name,
          column.type,
          rowCount,
          options
        )
      } catch {
        // Ignore individual column stats errors
      }
    }
  }

  /**
   * Detect potential foreign key relationship (heuristic)
   *
   * Rules:
   * - Column ends with '_id' or '_fk'
   * - Target table exists (column name without suffix)
   * - Assumes 'id' column in target table
   */
  private detectForeignKey(
    columnName: string,
    currentTable: string,
    allTables: string[]
  ): ForeignKeyInfo | null {
    const lowerName = columnName.toLowerCase()

    // Check for _id or _fk suffix
    let targetTable: string | null = null

    if (lowerName.endsWith('_id')) {
      targetTable = columnName.slice(0, -3) // Remove '_id'
    } else if (lowerName.endsWith('_fk')) {
      targetTable = columnName.slice(0, -3) // Remove '_fk'
    }

    if (!targetTable) return null

    // Skip if it's the same table's id (likely primary key)
    if (targetTable.toLowerCase() === currentTable.toLowerCase()) {
      return null
    }

    // Check if target table exists (case-insensitive)
    const matchedTable = allTables.find(
      t => t.toLowerCase() === targetTable!.toLowerCase() ||
           t.toLowerCase() === `${targetTable!.toLowerCase()}s` // Plural form
    )

    if (!matchedTable) return null

    return {
      column: columnName,
      refTable: matchedTable,
      refColumn: 'id'
    }
  }
}

/**
 * Create a schema analyzer instance
 */
export function createSchemaAnalyzer(queryExecutor: IQueryExecutor): SchemaAnalyzer {
  return new SchemaAnalyzer(queryExecutor)
}
