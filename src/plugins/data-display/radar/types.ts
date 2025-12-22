/**
 * Radar Chart Component Types
 *
 * Display multi-dimensional data on radial axes.
 */

/**
 * Configuration for Radar Chart component
 */
export interface RadarConfig {
  /** Data source query name */
  data: string

  /** Column for axis labels (dimensions) */
  labelColumn: string

  /** Column(s) for values - can be single or multiple series */
  valueColumn: string | string[]

  /** Column for series names when using multiple series */
  seriesColumn?: string

  /** Chart title */
  title?: string

  /** Chart subtitle */
  subtitle?: string

  /** Chart height in pixels */
  height?: number

  /** Maximum value for scale (auto-calculated if not set) */
  max?: number

  /** Minimum value for scale */
  min?: number

  /** Number of scale levels/rings */
  levels?: number

  /** Whether to fill the radar area */
  fill?: boolean

  /** Fill opacity (0-1) */
  fillOpacity?: number

  /** Stroke width for lines */
  strokeWidth?: number

  /** Whether to show dots at data points */
  showDots?: boolean

  /** Dot radius */
  dotRadius?: number

  /** Whether to show axis labels */
  showLabels?: boolean

  /** Whether to show value labels on hover */
  showValues?: boolean

  /** Whether to show the grid/web */
  showGrid?: boolean

  /** Color palette for series */
  colors?: string[]

  /** Grid line color */
  gridColor?: string

  /** Axis line color */
  axisColor?: string

  /** Label color */
  labelColor?: string

  /** Value format type */
  valueFormat?: 'number' | 'currency' | 'percent'

  /** Currency symbol for currency format */
  currencySymbol?: string

  /** Additional CSS class */
  class?: string
}

/**
 * Single axis/dimension in the radar
 */
export interface RadarAxis {
  /** Unique identifier */
  id: string

  /** Label for this axis */
  label: string

  /** Angle in radians */
  angle: number

  /** X coordinate of label position */
  labelX: number

  /** Y coordinate of label position */
  labelY: number

  /** Text anchor for label */
  anchor: 'start' | 'middle' | 'end'
}

/**
 * Single point in a radar series
 */
export interface RadarPoint {
  /** Axis id this point belongs to */
  axisId: string

  /** Raw value */
  value: number

  /** Normalized value (0-1) for plotting */
  normalizedValue: number

  /** X coordinate */
  x: number

  /** Y coordinate */
  y: number

  /** Formatted value for display */
  formattedValue: string
}

/**
 * A series of data points in the radar
 */
export interface RadarSeries {
  /** Series identifier */
  id: string

  /** Series name */
  name: string

  /** Color for this series */
  color: string

  /** Data points */
  points: RadarPoint[]

  /** Path for the polygon/area */
  path: string
}

/**
 * Grid level/ring
 */
export interface RadarGridLevel {
  /** Level number (0 = center, levels-1 = outer) */
  level: number

  /** Radius for this level */
  radius: number

  /** Value at this level */
  value: number

  /** Formatted value */
  formattedValue: string

  /** Path for the polygon at this level */
  path: string
}

/**
 * Processed data for Radar component
 */
export interface RadarData {
  /** Radar axes (dimensions) */
  axes: RadarAxis[]

  /** Data series */
  series: RadarSeries[]

  /** Grid levels */
  gridLevels: RadarGridLevel[]

  /** Chart title */
  title?: string

  /** Chart subtitle */
  subtitle?: string

  /** Center X coordinate */
  centerX: number

  /** Center Y coordinate */
  centerY: number

  /** Maximum radius */
  radius: number

  /** Scale min value */
  minValue: number

  /** Scale max value */
  maxValue: number

  /** Configuration reference */
  config: RadarConfig
}
