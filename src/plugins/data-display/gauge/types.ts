/**
 * Gauge Component Types
 *
 * Types for displaying values on a circular scale.
 */

/**
 * Configuration for the Gauge component
 */
export interface GaugeConfig {
  /** Query name providing the data */
  data: string
  /** Column containing the value to display */
  valueColumn: string
  /** Minimum value on the scale */
  min?: number
  /** Maximum value on the scale */
  max?: number
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Size in pixels */
  size?: number
  /** Gauge type: 'full', 'half', 'quarter' */
  type?: 'full' | 'half' | 'quarter'
  /** Value format: 'number', 'currency', 'percent' */
  valueFormat?: 'number' | 'currency' | 'percent'
  /** Currency symbol for currency format */
  currencySymbol?: string
  /** Decimal places for display */
  decimals?: number
  /** Show value label in center */
  showValue?: boolean
  /** Show min/max labels */
  showLimits?: boolean
  /** Color for filled portion */
  color?: string
  /** Background color for unfilled portion */
  backgroundColor?: string
  /** Thickness of the gauge arc */
  thickness?: number
  /** Color thresholds for gradient effect */
  thresholds?: GaugeThreshold[]
  /** Custom CSS class */
  class?: string
}

/**
 * Color threshold for gauge
 */
export interface GaugeThreshold {
  /** Value at which this color starts */
  value: number
  /** Color to use above this value */
  color: string
}

/**
 * Processed gauge data for rendering
 */
export interface GaugeData {
  /** Current value */
  value: number
  /** Formatted value for display */
  formattedValue: string
  /** Percentage of scale (0-100) */
  percent: number
  /** Minimum scale value */
  min: number
  /** Maximum scale value */
  max: number
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Computed color based on thresholds */
  color: string
  /** Configuration */
  config: GaugeConfig
}
