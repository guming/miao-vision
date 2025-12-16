/**
 * Inputs Plugin
 *
 * Interactive input components: Dropdown, ButtonGroup, etc.
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { dropdownRegistration } from './dropdown'
import { buttonGroupRegistration } from './buttongroup'

// Re-export registrations for direct import
export { dropdownRegistration, buttonGroupRegistration }

// Re-export components for direct use
export { default as Dropdown } from './dropdown/Dropdown.svelte'
export { default as ButtonGroup } from './buttongroup/ButtonGroup.svelte'
export type { DropdownConfig, DropdownOption, DropdownData } from './dropdown/types'
export type { ButtonGroupConfig, ButtonGroupOption, ButtonGroupData } from './buttongroup/types'

// Re-export utilities
export { useInput, useStringInput, useNumberInput, useBooleanInput, useArrayInput } from './use-input.svelte'
export type { InputBinding } from './use-input.svelte'
export { initializeInputDefaults } from './initialize-defaults'

/**
 * Register all input plugins with the component registry
 */
export function registerInputPlugins(registry: ComponentRegistry): void {
  console.log('📝 Registering input plugins...')

  registry.register(dropdownRegistration)
  registry.register(buttonGroupRegistration)

  console.log('✅ Input plugins registered: dropdown, buttongroup')
}

/**
 * All input plugin registrations
 */
export const inputPlugins = [
  dropdownRegistration,
  buttonGroupRegistration
]
