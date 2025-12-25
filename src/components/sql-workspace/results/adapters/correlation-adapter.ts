/**
 * Correlation Data Adapter
 *
 * Transforms QueryResult into CorrelationData for Scatter, Bubble, Heatmap charts.
 * Handles X-Y-Value three-dimensional data patterns.
 */

import type { QueryResult } from '@/types/database'
import type {
  ChartAdapter,
  BaseChartConfig,
  CorrelationData
} from '../chart-types'

export interface CorrelationChartConfig extends BaseChartConfig {
  type: 'scatter' | 'bubble' | 'heatmap'
  sizeColumn?: string  // For bubble charts
  labelColumn?: string // For point labels
}

export class CorrelationDataAdapter implements ChartAdapter<CorrelationChartConfig, CorrelationData> {
  dataModel = 'correlation' as const

  validate(result: QueryResult, config: CorrelationChartConfig): boolean {
    if (!result.data || result.data.length === 0) return false
    if (!config.xColumn || config.yColumns.length === 0) return false

    const firstRow = result.data[0]
    return config.xColumn in firstRow && config.yColumns[0] in firstRow
  }

  transform(result: QueryResult, config: CorrelationChartConfig): CorrelationData | null {
    if (!this.validate(result, config)) return null

    const points = result.data.map(row => {
      const x = Number(row[config.xColumn!]) || 0
      const y = Number(row[config.yColumns[0]]) || 0
      const value = config.sizeColumn ? Number(row[config.sizeColumn]) || 0 : undefined
      const label = config.labelColumn ? String(row[config.labelColumn]) : undefined

      return { x, y, value, label }
    })

    // Calculate ranges with 10% padding
    const xValues = points.map(p => p.x)
    const yValues = points.map(p => p.y)

    const xMin = Math.min(...xValues)
    const xMax = Math.max(...xValues)
    const yMin = Math.min(...yValues)
    const yMax = Math.max(...yValues)

    const xPadding = (xMax - xMin) * 0.1
    const yPadding = (yMax - yMin) * 0.1

    return {
      points,
      xRange: [xMin - xPadding, xMax + xPadding],
      yRange: [yMin - yPadding, yMax + yPadding]
    }
  }

  suggestConfig(result: QueryResult): Partial<CorrelationChartConfig> {
    const numericCols = result.columns.filter(col =>
      typeof result.data[0]?.[col] === 'number'
    )

    return {
      xColumn: numericCols[0] || result.columns[0],
      yColumns: numericCols[1] ? [numericCols[1]] : [],
      sizeColumn: numericCols[2]
    }
  }
}

export const correlationAdapter = new CorrelationDataAdapter()
