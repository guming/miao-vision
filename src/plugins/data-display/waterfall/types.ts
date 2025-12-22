/**
 * Waterfall Chart Component Types
 *
 * Types for displaying incremental changes in values.
 */

/**
 * Configuration for the Waterfall component
 */
export interface WaterfallConfig {
  /** Query name providing the data */
  data: string
  /** Column containing labels */
  labelColumn: string
  /** Column containing values */
  valueColumn: string
  /** Column indicating if row is a total (optional) */
  totalColumn?: string
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Chart height in pixels */
  height?: number
  /** Color for positive values */
  positiveColor?: string
  /** Color for negative values */
  negativeColor?: string
  /** Color for total bars */
  totalColor?: string
  /** Value format: 'number', 'currency', 'percent' */
  valueFormat?: 'number' | 'currency' | 'percent'
  /** Currency symbol for currency format */
  currencySymbol?: string
  /** Show value labels on bars */
  showLabels?: boolean
  /** Show connecting lines between bars */
  showConnectors?: boolean
  /** Orientation: 'vertical' or 'horizontal' */
  orientation?: 'vertical' | 'horizontal'
  /** Custom CSS class */
  class?: string
}

/**
 * Bar type in waterfall chart
 */
export type WaterfallBarType = 'increase' | 'decrease' | 'total'

/**
 * A single bar in the waterfall chart
 */
export interface WaterfallBar {
  /** Unique identifier */
  id: string
  /** Label for this bar */
  label: string
  /** Raw value (positive or negative) */
  value: number
  /** Formatted value */
  formattedValue: string
  /** Start position (cumulative before this bar) */
  start: number
  /** End position (cumulative after this bar) */
  end: number
  /** Bar type */
  type: WaterfallBarType
  /** Color for this bar */
  color: string
}

/**
 * Processed waterfall data for rendering
 */
export interface WaterfallData {
  /** Waterfall bars */
  bars: WaterfallBar[]
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Minimum value (for scale) */
  minValue: number
  /** Maximum value (for scale) */
  maxValue: number
  /** Configuration */
  config: WaterfallConfig
}
