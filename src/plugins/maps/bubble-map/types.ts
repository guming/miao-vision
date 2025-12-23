/**
 * BubbleMap Component Types
 */

export interface BubbleMapConfig {
  // Required
  query: string
  latitude: string
  longitude: string
  size: string

  // Optional
  name?: string
  color?: string
  title?: string
  minSize?: number
  maxSize?: number
  fillOpacity?: number
  strokeColor?: string
  strokeWidth?: number
  height?: number
  showTooltip?: boolean
  tooltipTemplate?: string
  tilesUrl?: string
  attribution?: string
  zoom?: number
  center?: [number, number]
  colorScheme?: string
}

export interface BubbleData {
  latitude: number
  longitude: number
  size: number
  name?: string
  color?: string
}
