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
    'bar', 'line', 'area', 'scatter', 'histogram', 'heatmap'
  ])

  /**
   * Chart types requiring D3 fallback
   */
  private static readonly D3_FALLBACK = new Set([
    'pie', 'boxplot', 'funnel'
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
      const plotConfig: any[] = [
        mark,
        vg.width(config.width || 700),
        vg.height(config.height || 400)
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
      y: yEncoding
    }

    // Add grouping (color encoding)
    if (config.groupBy) {
      markOptions.fill = config.groupBy
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
   * Build generic vgplot chart (extensible for other chart types)
   *
   * @param result - Query result data
   * @param config - Chart configuration
   * @returns Chart spec with plot element and metadata
   */
  static async buildChart(
    result: QueryResult,
    config: ResultsChartConfig
  ): Promise<MosaicChartSpec> {
    const chartType = config.type

    // Only bar chart is implemented in this POC
    if (chartType === 'bar') {
      return this.buildBarChart(result, config)
    }

    // Future: Implement other chart types
    // - line, area, scatter, histogram, heatmap
    throw new Error(`Chart type "${chartType}" not yet implemented in vgplot adapter (POC: bar only)`)
  }

  /**
   * Get supported aggregation functions
   */
  static getSupportedAggregations(): string[] {
    return ['none', 'sum', 'avg', 'count', 'min', 'max']
  }
}
