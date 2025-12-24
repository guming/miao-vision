/**
 * Results Panel Types
 *
 * Type definitions for the query results components.
 * Designed for extensibility and AI-friendly documentation.
 */

import type { QueryResult } from '@/types/database'

/**
 * View mode for the results panel
 */
export type ResultsViewMode = 'table' | 'chart' | 'stats'

/**
 * Column visibility configuration
 */
export interface ColumnVisibility {
  /** Column name */
  name: string
  /** Whether the column is visible */
  visible: boolean
  /** Column data type */
  type?: string
}

/**
 * Sort configuration for table
 */
export interface SortConfig {
  /** Column to sort by */
  column: string | null
  /** Sort direction */
  direction: 'asc' | 'desc'
}

/**
 * Filter configuration for table
 */
export interface FilterConfig {
  /** Search query string */
  searchQuery: string
  /** Column-specific filters */
  columnFilters: Record<string, string>
}

/**
 * Column statistics for a single column
 */
export interface ColumnStatistics {
  /** Column name */
  name: string
  /** Column data type */
  type: 'number' | 'string' | 'date' | 'boolean' | 'unknown'
  /** Total non-null values */
  total: number
  /** Unique values count */
  unique: number
  /** Null values count */
  nulls: number
  /** Fill rate (percentage of non-null values) */
  fillRate: number
  /** For numeric columns: minimum value */
  min?: number
  /** For numeric columns: maximum value */
  max?: number
  /** For numeric columns: average value */
  avg?: number
  /** For numeric columns: sum of all values */
  sum?: number
  /** For numeric columns: median (P50) */
  median?: number
  /** For numeric columns: 25th percentile */
  p25?: number
  /** For numeric columns: 75th percentile */
  p75?: number
  /** For numeric columns: standard deviation */
  stdDev?: number
  /** For date columns: earliest date */
  minDate?: string
  /** For date columns: latest date */
  maxDate?: string
  /** For categorical columns: value distribution (top N) */
  distribution?: Array<{ value: string; count: number; percentage: number }>
}

/**
 * Chart configuration for results visualization
 */
export interface ResultsChartConfig {
  /** Chart type */
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram'
  /** X-axis column */
  xColumn: string | null
  /** Y-axis column(s) */
  yColumns: string[]
  /** Group by column (for stacked/grouped charts) */
  groupColumn?: string
  /** Group by column (alias for groupColumn, used by vgplot) */
  groupBy?: string
  /** Aggregation function */
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none'
  /** Chart width */
  width?: number
  /** Chart height */
  height?: number
  /** Chart title */
  title?: string
  /** X-axis label */
  xLabel?: string
  /** Y-axis label */
  yLabel?: string
  /** Sort order */
  sort?: 'desc' | 'asc' | 'none'
  /** Show grid lines */
  showGrid?: boolean
}

/**
 * Results panel state
 */
export interface ResultsPanelState {
  /** Current view mode */
  viewMode: ResultsViewMode
  /** Column visibility settings */
  columnVisibility: ColumnVisibility[]
  /** Sort configuration */
  sort: SortConfig
  /** Filter configuration */
  filter: FilterConfig
  /** Pagination settings */
  pagination: {
    page: number
    pageSize: number
  }
  /** Chart configuration (when in chart mode) */
  chartConfig: ResultsChartConfig
  /** Whether stats modal is open */
  statsModalOpen: boolean
}

/**
 * Utility: Infer column type from values
 */
export function inferColumnType(values: unknown[]): ColumnStatistics['type'] {
  const nonNullValues = values.filter(v => v !== null && v !== undefined)
  if (nonNullValues.length === 0) return 'unknown'

  const sample = nonNullValues[0]
  if (typeof sample === 'number') return 'number'
  if (typeof sample === 'boolean') return 'boolean'
  if (sample instanceof Date) return 'date'

  // Check if string looks like a date
  if (typeof sample === 'string') {
    const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/
    if (datePattern.test(sample)) return 'date'
  }

  return 'string'
}

/**
 * Utility: Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]

  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower

  if (upper >= sorted.length) return sorted[sorted.length - 1]
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

/**
 * Utility: Calculate column statistics
 */
export function calculateColumnStats(
  columnName: string,
  values: unknown[]
): ColumnStatistics {
  const type = inferColumnType(values)
  const nonNullValues = values.filter(v => v !== null && v !== undefined)
  const uniqueValues = new Set(nonNullValues.map(v => String(v)))

  const stats: ColumnStatistics = {
    name: columnName,
    type,
    total: nonNullValues.length,
    unique: uniqueValues.size,
    nulls: values.length - nonNullValues.length,
    fillRate: values.length > 0 ? (nonNullValues.length / values.length) * 100 : 0
  }

  // Numeric statistics
  if (type === 'number') {
    const numericValues = nonNullValues.filter(v => typeof v === 'number') as number[]
    if (numericValues.length > 0) {
      // Sort for percentile calculations
      const sorted = [...numericValues].sort((a, b) => a - b)

      stats.min = sorted[0]
      stats.max = sorted[sorted.length - 1]
      stats.sum = numericValues.reduce((a, b) => a + b, 0)
      stats.avg = stats.sum / numericValues.length

      // Percentiles
      stats.p25 = percentile(sorted, 25)
      stats.median = percentile(sorted, 50)
      stats.p75 = percentile(sorted, 75)

      // Standard deviation
      const mean = stats.avg
      const squaredDiffs = numericValues.map(v => Math.pow(v - mean, 2))
      stats.stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length)
    }
  }

  // Date statistics
  if (type === 'date') {
    const dateStrings = nonNullValues.map(v => String(v)).sort()
    if (dateStrings.length > 0) {
      stats.minDate = dateStrings[0]
      stats.maxDate = dateStrings[dateStrings.length - 1]
    }
  }

  // Distribution for categorical columns (string/boolean)
  if (type === 'string' || type === 'boolean') {
    const counts = new Map<string, number>()
    nonNullValues.forEach(v => {
      const key = String(v)
      counts.set(key, (counts.get(key) || 0) + 1)
    })

    // Sort by count descending, take top 10
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    stats.distribution = sorted.map(([value, count]) => ({
      value,
      count,
      percentage: nonNullValues.length > 0 ? (count / nonNullValues.length) * 100 : 0
    }))
  }

  return stats
}

/**
 * Utility: Calculate all column statistics for a query result
 */
export function calculateAllColumnStats(result: QueryResult): ColumnStatistics[] {
  return result.columns.map(columnName => {
    const values = result.data.map(row => row[columnName])
    return calculateColumnStats(columnName, values)
  })
}
