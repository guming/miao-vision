/**
 * DateRange Component Definition (Adapter Layer)
 */

import { defineComponent, DateRangeSchema } from '@core/registry'
import { DateRangeMetadata } from './metadata'
import DateRange from './DateRange.svelte'
import type { DateRangeConfig, DateRangeData, DateRangePreset } from './types'
import { DEFAULT_PRESETS } from './types'

/**
 * Props passed to DateRange.svelte
 */
interface DateRangeProps {
  data: DateRangeData
  inputStore: unknown
}

/**
 * DateRange component registration using adapter layer
 */
export const dateRangeRegistration = defineComponent<DateRangeConfig, DateRangeProps>({
  metadata: DateRangeMetadata,
  configSchema: DateRangeSchema,
  component: DateRange,
  containerClass: 'daterange-wrapper',

  // DateRange doesn't need data binding (no SQL data source)
  buildProps: (config, _options, context) => {
    const inputStore = (context as any).inputStore

    if (!inputStore) {
      console.error('[DateRange] inputStore not available in context')
      return null
    }

    // Resolve presets
    let presets: DateRangePreset[] = []

    if (config.presets === true) {
      presets = DEFAULT_PRESETS
    } else if (Array.isArray(config.presets)) {
      presets = config.presets
    }

    return {
      data: {
        config,
        presets
      },
      inputStore
    }
  }
})

export default dateRangeRegistration
