/**
 * BubbleMap Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent, BubbleMapSchema } from '@core/registry'
import { BubbleMapMetadata } from './metadata'
import BubbleMap from './BubbleMap.svelte'
import type { BubbleMapConfig } from './types'

/**
 * Props passed to BubbleMap.svelte
 */
interface BubbleMapProps extends BubbleMapConfig {
  data: ReadonlyArray<Record<string, unknown>>
}

/**
 * BubbleMap component registration using adapter layer
 */
export const bubbleMapRegistration = defineComponent<BubbleMapConfig, BubbleMapProps>({
  metadata: BubbleMapMetadata,
  configSchema: BubbleMapSchema,
  component: BubbleMap,
  containerClass: 'bubblemap-wrapper',

  // Data binding: pass through the query result
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult) => {
      return queryResult.data
    }
  },

  // Build props for BubbleMap.svelte
  buildProps: (config, extractedData) => {
    if (!extractedData) {
      console.error('[BubbleMap] No data available')
      return null
    }

    return {
      ...config,
      data: extractedData as ReadonlyArray<Record<string, unknown>>
    }
  }
})

export default bubbleMapRegistration
