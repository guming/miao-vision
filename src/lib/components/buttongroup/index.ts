/**
 * ButtonGroup Component Module
 */

// Types
export type { ButtonGroupOption, ButtonGroupConfig, ButtonGroupData } from './types'

// Metadata
export { ButtonGroupMetadata } from './metadata'

// Component registration (adapter layer)
export { buttonGroupRegistration } from './definition'

// Component
export { default as ButtonGroup } from './ButtonGroup.svelte'
