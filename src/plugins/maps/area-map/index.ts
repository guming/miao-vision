/**
 * AreaMap (Choropleth) Plugin Exports
 */

export { areaMapRegistration } from './definition'
export { AreaMapMetadata } from './metadata'
export { createAreaDataProcessor } from './processor'
export { createColorScale, getAvailableSchemes, getSchemeColors } from './colors'
export type { AreaMapConfig, AreaData, ColorScaleConfig } from './types'
export type { ProcessorConfig } from './processor'
export { default as AreaMap } from './AreaMap.svelte'
