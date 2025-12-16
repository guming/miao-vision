/**
 * Layout Plugin
 *
 * Layout components: Grid, etc.
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { gridRegistration } from './grid'

// Re-export registrations for direct import
export { gridRegistration }

// Re-export components
export { default as Grid } from './grid/Grid.svelte'
export { default as GridItem } from './grid/GridItem.svelte'
export type { GridConfig, GridData, GridItemConfig } from './grid/types'

/**
 * Register all layout plugins with the component registry
 */
export function registerLayoutPlugins(registry: ComponentRegistry): void {
  console.log('📐 Registering layout plugins...')

  registry.register(gridRegistration)

  console.log('✅ Layout plugins registered: grid')
}

/**
 * All layout plugin registrations
 */
export const layoutPlugins = [
  gridRegistration
]
