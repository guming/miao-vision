/**
 * Progress Bar Component Types
 */

export interface ProgressConfig {
  query: string           // SQL result name
  value: string           // Column for current value
  max?: string            // Column for max value (or fixed number)
  maxValue?: number       // Fixed max value (default: 100)
  label?: string          // Display label
  format?: string         // Format type (percent, number, currency)
  color?: string          // Bar color (green, blue, red, purple, orange)
  size?: 'sm' | 'md' | 'lg'  // Bar size (default: md)
  showValue?: boolean     // Show value text (default: true)
  showPercent?: boolean   // Show percentage (default: true)
  animated?: boolean      // Animate bar on load (default: true)
}

export interface ProgressData {
  config: ProgressConfig
  value: number
  max: number
  percent: number
  formatted: string
  label?: string
}
