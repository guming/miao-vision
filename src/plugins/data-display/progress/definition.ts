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
    { name: 'query', type: 'string' as const, required: false },  // SQL query name
    { name: 'value', type: 'any' as const, required: false },     // Column name (string) or static value (number)
    { name: 'max', type: 'any' as const, required: false },       // Column name (string) or static max (number)
    { name: 'maxValue', type: 'number' as const, default: 100 },  // Static max value (fallback)
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
 * Extracted data from SQL query
 */
interface ExtractedProgressData {
  value: number
  max?: number
}

/**
 * Progress Bar component registration
 */
export const progressRegistration = defineComponent<ProgressConfig, ProgressProps>({
  metadata: ProgressMetadata,
  configSchema: ProgressSchema,
  component: Progress,
  containerClass: 'progress-wrapper',

  // Data binding: extract value and optional max from SQL query
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, config): ExtractedProgressData | null => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Progress] No data available')
        return null
      }

      const valueCol = config.value as string
      const maxCol = config.max as string | undefined

      if (!valueCol) {
        console.warn('[Progress] value column is required')
        return null
      }

      // Get the first row
      const row = queryResult.data[0]
      const value = parseFloat(String(row[valueCol] ?? 0))

      if (isNaN(value)) {
        console.warn('[Progress] Invalid value in column:', valueCol)
        return null
      }

      // Optionally get max from data
      let max: number | undefined
      if (maxCol && row[maxCol] !== undefined) {
        max = parseFloat(String(row[maxCol]))
        if (isNaN(max)) {
          max = undefined
        }
      }

      return { value, max }
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): ProgressProps | null => {
    const extractedData = rawData as ExtractedProgressData | null

    let value: number
    let max: number

    // Check if value is provided as a static value in config (number or parseable string)
    const configValue = config.value
    const configMax = config.max

    if (configValue !== undefined && configValue !== null && typeof configValue !== 'string') {
      // Static mode: value is a number in config
      value = Number(configValue)
      max = configMax !== undefined && configMax !== null && typeof configMax !== 'string'
        ? Number(configMax)
        : config.maxValue ?? 100
    } else if (extractedData) {
      // SQL mode: value and max come from query data
      value = extractedData.value
      max = extractedData.max ?? config.maxValue ?? 100
    } else if (configValue !== undefined && configValue !== null) {
      // Fallback: try to parse value as number (in case YAML parsed it as string)
      const parsedValue = Number(configValue)
      if (!isNaN(parsedValue)) {
        value = parsedValue
        max = configMax !== undefined && configMax !== null
          ? Number(configMax)
          : config.maxValue ?? 100
      } else {
        // Value is a string (column name) but no query data available
        console.warn('[Progress] Column name provided but no query data available:', configValue)
        return null
      }
    } else {
      // No data available and no static value, return null to show placeholder
      return null
    }

    // Validate that we have a valid number
    if (isNaN(value)) {
      console.warn('[Progress] Invalid value:', config.value)
      return null
    }

    // Calculate percentage
    const percent = max > 0 ? (value / max) * 100 : 0

    // Format the value
    const formatted = fmt(value, config.format || 'number')

    return {
      data: {
        config: config as ProgressConfig,
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
