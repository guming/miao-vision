/**
 * AreaMap (Choropleth) Component Types
 */

import type { LatLngBoundsExpression } from 'leaflet'

/**
 * Area map configuration
 */
export interface AreaMapConfig {
  /** SQL result name providing the data */
  query: string

  /** Column name containing area identifiers (e.g., state codes, country codes) */
  areaId: string

  /** Column name containing the value to visualize */
  value: string

  /** Column name for area names/labels (optional, defaults to areaId) */
  areaName?: string

  /** Map title */
  title?: string

  /** GeoJSON data source URL or data */
  geoJson: string | object

  /** Property in GeoJSON to match with areaId */
  geoJsonKey?: string

  /** Color scale type */
  colorScale?: 'sequential' | 'diverging' | 'categorical'

  /** Color scheme name */
  colorScheme?: string

  /** Number of color buckets (for sequential/diverging scales) */
  colorBuckets?: number

  /** Custom color palette (array of hex colors) */
  colors?: string[]

  /** Value format (currency, percent, number, etc.) */
  format?: string

  /** Map height in pixels */
  height?: number

  /** Initial map bounds */
  bounds?: LatLngBoundsExpression

  /** Show legend */
  showLegend?: boolean

  /** Legend position */
  legendPosition?: 'topright' | 'topleft' | 'bottomright' | 'bottomleft'

  /** Show tooltip on hover */
  showTooltip?: boolean

  /** Tooltip template (uses {areaName}, {value}, {formatted}) */
  tooltipTemplate?: string

  /** Base map tiles URL (optional, defaults to OSM) */
  tilesUrl?: string

  /** Base map attribution */
  attribution?: string
}

/**
 * Processed area data
 */
export interface AreaData {
  /** Area identifier */
  id: string

  /** Area display name */
  name: string

  /** Numeric value */
  value: number

  /** Formatted value string */
  formatted: string

  /** Color assigned to this area */
  color: string
}

/**
 * Color scale configuration
 */
export interface ColorScaleConfig {
  type: 'sequential' | 'diverging' | 'categorical'
  scheme: string
  buckets: number
  colors?: string[]
}

/**
 * Map bounds
 */
export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}
