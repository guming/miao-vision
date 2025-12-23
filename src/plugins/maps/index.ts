/**
 * Map Components Plugin Exports
 *
 * Leaflet-based map visualizations
 */

import type { ComponentRegistry } from '@core/registry'
import { areaMapRegistration } from './area-map'

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

// TODO: Add other map components
// - PointMap
// - BubbleMap
// - USMap

/**
 * Register all map plugins with the component registry
 */
export function registerMapPlugins(registry: ComponentRegistry): void {
  console.log('🗺️ Registering map plugins...')

  registry.register(areaMapRegistration)

  console.log('✅ Map plugins registered: areamap')
}

/**
 * All map plugin registrations
 */
export const mapPlugins = [areaMapRegistration]
