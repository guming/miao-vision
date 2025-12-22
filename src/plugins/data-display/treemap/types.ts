/**
 * Treemap Component Types
 *
 * Configuration and data types for the Treemap visualization.
 */

/**
 * Treemap configuration from markdown
 */
export interface TreemapConfig {
  /** Query name providing the data */
  data: string

  /** Column containing category/label names */
  labelColumn: string

  /** Column containing values for sizing */
  valueColumn: string

  /** Optional column for grouping/parent categories */
  groupColumn?: string

  /** Chart title */
  title?: string

  /** Chart subtitle */
  subtitle?: string

  /** Height in pixels */
  height?: number

  /** Color scheme */
  colorScheme?: 'default' | 'category' | 'blue' | 'green' | 'warm' | 'cool' | 'mono'

  /** Show labels on tiles */
  showLabels?: boolean

  /** Show values on tiles */
  showValues?: boolean

  /** Value format */
  valueFormat?: 'number' | 'currency' | 'percent'

  /** Currency symbol */
  currencySymbol?: string

  /** Minimum tile size to show label (pixels) */
  minLabelSize?: number

  /** Tile padding in pixels */
  tilePadding?: number

  /** Tile border radius */
  borderRadius?: number

  /** Additional CSS class */
  class?: string
}

/**
 * A single tile in the treemap
 */
export interface TreemapTile {
  /** Unique tile ID */
  id: string

  /** Display label */
  label: string

  /** Value for sizing */
  value: number

  /** Formatted value string */
  formattedValue: string

  /** Percentage of total */
  percent: number

  /** Group/parent name (if grouped) */
  group?: string

  /** Tile color */
  color: string

  /** X position (pixels) */
  x: number

  /** Y position (pixels) */
  y: number

  /** Width (pixels) */
  width: number

  /** Height (pixels) */
  height: number
}

/**
 * Processed treemap data passed to component
 */
export interface TreemapData {
  /** Array of tiles */
  tiles: TreemapTile[]

  /** Title */
  title?: string

  /** Subtitle */
  subtitle?: string

  /** Total value sum */
  totalValue: number

  /** Component configuration */
  config: TreemapConfig
}
