/**
 * Delta Component Types
 *
 * Display inline comparison indicators showing value changes
 */

/**
 * Configuration for Delta component
 */
export interface DeltaConfig {
  /** SQL query name providing the data */
  data: string
  /** Column name containing the current value */
  column: string
  /** Column name for comparison value (optional - calculates difference) */
  comparison?: string
  /** Row index for current value (default: 0) */
  row?: number
  /** Row index for comparison value (default: 1 or same as row) */
  comparisonRow?: number
  /** Display format: 'absolute' shows raw difference, 'percent' shows percentage change */
  format?: 'absolute' | 'percent'
  /** Number of decimal places (default: 1) */
  decimals?: number
  /** Whether to show the delta symbol (+/-) */
  showSymbol?: boolean
  /** Whether to show the arrow indicator */
  showArrow?: boolean
  /** Whether positive values are "good" (green) - default true */
  positiveIsGood?: boolean
  /** Text to show when there's no change */
  neutralText?: string
  /** Prefix text (e.g., "vs last month") */
  prefix?: string
  /** Suffix text */
  suffix?: string
  /** Custom CSS class */
  class?: string
  /** Chip style: display as a pill/chip badge */
  chip?: boolean
}

/**
 * Data passed to Delta component
 */
export interface DeltaData {
  /** The calculated delta value */
  value: number | null
  /** Whether the delta is positive */
  isPositive: boolean
  /** Whether the delta is zero/neutral */
  isNeutral: boolean
  /** The formatted display string */
  formatted: string
  /** Original current value */
  currentValue: number | null
  /** Original comparison value */
  comparisonValue: number | null
  /** Configuration */
  config: DeltaConfig
}

/**
 * Direction of change
 */
export type DeltaDirection = 'up' | 'down' | 'neutral'
