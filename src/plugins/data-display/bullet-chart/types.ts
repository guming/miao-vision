/**
 * BulletChart Component Types
 *
 * Types for displaying values against targets and qualitative ranges.
 */

/**
 * Configuration for the BulletChart component
 */
export interface BulletChartConfig {
  /** Query name providing the data */
  data: string
  /** Column containing the actual/current value */
  valueColumn: string
  /** Column containing the target value */
  targetColumn?: string
  /** Column containing labels for each bullet */
  labelColumn?: string
  /** Minimum value on the scale */
  min?: number
  /** Maximum value on the scale */
  max?: number
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Chart height in pixels */
  height?: number
  /** Orientation: 'horizontal' or 'vertical' */
  orientation?: 'horizontal' | 'vertical'
  /** Value format: 'number', 'currency', 'percent' */
  valueFormat?: 'number' | 'currency' | 'percent'
  /** Currency symbol for currency format */
  currencySymbol?: string
  /** Show value labels */
  showValues?: boolean
  /** Show target marker */
  showTarget?: boolean
  /** Primary bar color */
  color?: string
  /** Qualitative range thresholds (percentages of max) */
  ranges?: number[]
  /** Colors for qualitative ranges (from poor to good) */
  rangeColors?: string[]
  /** Custom CSS class */
  class?: string
}

/**
 * A single bullet item
 */
export interface BulletItem {
  /** Unique identifier */
  id: string
  /** Label for this bullet */
  label: string
  /** Actual/current value */
  value: number
  /** Formatted value */
  formattedValue: string
  /** Target value */
  target?: number
  /** Formatted target */
  formattedTarget?: string
  /** Value as percentage of scale */
  valuePercent: number
  /** Target as percentage of scale */
  targetPercent?: number
}

/**
 * Processed bullet chart data for rendering
 */
export interface BulletChartData {
  /** Bullet items */
  items: BulletItem[]
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Minimum scale value */
  min: number
  /** Maximum scale value */
  max: number
  /** Qualitative range percentages */
  ranges: number[]
  /** Range colors */
  rangeColors: string[]
  /** Configuration */
  config: BulletChartConfig
}
