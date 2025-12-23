/**
 * Map Components Plugin Exports
 *
 * Leaflet-based map visualizations
 */

import type { ComponentRegistry } from '@core/registry'
import { areaMapRegistration } from './area-map'
import { pointMapRegistration } from './point-map'
import { bubbleMapRegistration } from './bubble-map'

// AreaMap (Choropleth)
export {
  areaMapRegistration,
  AreaMapMetadata,
  createAreaDataProcessor,
  createColorScale,
  getAvailableSchemes,
  getSchemeColors
} from './area-map'
export type { AreaMapConfig, AreaData, ColorScaleConfig } from './area-map'

// PointMap
export {
  pointMapRegistration,
  PointMapMetadata
} from './point-map'
export type { PointMapConfig, PointData, MarkerSize, MarkerColor } from './point-map'

// BubbleMap
export {
  bubbleMapRegistration,
  BubbleMapMetadata
} from './bubble-map'
export type { BubbleMapConfig, BubbleData } from './bubble-map'

// TODO: Add other map components
// - USMap

/**
 * Register all map plugins with the component registry
 */
export function registerMapPlugins(registry: ComponentRegistry): void {
  console.log('🗺️ Registering map plugins...')

  registry.register(areaMapRegistration)
  registry.register(pointMapRegistration)
  registry.register(bubbleMapRegistration)

  console.log('✅ Map plugins registered: areamap, pointmap, bubblemap')
}

/**
 * All map plugin registrations
 */
export const mapPlugins = [areaMapRegistration, pointMapRegistration, bubbleMapRegistration]
