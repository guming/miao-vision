/**
 * Mosaic vgplot Adapter for SQL Workspace
 *
 * Proof of Concept: Bar Chart implementation
 * Converts QueryResult → DuckDB table → vgplot spec
 */

import * as vg from '@uwdata/vgplot'
import { prepareChartData } from '@plugins/viz/data-adapter'
import type { QueryResult } from '@/types/database'
import type { ResultsChartConfig } from './types'

/**
 * Chart spec result
 */
export interface MosaicChartSpec {
  plot: HTMLElement | SVGSVGElement
  tableName: string
  renderTime: number
}

/**
 * Mosaic vgplot adapter for SQL Workspace
 */
export class MosaicChartAdapter {
  /**
   * Chart types supported by vgplot
   */
  private static readonly VGPLOT_SUPPORTED = new Set([
    'bar', 'line', 'scatter', 'histogram'
  ])

  /**
   * Chart types requiring D3 fallback (keep Pie in custom SVG for now)
   */
  private static readonly D3_FALLBACK = new Set([
    'pie'
  ])

  /**
   * Check if chart type is supported by vgplot
   */
  static isVgplotSupported(type: string): boolean {
    return this.VGPLOT_SUPPORTED.has(type)
  }

  /**
   * Check if chart type requires D3 fallback
   */
  static requiresD3Fallback(type: string): boolean {
    return this.D3_FALLBACK.has(type)
  }

  /**
   * Build Bar Chart using vgplot
   *
   * @param result - Query result data
   * @param config - Chart configuration
   * @returns Chart spec with plot element and metadata
   */
  static async buildBarChart(
    result: QueryResult,
    config: ResultsChartConfig
  ): Promise<MosaicChartSpec> {
    const startTime = performance.now()

    try {
      console.log('[MosaicAdapter] Building Bar Chart...')
      console.log('[MosaicAdapter] Data rows:', result.data.length)
      console.log('[MosaicAdapter] Config:', config)

      // Step 1: Load data into DuckDB table
      const { tableName, columns } = await prepareChartData(result)
      console.log('[MosaicAdapter] Data loaded to table:', tableName)
      console.log('[MosaicAdapter] Columns:', columns)

      // Step 2: Build vgplot mark
      const mark = this.buildBarMark(tableName, config)

      // Step 3: Build plot configuration
      const plotConfig = this.buildPlotConfig(mark, config)

      // Step 4: Create plot
      const plot = vg.plot(...plotConfig)

      const renderTime = performance.now() - startTime
      console.log(`[MosaicAdapter] Bar Chart rendered in ${renderTime.toFixed(2)}ms`)

      return {
        plot,
        tableName,
        renderTime
      }
    } catch (error) {
      console.error('[MosaicAdapter] Failed to build Bar Chart:', error)
      throw error
    }
  }

  /**
   * Build vgplot bar mark
   */
  private static buildBarMark(tableName: string, config: ResultsChartConfig): any {
    const source = vg.from(tableName)
    const xColumn = config.xColumn!
    const yColumn = config.yColumns[0]
    const aggregation = config.aggregation || 'none'

    // Build y encoding based on aggregation
    let yEncoding: any

    switch (aggregation) {
      case 'sum':
        yEncoding = vg.sum(yColumn)
        break
      case 'avg':
        yEncoding = vg.avg(yColumn)
        break
      case 'count':
        yEncoding = vg.count()
        break
      case 'min':
        yEncoding = vg.min(yColumn)
        break
      case 'max':
        yEncoding = vg.max(yColumn)
        break
      case 'none':
      default:
        yEncoding = yColumn
        break
    }

    // Build mark options
    const markOptions: any = {
      x: xColumn,
      y: yEncoding,
      fill: config.groupBy || '#8B5CF6'  // Default purple color if no grouping
    }

    // Add sorting if configured
    if (config.sort && config.sort !== 'none') {
      markOptions.sort = {
        x: config.sort === 'desc' ? '-y' : 'y'
      }
    }

    console.log('[MosaicAdapter] Bar mark options:', markOptions)

    return vg.barY(source, markOptions)
  }

