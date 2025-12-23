/**
 * PointMap Component Types
 */

export interface PointMapConfig {
  // Required
  query: string
  latitude: string
  longitude: string

  // Optional
  name?: string
  value?: string
  title?: string
  color?: string
  icon?: string
  markerColor?: 'blue' | 'red' | 'green' | 'orange' | 'yellow' | 'violet' | 'grey' | 'black'
  height?: number
  showTooltip?: boolean
  tooltipTemplate?: string
  tilesUrl?: string
  attribution?: string
  cluster?: boolean
  clusterRadius?: number
  markerSize?: 'small' | 'medium' | 'large'
  zoom?: number
  center?: [number, number]
}

export interface PointData {
  latitude: number
  longitude: number
  name?: string
  value?: any
  color?: string
  icon?: string
}

export type MarkerSize = 'small' | 'medium' | 'large'
export type MarkerColor = 'blue' | 'red' | 'green' | 'orange' | 'yellow' | 'violet' | 'grey' | 'black'
