/**
 * Scatter Chart Types
 */

export interface ScatterChartConfig {
  data: string
  x: string
  y: string
  group?: string
  size?: string  // Column for point size
  title?: string
  subtitle?: string
  xLabel?: string
  yLabel?: string
  width?: number
  height?: number
  color?: string
  colors?: string[]
  showLabels?: boolean
  showLegend?: boolean
  showGrid?: boolean
  pointRadius?: number
  pointOpacity?: number
  valueFormat?: 'number' | 'currency' | 'percent'
  currencySymbol?: string
  class?: string
}

export interface ScatterPoint {
  x: number
  y: number
  size: number
  xValue: number
  yValue: number
  sizeValue?: number
  formatted: string
  group?: string
  color: string
}

export interface ScatterChartData {
  config: ScatterChartConfig
  points: ScatterPoint[]
  groups: string[]
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}