  /**
   * Build vgplot line mark
   */
  private static buildLineMark(tableName: string, config: ResultsChartConfig): any {
    const source = vg.from(tableName)
    const xColumn = config.xColumn!
    const yColumn = config.yColumns[0]
    const aggregation = config.aggregation || 'none'

    let yEncoding: any
    switch (aggregation) {
      case 'sum': yEncoding = vg.sum(yColumn); break
      case 'avg': yEncoding = vg.avg(yColumn); break
      case 'count': yEncoding = vg.count(); break
      case 'min': yEncoding = vg.min(yColumn); break
      case 'max': yEncoding = vg.max(yColumn); break
      default: yEncoding = yColumn
    }

    const markOptions: any = {
      x: xColumn,
      y: yEncoding,
      stroke: config.groupBy || '#8B5CF6',  // Default purple color
      strokeWidth: 2
    }

    return vg.lineY(source, markOptions)
  }

  /**
   * Build vgplot area mark
   */
  private static buildAreaMark(tableName: string, config: ResultsChartConfig): any {
    const source = vg.from(tableName)
    const xColumn = config.xColumn!
    const yColumn = config.yColumns[0]
    const aggregation = config.aggregation || 'none'

    let yEncoding: any
    switch (aggregation) {
      case 'sum': yEncoding = vg.sum(yColumn); break
      case 'avg': yEncoding = vg.avg(yColumn); break
      case 'count': yEncoding = vg.count(); break
      case 'min': yEncoding = vg.min(yColumn); break
      case 'max': yEncoding = vg.max(yColumn); break
      default: yEncoding = yColumn
    }

    const markOptions: any = {
      x: xColumn,
      y: yEncoding,
      fill: config.groupBy || '#4285F4',
      fillOpacity: 0.7
    }

    return vg.areaY(source, markOptions)
  }

  /**
   * Build vgplot scatter mark
   */
  private static buildScatterMark(tableName: string, config: ResultsChartConfig): any {
    const source = vg.from(tableName)
    const xColumn = config.xColumn!
    const yColumn = config.yColumns[0]

    const markOptions: any = {
      x: xColumn,
      y: yColumn,
      fill: config.groupBy || '#8B5CF6',  // Default purple color
      r: 4  // Point radius
    }

    return vg.dot(source, markOptions)
  }

  /**
   * Build vgplot histogram mark
   */
  private static buildHistogramMark(tableName: string, config: ResultsChartConfig): any {
    const source = vg.from(tableName)
    const xColumn = config.xColumn!

    const markOptions: any = {
      x: vg.bin(xColumn, { thresholds: 20 }),
      y: vg.count(),
      fill: '#8B5CF6'  // Default purple color
    }

    return vg.rectY(source, markOptions)
  }

  /**
   * Build common plot configuration
   */
  private static buildPlotConfig(mark: any, config: ResultsChartConfig): any[] {
    const plotConfig: any[] = [
      mark,
      vg.width(config.width || 700),
      vg.height(config.height || 400),
      // Add margins for better spacing
      vg.marginLeft(60),
      vg.marginRight(30),
      vg.marginTop(40),
      vg.marginBottom(60)
    ]

    // Add title
    if (config.title) {
      plotConfig.push(
        vg.text([config.title], {
          fontSize: 16,
          fontWeight: 600,
          frameAnchor: 'top',
          dy: -10
        })
      )
    }

    // Add axis labels
    if (config.xLabel || config.xColumn) {
      plotConfig.push(vg.xLabel(config.xLabel || config.xColumn))
    }
    if (config.yLabel || config.yColumns[0]) {
      plotConfig.push(vg.yLabel(config.yLabel || config.yColumns[0]))
    }

    // Add grid
    if (config.showGrid !== false) {
      plotConfig.push(vg.grid(true))
    }

    // Configure Y-axis tick format to avoid scientific notation and format large numbers
    plotConfig.push(
      vg.yTickFormat('~s')  // SI-prefix format (1k, 1M, etc.)
    )

    return plotConfig
  }

