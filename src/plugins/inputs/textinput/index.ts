/**
 * TextInput Component Module
 */

// Types
export type { TextInputConfig, TextInputData } from './types'

// Metadata
export { TextInputMetadata } from './metadata'

// Component registration (adapter layer)
export { textInputRegistration } from './definition'

// Component
export { default as TextInput } from './TextInput.svelte'
