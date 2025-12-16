/**
 * Visualization Plugin
 *
 * Chart and visualization components using Mosaic/vgplot.
 */

// Re-export chart utilities
export { buildChartFromBlock, buildChartsFromBlocks, validateChartConfig } from './chart-builder'

// Re-export chart service from core
export { chartService } from '@core/shared/chart.service'
export {
  extractColumnInfo,
  generateChartTableName,
  prepareChartData,
  suggestChartAxes
} from './data-adapter'

/**
 * Chart types supported
 */
export const CHART_TYPES = ['chart', 'line', 'area', 'bar', 'scatter', 'histogram', 'pie'] as const
export type ChartType = typeof CHART_TYPES[number]
