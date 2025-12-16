/**
 * Chart Types and Configuration
 *
 * Defines types for vgplot chart integration
 */

/**
 * Supported chart types
 */
export type ChartType = 'bar' | 'line' | 'scatter' | 'histogram' | 'area' | 'pie' | 'boxplot' | 'heatmap' | 'funnel'

/**
 * Chart data configuration
 */
export interface ChartDataConfig {
  /** DuckDB table name or query result */
  table: string
  /** Column name for X axis */
  x: string
  /** Column name for Y axis (not required for histogram) */
  y?: string
  /** Optional: Column for grouping/coloring */
  group?: string
}

/**
 * Chart display options
 */
export interface ChartOptions {
  /** Chart width in pixels */
  width?: number
  /** Chart height in pixels */
  height?: number
  /** Chart title */
  title?: string
  /** X axis label */
  xLabel?: string
  /** Y axis label */
  yLabel?: string
  /** Show grid lines */
  grid?: boolean
  /** Enable tooltips */
  tooltip?: boolean
  /** Number of bins (for histogram) */
  bins?: number
  /** Fill opacity for area charts (0-1, default: 0.7) */
  fillOpacity?: number
  /** Curve type for line/area charts */
  curve?: 'linear' | 'step' | 'basis' | 'monotone'
  /** Stack multiple series (for area charts) */
  stacked?: boolean
  /** Normalize to 100% (for stacked area charts) */
  normalized?: boolean
  /** X axis scale type (use 'point' to suppress date warnings for categorical data) */
  xScaleType?: 'point' | 'linear' | 'log' | 'sqrt' | 'time' | 'utc'
  /** Inner radius for pie/donut chart (0 = pie, >0 = donut) */
  innerRadius?: number
  /** Outer radius for pie chart */
  outerRadius?: number
  /** Pad angle between slices (in radians) */
  padAngle?: number
  /** Corner radius for pie slices */
  cornerRadius?: number
  /** Show labels on pie chart */
  showLabels?: boolean
  /** Show percentages on pie chart */
  showPercentages?: boolean
  /** Color encoding column for heatmap */
  color?: string
}

/**
 * Complete chart configuration
 */
export interface ChartConfig {
  /** Chart type */
  type: ChartType
  /** Data configuration */
  data: ChartDataConfig
  /** Display options */
  options: ChartOptions
}

/**
 * Column metadata for chart configuration
 */
export interface ColumnInfo {
  /** Column name */
  name: string
  /** Data type (inferred) */
  type: 'number' | 'string' | 'date' | 'unknown'
  /** Sample values */
  sample?: any[]
}

/**
 * Chart state for UI
 */
export interface ChartState {
  /** Current configuration */
  config: ChartConfig | null
  /** Available columns from query result */
  availableColumns: ColumnInfo[]
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Chart is rendered */
  rendered: boolean
}

/**
 * Default chart configuration
 */
export const DEFAULT_CHART_CONFIG: Partial<ChartConfig> = {
  type: 'bar',
  options: {
    width: 680,
    height: 400,
    grid: true,
    tooltip: true
  }
}

/**
 * Chart type display information
 */
export interface ChartTypeInfo {
  type: ChartType
  label: string
  icon: string
  description: string
}

/**
 * Available chart types with metadata
 */
export const CHART_TYPES: ChartTypeInfo[] = [
  {
    type: 'bar',
    label: 'Bar Chart',
    icon: '📊',
    description: 'Compare values across categories'
  },
  {
    type: 'line',
    label: 'Line Chart',
    icon: '📈',
    description: 'Show trends over time'
  },
  {
    type: 'area',
    label: 'Area Chart',
    icon: '🌊',
    description: 'Show trends over time with filled area'
  },
  {
    type: 'scatter',
    label: 'Scatter Plot',
    icon: '🔵',
    description: 'Explore relationships between variables'
  },
  {
    type: 'histogram',
    label: 'Histogram',
    icon: '📉',
    description: 'Show distribution of numerical data'
  },
  {
    type: 'pie',
    label: 'Pie Chart',
    icon: '🥧',
    description: 'Show proportions of a whole'
  },
  {
    type: 'boxplot',
    label: 'Box Plot',
    icon: '📦',
    description: 'Show statistical distribution with quartiles'
  },
  {
    type: 'heatmap',
    label: 'Heatmap',
    icon: '🔥',
    description: 'Show values as colors in a grid'
  },
  {
    type: 'funnel',
    label: 'Funnel Chart',
    icon: '🔻',
    description: 'Show conversion funnel stages'
  }
]
