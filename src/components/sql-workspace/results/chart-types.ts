/**
 * SQL Workspace Chart Type System
 *
 * Unified type definitions for chart adapters and plugin integration.
 */

import type { QueryResult } from '@/types/database'

/**
 * Chart data models (grouped by data structure)
 */
export type ChartDataModel =
  | 'series'       // Time series, categorical comparisons
  | 'correlation'  // X-Y relationships
  | 'distribution' // Statistical distributions
  | 'hierarchical' // Tree, flow, nested data
  | 'geospatial'   // Geographic data

/**
 * Base chart configuration
 */
export interface BaseChartConfig {
  type: string
  xColumn: string | null
  yColumns: string[]
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max'
  groupBy?: string
}

/**
 * Series data structure (for Bar, Line, Area)
 */
export interface SeriesData {
  labels: string[]
  datasets: Array<{
    label: string
    values: number[]
  }>
}

/**
 * Correlation data structure (for Scatter, Bubble, Heatmap)
 */
export interface CorrelationData {
  points: Array<{
    x: number
    y: number
    value?: number
    label?: string
  }>
  xRange: [number, number]
  yRange: [number, number]
}

/**
 * Distribution data structure (for Histogram, Boxplot)
 */
export interface DistributionData {
  bins: Array<{
    x0: number
    x1: number
    count: number
  }>
  statistics?: {
    min: number
    q1: number
    median: number
    q3: number
    max: number
    mean: number
    stddev: number
  }
}

/**
 * Chart adapter interface
 */
export interface ChartAdapter<TConfig extends BaseChartConfig, TData> {
  /**
   * Data model this adapter handles
   */
  dataModel: ChartDataModel

  /**
   * Validate if query result can be adapted
   */
  validate(result: QueryResult, config: TConfig): boolean

  /**
   * Transform query result to chart-specific data
   */
  transform(result: QueryResult, config: TConfig): TData | null

  /**
   * Get suggested config based on query result
   */
  suggestConfig?(result: QueryResult): Partial<TConfig>
}

/**
 * Chart component metadata
 */
export interface ChartComponentInfo {
  /**
   * Unique chart type identifier
   */
  type: string

  /**
   * Display name
   */
  label: string

  /**
   * Icon (emoji or SVG)
   */
  icon: string

  /**
   * Data model required
   */
  dataModel: ChartDataModel

  /**
   * Minimum required columns
   */
  minColumns: {
    x?: number
    y?: number
  }

  /**
   * Whether this chart supports aggregation
   */
  supportsAggregation: boolean

  /**
   * Component loader (for lazy loading)
   */
  load: () => Promise<any>

  /**
   * Adapter for data transformation
   */
  adapter: ChartAdapter<any, any>
}

/**
 * Chart registry for SQL Workspace
 */
export class SQLWorkspaceChartRegistry {
  private charts = new Map<string, ChartComponentInfo>()

  register(info: ChartComponentInfo) {
    this.charts.set(info.type, info)
  }

  get(type: string): ChartComponentInfo | undefined {
    return this.charts.get(type)
  }

  getAll(): ChartComponentInfo[] {
    return Array.from(this.charts.values())
  }

  /**
   * Get charts grouped by data model
   */
  getByDataModel(model: ChartDataModel): ChartComponentInfo[] {
    return this.getAll().filter(c => c.dataModel === model)
  }

  /**
   * Suggest compatible charts for query result
   */
  suggestCharts(result: QueryResult): ChartComponentInfo[] {
    const numericCols = result.columns.filter(col =>
      typeof result.data[0]?.[col] === 'number'
    )
    const categoricalCols = result.columns.filter(col =>
      typeof result.data[0]?.[col] === 'string'
    )

    return this.getAll().filter(chart => {
      const { minColumns } = chart
      return (
        (!minColumns.x || categoricalCols.length >= minColumns.x) &&
        (!minColumns.y || numericCols.length >= minColumns.y)
      )
    })
  }
}

/**
 * Global chart registry instance
 */
export const chartRegistry = new SQLWorkspaceChartRegistry()
