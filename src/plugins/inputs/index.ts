/**
 * Inputs Plugin
 *
 * Interactive input components: Dropdown, ButtonGroup, TextInput, Slider, DateRange, etc.
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { dropdownRegistration } from './dropdown'
import { buttonGroupRegistration } from './buttongroup'
import { textInputRegistration } from './textinput'
import { sliderRegistration } from './slider'
import { dateRangeRegistration } from './daterange'
import { checkboxRegistration } from './checkbox'
import { dimensionGridRegistration } from './dimensiongrid'

// Re-export registrations for direct import
export {
  dropdownRegistration,
  buttonGroupRegistration,
  textInputRegistration,
  sliderRegistration,
  dateRangeRegistration,
  checkboxRegistration,
  dimensionGridRegistration
}

// Re-export components for direct use
export { default as Dropdown } from './dropdown/Dropdown.svelte'
export { default as ButtonGroup } from './buttongroup/ButtonGroup.svelte'
export { default as TextInput } from './textinput/TextInput.svelte'
export { default as Slider } from './slider/Slider.svelte'
export { default as DateRange } from './daterange/DateRange.svelte'
export { default as Checkbox } from './checkbox/Checkbox.svelte'
export { default as DimensionGrid } from './dimensiongrid/DimensionGrid.svelte'
export type { DropdownConfig, DropdownOption, DropdownData } from './dropdown/types'
export type { ButtonGroupConfig, ButtonGroupOption, ButtonGroupData } from './buttongroup/types'
export type { TextInputConfig, TextInputData } from './textinput/types'
export type { SliderConfig, SliderData } from './slider/types'
export type { DateRangeConfig, DateRangeData, DateRangePreset } from './daterange/types'
export type { CheckboxConfig, CheckboxData } from './checkbox/types'
export type { DimensionGridConfig, DimensionGridItem, DimensionGridData } from './dimensiongrid/types'

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
  registry.register(textInputRegistration)
  registry.register(sliderRegistration)
  registry.register(dateRangeRegistration)
  registry.register(checkboxRegistration)
  registry.register(dimensionGridRegistration)

  console.log('✅ Input plugins registered: dropdown, buttongroup, textinput, slider, daterange, checkbox, dimensiongrid')
}

/**
 * All input plugin registrations
 */
export const inputPlugins = [
  dropdownRegistration,
  buttonGroupRegistration,
  textInputRegistration,
  sliderRegistration,
  dateRangeRegistration,
  checkboxRegistration,
  dimensionGridRegistration
]
