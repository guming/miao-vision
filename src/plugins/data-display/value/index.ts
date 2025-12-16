/**
 * Value Component Module
 */

// Types
export type { ValueConfig, ValueData } from './types'

// Metadata
export { ValueMetadata } from './metadata'

// Component registration (adapter layer)
export { valueRegistration } from './definition'

// Component
export { default as Value } from './Value.svelte'
