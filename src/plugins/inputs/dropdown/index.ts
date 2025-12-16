/**
 * Dropdown Component Module
 */

// Types
export type { DropdownConfig, DropdownOption, DropdownData } from './types'

// Metadata
export { DropdownMetadata } from './metadata'

// Component registration (adapter layer)
export { dropdownRegistration } from './definition'

// Component
export { default as Dropdown } from './Dropdown.svelte'
