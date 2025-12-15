/**
 * Alert Component Module
 */

// Types
export type { AlertType, AlertConfig, AlertData } from './types'

// Metadata
export { AlertMetadata } from './metadata'

// Component registration (adapter layer)
export { alertRegistration } from './definition'

// Component
export { default as Alert } from './Alert.svelte'
