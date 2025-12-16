/**
 * DimensionGrid Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent, DimensionGridSchema } from '@core/registry'
import { dimensionGridMetadata } from './metadata'
import DimensionGrid from './DimensionGrid.svelte'
import type { DimensionGridConfig, DimensionGridData } from './types'

/**
 * Props passed to DimensionGrid.svelte
 */
interface DimensionGridProps {
  data: DimensionGridData
  inputStore: unknown
}

/**
 * DimensionGrid component registration using adapter layer
 */
export const dimensionGridRegistration = defineComponent<DimensionGridConfig, DimensionGridProps>({
  metadata: dimensionGridMetadata,
  configSchema: DimensionGridSchema,
  component: DimensionGrid,
  containerClass: 'dimensiongrid-wrapper',

  // Build props for the component
  buildProps: (config, _data, context) => {
    const inputStore = (context as any).inputStore

    if (!inputStore) {
      console.error('[DimensionGrid] inputStore not available in context')
      return null
    }

    return {
      data: {
        type: 'dimensiongrid',
        config
      },
      inputStore
    }
  }
})

export default dimensionGridRegistration
