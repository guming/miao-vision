/**
 * Chart Data Adapter
 *
 * Utilities for preparing and validating data for chart rendering.
 * - Column type inference
 * - Chart axis suggestion
 * - Data validation
 */

import type { QueryResult } from '@/types/database'
import type { ColumnInfo } from '@/types/chart'
import { loadDataIntoTable } from '@/lib/database'

/**
 * Infer data type from sample values
 */
function inferColumnType(values: any[]): 'number' | 'string' | 'date' | 'unknown' {
  if (values.length === 0) return 'unknown'

  // Sample first few non-null values
  const samples = values.filter(v => v !== null && v !== undefined).slice(0, 10)
  if (samples.length === 0) return 'unknown'

  // Check if all are numbers
  const allNumbers = samples.every(v => typeof v === 'number' || !isNaN(Number(v)))
  if (allNumbers) return 'number'

  // Check if looks like dates
  const allDates = samples.every(v => {
    if (v instanceof Date) return true
    if (typeof v === 'string') {
      const date = new Date(v)
      return !isNaN(date.getTime())
    }
    return false
  })
  if (allDates) return 'date'

  // Default to string
  return 'string'
}

/**
 * Extract column information from query result
 */
export function extractColumnInfo(result: QueryResult): ColumnInfo[] {
  return result.columns.map(colName => {
    const values = result.data.map(row => row[colName])
    const type = inferColumnType(values)
    const sample = values.filter(v => v !== null && v !== undefined).slice(0, 5)

    return {
      name: colName,
      type,
      sample
    }
  })
}

/**
 * Generate a unique table name for chart data
 */
export function generateChartTableName(): string {
  return `chart_data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Prepare query result for charting
 * - Extracts column information
 * - Loads data into a temporary DuckDB table
 * - Returns table name and column info
 */
export async function prepareChartData(result: QueryResult): Promise<{
  tableName: string
  columns: ColumnInfo[]
}> {
  try {
    // Generate unique table name
    const tableName = generateChartTableName()

    // Extract column information
    const columns = extractColumnInfo(result)

    // Load data into DuckDB table for vgplot
    await loadDataIntoTable(tableName, result.data, result.columns)

    console.log(`Chart data prepared: ${tableName}`, {
      rows: result.data.length,
      columns: columns.length
    })

    return {
      tableName,
      columns
    }
  } catch (error) {
    console.error('Failed to prepare chart data:', error)
    throw error
  }
}

/**
 * Validate chart configuration against available columns
 */
export function validateChartConfig(
  xColumn: string,
  yColumn: string,
  availableColumns: ColumnInfo[]
): { valid: boolean; error?: string } {
  const columnNames = availableColumns.map(c => c.name)

  if (!columnNames.includes(xColumn)) {
    return {
      valid: false,
      error: `X axis column "${xColumn}" not found`
    }
  }

  if (!columnNames.includes(yColumn)) {
    return {
      valid: false,
      error: `Y axis column "${yColumn}" not found`
    }
  }

  return { valid: true }
}

/**
 * Suggest appropriate chart axes based on column types
 */
export function suggestChartAxes(columns: ColumnInfo[]): {
  xAxis?: string
  yAxis?: string
} {
  const numericCols = columns.filter(c => c.type === 'number')
  const categoricalCols = columns.filter(c => c.type === 'string' || c.type === 'date')

  // Common pattern: categorical X, numeric Y
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    return {
      xAxis: categoricalCols[0].name,
      yAxis: numericCols[0].name
    }
  }

  // If only numeric columns, use first two
  if (numericCols.length >= 2) {
    return {
      xAxis: numericCols[0].name,
      yAxis: numericCols[1].name
    }
  }

  // If only one numeric, try to find any other column
  if (numericCols.length === 1 && columns.length >= 2) {
    const otherCol = columns.find(c => c.name !== numericCols[0].name)
    return {
      xAxis: otherCol?.name,
      yAxis: numericCols[0].name
    }
  }

  // Fallback to first two columns
  if (columns.length >= 2) {
    return {
      xAxis: columns[0].name,
      yAxis: columns[1].name
    }
  }

  return {}
}
