/**
 * Dropdown Component Definition (Adapter Layer)
 *
 * Declarative component definition using the new adapter layer.
 * Replaces parser.ts and renderer.ts with ~30 lines of code.
 */

import { defineComponent, DropdownSchema } from '@core/registry'
import { DropdownMetadata } from './metadata'
import Dropdown from './Dropdown.svelte'
import type { DropdownConfig, DropdownOption, DropdownData } from './types'

/**
 * Props passed to Dropdown.svelte
 */
interface DropdownProps {
  data: DropdownData
  inputStore: unknown
}

/**
 * Dropdown component registration using adapter layer
 */
export const dropdownRegistration = defineComponent<DropdownConfig, DropdownProps>({
  metadata: DropdownMetadata,
  configSchema: DropdownSchema,
  component: Dropdown,
  containerClass: 'dropdown-wrapper',

  // Data binding: extract options from SQL query result
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      const options: DropdownOption[] = []
      const valueCol = config.value
      const labelCol = config.label || config.value

      for (const row of queryResult.data) {
        const value = row[valueCol]
        const label = row[labelCol]

        if (value !== null && value !== undefined) {
          options.push({
            value: String(value),
            label: String(label ?? value)
          })
        }
      }

      return options
    }
  },

  // Build props for Dropdown.svelte
  buildProps: (config, options, context) => {
    const inputStore = (context as any).inputStore

    if (!inputStore) {
      console.error('[Dropdown] inputStore not available in context')
      return null
    }

    return {
      data: {
        config,
        options: (options as DropdownOption[]) || []
      },
      inputStore
    }
  }
})

export default dropdownRegistration
