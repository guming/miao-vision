/**
 * Slider Component Definition (Adapter Layer)
 */

import { defineComponent, SliderSchema } from '@core/registry'
import { SliderMetadata } from './metadata'
import Slider from './Slider.svelte'
import type { SliderConfig, SliderData } from './types'

/**
 * Props passed to Slider.svelte
 */
interface SliderProps {
  data: SliderData
  inputStore: unknown
}

/**
 * Slider component registration using adapter layer
 */
export const sliderRegistration = defineComponent<SliderConfig, SliderProps>({
  metadata: SliderMetadata,
  configSchema: SliderSchema,
  component: Slider,
  containerClass: 'slider-wrapper',

  // Slider doesn't need data binding (no SQL data source)
  buildProps: (config, _options, context) => {
    const inputStore = (context as any).inputStore

    if (!inputStore) {
      console.error('[Slider] inputStore not available in context')
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

export default sliderRegistration
