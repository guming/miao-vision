/**
 * Heatmap Component Types
 *
 * Display matrix data as colored cells (correlation matrices, pivot tables).
 */

/**
 * Configuration for Heatmap component
 */
export interface HeatmapConfig {
  /** Data source query name */
  data: string

  /** Column for X-axis labels (columns) */
  xColumn: string

  /** Column for Y-axis labels (rows) */
  yColumn: string

  /** Column containing the values */
  valueColumn: string

  /** Chart title */
  title?: string

  /** Chart subtitle */
  subtitle?: string

  /** Cell width in pixels */
  cellWidth?: number

  /** Cell height in pixels */
  cellHeight?: number

  /** Gap between cells in pixels */
  cellGap?: number

  /** Color for minimum values */
  minColor?: string

  /** Color for midpoint values (optional) */
  midColor?: string

  /** Color for maximum values */
  maxColor?: string

  /** Minimum value for scale (auto-calculated if not set) */
  min?: number

  /** Maximum value for scale (auto-calculated if not set) */
  max?: number

  /** Whether to show values in cells */
  showValues?: boolean

  /** Whether to show X-axis labels */
  showXLabels?: boolean

  /** Whether to show Y-axis labels */
  showYLabels?: boolean

  /** Whether to show color legend */
  showLegend?: boolean

  /** Value format type */
  valueFormat?: 'number' | 'currency' | 'percent'

  /** Currency symbol for currency format */
  currencySymbol?: string

  /** Number of decimal places */
  decimals?: number

  /** Whether to round corners on cells */
  roundedCorners?: boolean

  /** Additional CSS class */
  class?: string
}

/**
 * Single cell in the heatmap
 */
export interface HeatmapCell {
  /** Unique identifier */
  id: string

  /** X-axis label */
  xLabel: string

  /** Y-axis label */
  yLabel: string

  /** Raw value */
  value: number

  /** Normalized value (0-1) for color mapping */
  normalizedValue: number

  /** Computed background color */
  color: string

  /** Formatted value for display */
  formattedValue: string

  /** Row index */
  row: number

  /** Column index */
  col: number
}

/**
 * Processed data for Heatmap component
 */
export interface HeatmapData {
  /** All cells */
  cells: HeatmapCell[]

  /** X-axis labels (unique, ordered) */
  xLabels: string[]

  /** Y-axis labels (unique, ordered) */
  yLabels: string[]

  /** Chart title */
  title?: string

  /** Chart subtitle */
  subtitle?: string

  /** Scale min value */
  minValue: number

  /** Scale max value */
  maxValue: number

  /** Configuration reference */
  config: HeatmapConfig
}
