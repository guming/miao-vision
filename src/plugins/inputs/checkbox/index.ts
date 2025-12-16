/**
 * Checkbox Component Module
 */

// Types
export type { CheckboxConfig, CheckboxData } from './types'

// Metadata
export { CheckboxMetadata } from './metadata'

// Component registration (adapter layer)
export { checkboxRegistration } from './definition'

// Component
export { default as Checkbox } from './Checkbox.svelte'
