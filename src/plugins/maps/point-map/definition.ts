/**
 * PointMap Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent, PointMapSchema } from '@core/registry'
import { PointMapMetadata } from './metadata'
import PointMap from './PointMap.svelte'
import type { PointMapConfig } from './types'

/**
 * Props passed to PointMap.svelte
 */
interface PointMapProps extends PointMapConfig {
  data: ReadonlyArray<Record<string, unknown>>
}

/**
 * PointMap component registration using adapter layer
 */
export const pointMapRegistration = defineComponent<PointMapConfig, PointMapProps>({
  metadata: PointMapMetadata,
  configSchema: PointMapSchema,
  component: PointMap,
  containerClass: 'pointmap-wrapper',

  // Data binding: pass through the query result
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult) => {
      // Simply return the query result data
      // The component will process it internally
      return queryResult.data
    }
  },

  // Build props for PointMap.svelte
  buildProps: (config, extractedData) => {
    if (!extractedData) {
      console.error('[PointMap] No data available')
      return null
    }

    // Pass all config and the data to the component
    return {
      ...config,
      data: extractedData as ReadonlyArray<Record<string, unknown>>
    }
  }
})

export default pointMapRegistration
