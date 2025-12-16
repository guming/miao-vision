/**
 * TextInput Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent, TextInputSchema } from '@core/registry'
import { TextInputMetadata } from './metadata'
import TextInput from './TextInput.svelte'
import type { TextInputConfig, TextInputData } from './types'

/**
 * Props passed to TextInput.svelte
 */
interface TextInputProps {
  data: TextInputData
  inputStore: unknown
}

/**
 * TextInput component registration using adapter layer
 */
export const textInputRegistration = defineComponent<TextInputConfig, TextInputProps>({
  metadata: TextInputMetadata,
  configSchema: TextInputSchema,
  component: TextInput,
  containerClass: 'textinput-wrapper',

  // TextInput doesn't need data binding (no SQL data source)
  // Build props for TextInput.svelte
  buildProps: (config, _options, context) => {
    const inputStore = (context as any).inputStore

    if (!inputStore) {
      console.error('[TextInput] inputStore not available in context')
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

export default textInputRegistration
