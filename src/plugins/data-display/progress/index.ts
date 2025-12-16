/**
 * Progress Bar Component Module
 */

// Types
export type { ProgressConfig, ProgressData } from './types'

// Metadata
export { ProgressMetadata } from './metadata'

// Component registration (adapter layer)
export { progressRegistration } from './definition'

// Component
export { default as Progress } from './Progress.svelte'
