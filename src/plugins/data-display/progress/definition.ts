/**
 * Progress Bar Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { ProgressMetadata } from './metadata'
import Progress from './Progress.svelte'
import { fmt } from '@core/shared/format'
import type { ProgressConfig, ProgressData } from './types'

// Schema for Progress config
const ProgressSchema = {
  fields: [
    { name: 'query', type: 'string' as const, required: true },
    { name: 'value', type: 'string' as const, required: true },
    { name: 'max', type: 'string' as const },
    { name: 'maxValue', type: 'number' as const, default: 100 },
    { name: 'label', type: 'string' as const },
    { name: 'format', type: 'string' as const, default: 'number' },
    { name: 'color', type: 'string' as const, default: 'blue' },
    { name: 'size', type: 'string' as const, default: 'md' },
    { name: 'showValue', type: 'boolean' as const, default: true },
    { name: 'showPercent', type: 'boolean' as const, default: true },
    { name: 'animated', type: 'boolean' as const, default: true }
  ]
}

interface ProgressProps {
  data: ProgressData
}

/**
 * Progress Bar component registration
 */
export const progressRegistration = defineComponent<ProgressConfig, ProgressProps>({
  metadata: ProgressMetadata,
  configSchema: ProgressSchema,
  component: Progress,
  containerClass: 'progress-wrapper',

  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, config) => {
      const row = queryResult.data[0] || {}
      return { row }
    }
  },

  buildProps: (config, extractedData, _context) => {
    if (!extractedData) return null

    const { row } = extractedData as { row: Record<string, unknown> }

    // Get current value
    const rawValue = row[config.value]
    const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || 0

    // Get max value (from column or fixed)
    let max = config.maxValue || 100
    if (config.max && row[config.max]) {
      const rawMax = row[config.max]
      max = typeof rawMax === 'number' ? rawMax : parseFloat(String(rawMax)) || 100
    }

    // Calculate percentage
    const percent = max > 0 ? (value / max) * 100 : 0

    // Format the value
    const formatted = fmt(value, config.format || 'number')

    return {
      data: {
        config,
        value,
        max,
        percent,
        formatted,
        label: config.label
      }
    }
  }
})

export default progressRegistration
