/**
 * AreaMap Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent, AreaMapSchema } from '@core/registry'
import { AreaMapMetadata } from './metadata'
import AreaMap from './AreaMap.svelte'
import type { AreaMapConfig } from './types'

/**
 * Props passed to AreaMap.svelte
 */
interface AreaMapProps extends AreaMapConfig {
  data: ReadonlyArray<Record<string, unknown>>
}

/**
 * AreaMap component registration using adapter layer
 */
export const areaMapRegistration = defineComponent<AreaMapConfig, AreaMapProps>({
  metadata: AreaMapMetadata,
  configSchema: AreaMapSchema,
  component: AreaMap,
  containerClass: 'areamap-wrapper',

  // Data binding: pass through the query result
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult) => {
      // Simply return the query result data
      // The component will process it internally
      return queryResult.data
    }
  },

  // Build props for AreaMap.svelte
  buildProps: (config, extractedData) => {
    if (!extractedData) {
      console.error('[AreaMap] No data available')
      return null
    }

    // Pass all config and the data to the component
    return {
      ...config,
      data: extractedData as ReadonlyArray<Record<string, unknown>>
    }
  }
})

export default areaMapRegistration
