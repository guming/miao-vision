/**
 * Value Component Definition (Adapter Layer)
 *
 * Declarative component definition using the new adapter layer.
 */

import { defineComponent, ValueSchema } from '@core/registry'
import { ValueMetadata } from './metadata'
import Value from './Value.svelte'
import type { ValueConfig, ValueData } from './types'

/**
 * Props passed to Value.svelte
 */
interface ValueProps {
  data: ValueData
}

/**
 * Value component registration using adapter layer
 */
export const valueRegistration = defineComponent<ValueConfig, ValueProps>({
  metadata: ValueMetadata,
  configSchema: ValueSchema,
  component: Value,
  containerClass: 'value-wrapper',

  // Data binding: extract single value from SQL query result
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, config) => {
      const rowIndex = config.row || 0

      if (queryResult.data.length <= rowIndex) {
        console.warn(`[Value] Row index ${rowIndex} out of bounds (${queryResult.data.length} rows)`)
        return null
      }

      const row = queryResult.data[rowIndex]

      if (!row || !(config.column in row)) {
        console.warn(`[Value] Column "${config.column}" not found in row`)
        return null
      }

      return row[config.column]
    }
  },

  // Build props
  buildProps: (config, extractedValue, _context) => {
    return {
      data: {
        value: extractedValue,
        config
      }
    }
  }
})

export default valueRegistration
