/**
 * Checkbox Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent, CheckboxSchema } from '@core/registry'
import { CheckboxMetadata } from './metadata'
import Checkbox from './Checkbox.svelte'
import type { CheckboxConfig, CheckboxData } from './types'

/**
 * Props passed to Checkbox.svelte
 */
interface CheckboxProps {
  data: CheckboxData
  inputStore: unknown
}

/**
 * Checkbox component registration using adapter layer
 */
export const checkboxRegistration = defineComponent<CheckboxConfig, CheckboxProps>({
  metadata: CheckboxMetadata,
  configSchema: CheckboxSchema,
  component: Checkbox,
  containerClass: 'checkbox-wrapper',

  // Build props for the component
  buildProps: (config, _data, context) => {
    const inputStore = (context as any).inputStore

    if (!inputStore) {
      console.error('[Checkbox] inputStore not available in context')
      return null
    }

    return {
      data: {
        config
      },
      inputStore
    }
  }
})

export default checkboxRegistration
