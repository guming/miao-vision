/**
 * ButtonGroup Component Definition (Adapter Layer)
 *
 * Declarative component definition using the new adapter layer.
 */

import { defineComponent, ButtonGroupSchema, dataResolver } from '@core/registry'
import { ButtonGroupMetadata } from './metadata'
import ButtonGroup from './ButtonGroup.svelte'
import type { ButtonGroupConfig, ButtonGroupOption, ButtonGroupData } from './types'

/**
 * Props passed to ButtonGroup.svelte
 */
interface ButtonGroupProps {
  data: ButtonGroupData
  inputStore: unknown
}

/**
 * ButtonGroup component registration using adapter layer
 */
export const buttonGroupRegistration = defineComponent<ButtonGroupConfig, ButtonGroupProps>({
  metadata: ButtonGroupMetadata,
  configSchema: ButtonGroupSchema,
  component: ButtonGroup,
  containerClass: 'buttongroup-wrapper',

  // Custom props builder (handles both inline options and SQL data)
  buildProps: (config, _data, context) => {
    const inputStore = (context as any).inputStore

    if (!inputStore) {
      console.error('[ButtonGroup] inputStore not available in context')
      return null
    }

    let options: ButtonGroupOption[] = []

    // Option 1: Use inline options from config
    if (config.options && config.options.length > 0) {
      options = config.options
    }
    // Option 2: Fetch options from SQL data source
    else if (config.data && config.value) {
      const result = dataResolver.resolveSelectOptions(config.data, context.blocks, {
        valueColumn: config.value,
        labelColumn: config.label || config.value
      })

      if (!result.success || !result.data) {
        // Data not available yet
        return null
      }

      options = result.data
    }

    // Need either inline options or data source
    if (options.length === 0) {
      console.warn('[ButtonGroup] No options available')
      return null
    }

    return {
      data: {
        config,
        options
      },
      inputStore
    }
  }
})

export default buttonGroupRegistration
