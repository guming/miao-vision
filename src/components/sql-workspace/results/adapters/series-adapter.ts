/**
 * Series Data Adapter
 *
 * Transforms QueryResult into SeriesData for Bar, Line, Area charts.
 * This single adapter replaces separate adapters for each chart type.
 */

import type { QueryResult } from '@/types/database'
import type {
  ChartAdapter,
  BaseChartConfig,
  SeriesData
} from '../chart-types'

export interface SeriesChartConfig extends BaseChartConfig {
  type: 'bar' | 'line' | 'area'
}

export class SeriesDataAdapter implements ChartAdapter<SeriesChartConfig, SeriesData> {
  dataModel = 'series' as const

  validate(result: QueryResult, config: SeriesChartConfig): boolean {
    if (!result.data || result.data.length === 0) {
      console.warn('[SeriesAdapter] No data available')
      return false
    }

    if (!config.xColumn || config.yColumns.length === 0) {
      console.warn('[SeriesAdapter] Missing xColumn or yColumns')
      return false
    }

    const firstRow = result.data[0]
    if (!(config.xColumn in firstRow)) {
      console.warn(`[SeriesAdapter] xColumn "${config.xColumn}" not found`)
      return false
    }

    for (const yCol of config.yColumns) {
      if (!(yCol in firstRow)) {
        console.warn(`[SeriesAdapter] yColumn "${yCol}" not found`)
        return false
      }
    }

    return true
  }

  transform(result: QueryResult, config: SeriesChartConfig): SeriesData | null {
    if (!this.validate(result, config)) {
      return null
    }

    const agg = config.aggregation || 'none'

    // No aggregation: use raw data
    if (agg === 'none') {
      return this.transformRaw(result, config)
    }

    // With aggregation: group by X column
    return this.transformAggregated(result, config)
  }

  private transformRaw(result: QueryResult, config: SeriesChartConfig): SeriesData {
    const labels = result.data.map(row =>
      String(row[config.xColumn!] ?? 'null')
    )

    const datasets = config.yColumns.map(yCol => ({
      label: yCol,
      values: result.data.map(row => Number(row[yCol]) || 0)
    }))

    return { labels, datasets }
  }

  private transformAggregated(
    result: QueryResult,
    config: SeriesChartConfig
  ): SeriesData {
    const agg = config.aggregation!
    const grouped = new Map<string, { values: number[], count: number }>()

    // Group data by X column
    result.data.forEach(row => {
      const xVal = String(row[config.xColumn!] ?? 'null')
      if (!grouped.has(xVal)) {
        grouped.set(xVal, {
          values: config.yColumns.map(() => 0),
          count: 0
        })
      }

      const group = grouped.get(xVal)!
      group.count++

      config.yColumns.forEach((yCol, i) => {
        const yVal = Number(row[yCol]) || 0

        switch (agg) {
          case 'sum':
          case 'avg':
            group.values[i] += yVal
            break
          case 'count':
            group.values[i] = group.count
            break
          case 'max':
            group.values[i] = Math.max(group.values[i], yVal)
            break
          case 'min':
            group.values[i] = group.count === 1 ? yVal : Math.min(group.values[i], yVal)
            break
        }
      })
    })

    // Calculate averages
    if (agg === 'avg') {
      grouped.forEach(group => {
        group.values = group.values.map(v => v / group.count)
      })
    }

    // Convert to arrays
    const entries = Array.from(grouped.entries())
    const labels = entries.map(([label]) => label)
    const datasets = config.yColumns.map((yCol, i) => ({
      label: yCol,
      values: entries.map(([, data]) => data.values[i])
    }))

    return { labels, datasets }
  }

  suggestConfig(result: QueryResult): Partial<SeriesChartConfig> {
    // Auto-detect columns
    const categoricalCols = result.columns.filter(col =>
      typeof result.data[0]?.[col] === 'string'
    )
    const numericCols = result.columns.filter(col =>
      typeof result.data[0]?.[col] === 'number'
    )

    const xColumn = categoricalCols[0] || result.columns[0]
    const yColumns = numericCols.slice(0, 1)

    // Determine if aggregation is needed
    const xValues = result.data.map(row => row[xColumn])
    const hasDuplicates = new Set(xValues).size < xValues.length
    const aggregation = hasDuplicates ? 'sum' : 'none'

    return {
      xColumn,
      yColumns,
      aggregation: aggregation as any
    }
  }
}

/**
 * Singleton instance
 */
export const seriesAdapter = new SeriesDataAdapter()
