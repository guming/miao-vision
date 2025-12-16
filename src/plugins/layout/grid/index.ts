/**
 * Dashboard Grid Component Module
 */

// Types
export type { GridConfig, GridData, GridItemConfig } from './types'

// Metadata
export { GridMetadata } from './metadata'

// Component registration (adapter layer)
export { gridRegistration } from './definition'

// Components
export { default as Grid } from './Grid.svelte'
export { default as GridItem } from './GridItem.svelte'
