/**
 * Sparkline Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { SparklineMetadata } from './metadata'
import Sparkline from './Sparkline.svelte'
import type { SparklineConfig, SparklineData } from './types'

// Schema for sparkline config
const SparklineSchema = {
  fields: [
    { name: 'query', type: 'string' as const, required: true },
    { name: 'value', type: 'string' as const, required: true },
    { name: 'type', type: 'string' as const },
    { name: 'color', type: 'string' as const },
    { name: 'height', type: 'number' as const, default: 32 },
    { name: 'width', type: 'number' as const, default: 100 },
    { name: 'showDots', type: 'boolean' as const, default: false },
    { name: 'showMinMax', type: 'boolean' as const, default: false }
  ]
}

/**
 * Props passed to Sparkline.svelte
 */
interface SparklineProps {
  data: SparklineData
}

/**
 * Sparkline component registration using adapter layer
 */
export const sparklineRegistration = defineComponent<SparklineConfig, SparklineProps>({
  metadata: SparklineMetadata,
  configSchema: SparklineSchema,
  component: Sparkline,
  containerClass: 'sparkline-wrapper',

  // Data binding to extract values from query result
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, config) => {
      const values: number[] = []
      const valueCol = config.value

      for (const row of queryResult.data) {
        const v = row[valueCol]
        if (typeof v === 'number') {
          values.push(v)
        } else if (v !== null && v !== undefined) {
          const num = Number(v)
          if (!isNaN(num)) {
            values.push(num)
          }
        }
      }

      return values
    }
  },

  // Build props for Sparkline.svelte
  buildProps: (config, rawValues) => {
    const values = (rawValues as number[]) || []

    // Calculate min/max
    let min = Infinity
    let max = -Infinity
    let minIndex = 0
    let maxIndex = 0

    values.forEach((v, i) => {
      if (v < min) {
        min = v
        minIndex = i
      }
      if (v > max) {
        max = v
        maxIndex = i
      }
    })

    if (!isFinite(min)) min = 0
    if (!isFinite(max)) max = 0

    return {
      data: {
        config,
        values,
        min,
        max,
        minIndex,
        maxIndex
      }
    }
  }
})

export default sparklineRegistration
