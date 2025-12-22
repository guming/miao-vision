/**
 * BoxPlot Component Types
 *
 * Types for displaying statistical distribution with quartiles.
 */

/**
 * Configuration for the BoxPlot component
 */
export interface BoxPlotConfig {
  /** Query name providing the data */
  data: string
  /** Column containing numeric values */
  valueColumn: string
  /** Optional column for grouping into multiple box plots */
  groupColumn?: string
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Chart height in pixels */
  height?: number
  /** Box color */
  color?: string
  /** Show outliers */
  showOutliers?: boolean
  /** Outlier IQR multiplier (default: 1.5) */
  outlierMultiplier?: number
  /** Show mean marker */
  showMean?: boolean
  /** Orientation: 'horizontal' or 'vertical' */
  orientation?: 'horizontal' | 'vertical'
  /** Value format: 'number', 'currency', 'percent' */
  valueFormat?: 'number' | 'currency' | 'percent'
  /** Currency symbol for currency format */
  currencySymbol?: string
  /** Show value labels */
  showLabels?: boolean
  /** Custom CSS class */
  class?: string
}

/**
 * Statistics for a single box plot
 */
export interface BoxPlotStats {
  /** Group name/label */
  group: string
  /** Minimum value (excluding outliers) */
  min: number
  /** First quartile (25th percentile) */
  q1: number
  /** Median (50th percentile) */
  median: number
  /** Third quartile (75th percentile) */
  q3: number
  /** Maximum value (excluding outliers) */
  max: number
  /** Mean/average value */
  mean: number
  /** Interquartile range (Q3 - Q1) */
  iqr: number
  /** Lower fence (Q1 - 1.5 * IQR) */
  lowerFence: number
  /** Upper fence (Q3 + 1.5 * IQR) */
  upperFence: number
  /** Outlier values below lower fence */
  lowerOutliers: number[]
  /** Outlier values above upper fence */
  upperOutliers: number[]
  /** Total count of values */
  count: number
}

/**
 * Processed box plot data for rendering
 */
export interface BoxPlotData {
  /** Box plot statistics for each group */
  boxes: BoxPlotStats[]
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Global minimum value (for scaling) */
  globalMin: number
  /** Global maximum value (for scaling) */
  globalMax: number
  /** Configuration */
  config: BoxPlotConfig
}
