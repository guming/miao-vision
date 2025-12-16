/**
 * Sparkline / Mini Chart Component Types
 */

export type SparklineType = 'line' | 'bar' | 'area' | 'winloss' | 'bullet'

export interface SparklineConfig {
  query?: string          // SQL result name (optional for static mode)
  value?: string          // Column name for y values
  values?: number[]       // Static values array
  type?: SparklineType    // Chart type (default: line)
  color?: string          // Line/bar color (default: #667eea)
  positiveColor?: string  // Color for positive values in winloss (default: #10B981)
  negativeColor?: string  // Color for negative values in winloss (default: #EF4444)
  height?: number         // Height in pixels (default: 32)
  width?: number          // Width in pixels (default: 100)
  showDots?: boolean      // Show data point dots (default: false)
  showMinMax?: boolean    // Highlight min/max points (default: false)
  showLast?: boolean      // Show last value label (default: false)
  animate?: boolean       // Enable animation (default: true)

  // Reference line
  referenceLine?: number | 'avg' | 'median'  // Show reference line
  referenceColor?: string // Reference line color (default: #6B7280)

  // Target range (for bullet chart or band)
  targetValue?: number    // Target value (for bullet chart)
  bandLow?: number        // Low range band
  bandHigh?: number       // High range band
  bandColor?: string      // Band fill color (default: rgba(107, 114, 128, 0.2))

  // Formatting
  format?: string         // Value format for label (number, currency, percent)
  label?: string          // Chart label/title
}

export interface SparklineData {
  config: SparklineConfig
  values: number[]
  min: number
  max: number
  minIndex: number
  maxIndex: number
  avg: number
  median: number
  last: number
  lastFormatted: string
}
