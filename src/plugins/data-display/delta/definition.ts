/**
 * Delta Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent, DeltaSchema } from '@core/registry'
import { DeltaMetadata } from './metadata'
import Delta from './Delta.svelte'
import type { DeltaConfig, DeltaData } from './types'

/**
 * Props passed to Delta.svelte
 */
interface DeltaProps {
  data: DeltaData
}

/**
 * Extracted delta data from transform
 */
interface ExtractedDeltaData {
  currentValue: number
  comparisonValue: number
  deltaValue: number
  format: 'absolute' | 'percent'
  decimals: number
}

/**
 * Format delta value for display
 * Exported for testing
 */
export function formatDelta(
  value: number,
  format: 'absolute' | 'percent',
  decimals: number
): string {
  if (format === 'percent') {
    return `${value.toFixed(decimals)}%`
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  })
}

/**
 * Calculate delta between two values
 * Exported for testing
 */
export function calculateDelta(
  current: number,
  previous: number,
  format: 'absolute' | 'percent'
): number {
  if (format === 'percent') {
    if (previous === 0) {
      return current === 0 ? 0 : (current > 0 ? 100 : -100)
    }
    return ((current - previous) / Math.abs(previous)) * 100
  }
  return current - previous
}

/**
 * Delta component registration using adapter layer
 */
export const deltaRegistration = defineComponent<DeltaConfig, DeltaProps>({
  metadata: DeltaMetadata,
  configSchema: DeltaSchema,
  component: Delta,
  containerClass: 'delta-wrapper',

  // Data binding: extract values and calculate delta
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config): ExtractedDeltaData | null => {
      const rowIndex = config.row || 0
      const format = config.format || 'percent'
      const decimals = config.decimals ?? 1

      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Delta] No data available')
        return null
      }

      if (rowIndex >= queryResult.data.length) {
        console.warn(`[Delta] Row index ${rowIndex} out of bounds`)
        return null
      }

      const row = queryResult.data[rowIndex] as Record<string, unknown>

      if (!row || !(config.column in row)) {
        console.warn(`[Delta] Column "${config.column}" not found`)
        return null
      }

      const currentValue = parseFloat(String(row[config.column]))

      if (isNaN(currentValue)) {
        console.warn(`[Delta] Current value is not a number`)
        return null
      }

      let comparisonValue: number

      if (config.comparison) {
        // Use comparison column from same row or specified row
        const compRow = (config.comparisonRow !== undefined
          ? queryResult.data[config.comparisonRow]
          : row) as Record<string, unknown>

        if (!compRow || !(config.comparison in compRow)) {
          console.warn(`[Delta] Comparison column "${config.comparison}" not found`)
          return null
        }

        comparisonValue = parseFloat(String(compRow[config.comparison]))
      } else {
        // Use same column from next row (or specified comparison row)
        const compRowIndex = config.comparisonRow ?? rowIndex + 1

        if (compRowIndex >= queryResult.data.length) {
          console.warn(`[Delta] Comparison row ${compRowIndex} out of bounds`)
          return null
        }

        const compRow = queryResult.data[compRowIndex] as Record<string, unknown>

        if (!compRow || !(config.column in compRow)) {
          console.warn(`[Delta] Column "${config.column}" not found in comparison row`)
          return null
        }

        comparisonValue = parseFloat(String(compRow[config.column]))
      }

      if (isNaN(comparisonValue)) {
        console.warn(`[Delta] Comparison value is not a number`)
        return null
      }

      // Calculate delta
      const deltaValue = calculateDelta(currentValue, comparisonValue, format)

      return {
        currentValue,
        comparisonValue,
        deltaValue,
        format,
        decimals
      }
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): DeltaProps => {
    const extractedData = rawData as ExtractedDeltaData | null

    if (!extractedData) {
      return {
        data: {
          value: null,
          isPositive: false,
          isNeutral: true,
          formatted: config.neutralText || '—',
          currentValue: null,
          comparisonValue: null,
          config
        }
      }
    }

    const { currentValue, comparisonValue, deltaValue, format, decimals } = extractedData
    const isPositive = deltaValue > 0
    const isNeutral = Math.abs(deltaValue) < 0.001 // Near zero

    return {
      data: {
        value: deltaValue,
        isPositive,
        isNeutral,
        formatted: formatDelta(deltaValue, format, decimals),
        currentValue,
        comparisonValue,
        config
      }
    }
  }
})

export default deltaRegistration
