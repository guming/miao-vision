/**
 * Sparkline Component Module
 */

// Types
export type { SparklineConfig, SparklineData } from './types'

// Metadata
export { SparklineMetadata } from './metadata'

// Component registration (adapter layer)
export { sparklineRegistration } from './definition'

// Component
export { default as Sparkline } from './Sparkline.svelte'
