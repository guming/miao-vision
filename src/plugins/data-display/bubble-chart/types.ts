/**
 * Bubble Chart Component Types
 *
 * Types for displaying three-dimensional data using bubbles.
 */

/**
 * Configuration for the Bubble Chart component
 */
export interface BubbleChartConfig {
  /** Query name providing the data */
  data: string
  /** Column name for X-axis */
  x: string
  /** Column name for Y-axis */
  y: string
  /** Column name for bubble size */
  size: string
  /** Column name for bubble labels */
  label?: string
  /** Column name for grouping/coloring bubbles */
  group?: string
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** X-axis label */
  xLabel?: string
  /** Y-axis label */
  yLabel?: string
  /** Chart height in pixels */
  height?: number
  /** Chart width in pixels */
  width?: number
  /** Bubble color (single series) */
  color?: string
  /** Color palette for grouped bubbles */
  colors?: string[]
  /** Minimum bubble size in pixels */
  minBubbleSize?: number
  /** Maximum bubble size in pixels */
  maxBubbleSize?: number
  /** Show labels on bubbles */
  showLabels?: boolean
  /** Show legend for grouped bubbles */
  showLegend?: boolean
  /** Show grid lines */
  showGrid?: boolean
  /** Bubble opacity (0-1) */
  opacity?: number
  /** Show tooltips on hover */
  showTooltips?: boolean
  /** Value format: 'number', 'currency', 'percent' */
  valueFormat?: 'number' | 'currency' | 'percent'
  /** Currency symbol for currency format */
  currencySymbol?: string
  /** Custom CSS class */
  class?: string
}

/**
 * A single bubble in the chart
 */
export interface BubbleItem {
  /** Unique identifier */
  id: string
  /** X-axis value */
  x: number
  /** Y-axis value */
  y: number
  /** Size value (determines bubble radius) */
  size: number
  /** Bubble radius in pixels (calculated) */
  radius: number
  /** Label text */
  label?: string
  /** Group name */
  group?: string
  /** Bubble color */
  color: string
  /** Formatted values for display */
  formatted: {
    x: string
    y: string
    size: string
  }
}

/**
 * Processed bubble chart data for rendering
 */
export interface BubbleChartData {
  /** All bubbles */
  bubbles: BubbleItem[]
  /** Groups (for legend) */
  groups: string[]
  /** X-axis range */
  xRange: [number, number]
  /** Y-axis range */
  yRange: [number, number]
  /** Size range */
  sizeRange: [number, number]
  /** Configuration */
  config: BubbleChartConfig
}
