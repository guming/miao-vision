/**
 * Area Chart Types
 */

export interface AreaChartConfig {
  data: string
  x: string
  y: string
  group?: string
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
  showLine?: boolean
  curve?: 'linear' | 'monotone' | 'step' | 'basis'
  fillOpacity?: number
  strokeWidth?: number
  stacked?: boolean
  valueFormat?: 'number' | 'currency' | 'percent'
  currencySymbol?: string
  class?: string
}

export interface AreaPoint {
  x: number | string
  y: number
  y0: number  // Baseline y (for stacking)
  xValue: number | string
  yValue: number
  formatted: string
  group?: string
}

export interface AreaSeries {
  id: string
  label: string
  points: AreaPoint[]
  color: string
  areaPath: string  // SVG path for filled area
  linePath: string  // SVG path for line
}

export interface AreaChartData {
  config: AreaChartConfig
  series: AreaSeries[]
  xValues: (number | string)[]
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  xIsNumeric: boolean
}
