/**
 * Sparkline Component Types
 */

export interface SparklineConfig {
  query: string           // SQL result name to use as data source
  value: string           // Column name for y values
  type?: 'line' | 'bar' | 'area'  // Chart type (default: line)
  color?: string          // Line/bar color (default: #667eea)
  height?: number         // Height in pixels (default: 32)
  width?: number          // Width in pixels (default: 100)
  showDots?: boolean      // Show data point dots (default: false)
  showMinMax?: boolean    // Highlight min/max points (default: false)
  animate?: boolean       // Enable animation (default: true)
}

export interface SparklineData {
  config: SparklineConfig
  values: number[]
  min: number
  max: number
  minIndex: number
  maxIndex: number
}
