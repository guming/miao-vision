/**
 * Tooltip Component Module
 */

// Types
export type { TooltipConfig, TooltipData, TooltipPosition } from './types'

// Metadata
export { TooltipMetadata } from './metadata'

// Component registration (adapter layer)
export { tooltipRegistration } from './definition'

// Component
export { default as Tooltip } from './Tooltip.svelte'