  /**
   * Build Line Chart using vgplot
   */
  static async buildLineChart(
    result: QueryResult,
    config: ResultsChartConfig
  ): Promise<MosaicChartSpec> {
    const startTime = performance.now()

    try {
      console.log('[MosaicAdapter] Building Line Chart...')

      const { tableName } = await prepareChartData(result)
      const mark = this.buildLineMark(tableName, config)
      const plotConfig = this.buildPlotConfig(mark, config)
      const plot = vg.plot(...plotConfig)

      const renderTime = performance.now() - startTime
      console.log(`[MosaicAdapter] Line Chart rendered in ${renderTime.toFixed(2)}ms`)

      return { plot, tableName, renderTime }
    } catch (error) {
      console.error('[MosaicAdapter] Failed to build Line Chart:', error)
      throw error
    }
  }

  /**
   * Build Area Chart using vgplot
   */
  static async buildAreaChart(
    result: QueryResult,
    config: ResultsChartConfig
  ): Promise<MosaicChartSpec> {
    const startTime = performance.now()

    try {
      console.log('[MosaicAdapter] Building Area Chart...')

      const { tableName } = await prepareChartData(result)
      const mark = this.buildAreaMark(tableName, config)
      const plotConfig = this.buildPlotConfig(mark, config)
      const plot = vg.plot(...plotConfig)

      const renderTime = performance.now() - startTime
      console.log(`[MosaicAdapter] Area Chart rendered in ${renderTime.toFixed(2)}ms`)

      return { plot, tableName, renderTime }
    } catch (error) {
      console.error('[MosaicAdapter] Failed to build Area Chart:', error)
      throw error
    }
  }

  /**
   * Build Scatter Chart using vgplot
   */
  static async buildScatterChart(
    result: QueryResult,
    config: ResultsChartConfig
  ): Promise<MosaicChartSpec> {
    const startTime = performance.now()

    try {
      console.log('[MosaicAdapter] Building Scatter Chart...')

      const { tableName } = await prepareChartData(result)
      const mark = this.buildScatterMark(tableName, config)
      const plotConfig = this.buildPlotConfig(mark, config)
      const plot = vg.plot(...plotConfig)

      const renderTime = performance.now() - startTime
      console.log(`[MosaicAdapter] Scatter Chart rendered in ${renderTime.toFixed(2)}ms`)

      return { plot, tableName, renderTime }
    } catch (error) {
      console.error('[MosaicAdapter] Failed to build Scatter Chart:', error)
      throw error
    }
  }

  /**
   * Build Histogram using vgplot
   */
  static async buildHistogram(
    result: QueryResult,
    config: ResultsChartConfig
  ): Promise<MosaicChartSpec> {
    const startTime = performance.now()

    try {
      console.log('[MosaicAdapter] Building Histogram...')

      const { tableName } = await prepareChartData(result)
      const mark = this.buildHistogramMark(tableName, config)
      const plotConfig = this.buildPlotConfig(mark, config)
      const plot = vg.plot(...plotConfig)

      const renderTime = performance.now() - startTime
      console.log(`[MosaicAdapter] Histogram rendered in ${renderTime.toFixed(2)}ms`)

      return { plot, tableName, renderTime }
    } catch (error) {
      console.error('[MosaicAdapter] Failed to build Histogram:', error)
      throw error
    }
  }

  /**
   * Build generic vgplot chart (router for all chart types)
   *
   * @param result - Query result data
   * @param config - Chart configuration
   * @returns Chart spec with plot element and metadata
   */
  static async buildChart(
    result: QueryResult,
    config: ResultsChartConfig
  ): Promise<MosaicChartSpec> {
    switch (config.type) {
      case 'bar':
        return this.buildBarChart(result, config)
      case 'line':
        return this.buildLineChart(result, config)
      case 'scatter':
        return this.buildScatterChart(result, config)
      case 'histogram':
        return this.buildHistogram(result, config)
      default:
        throw new Error(`Chart type "${config.type}" not supported by vgplot adapter`)
    }
  }

  /**
   * Get supported aggregation functions
   */
  static getSupportedAggregations(): string[] {
    return ['none', 'sum', 'avg', 'count', 'min', 'max']
  }
}
