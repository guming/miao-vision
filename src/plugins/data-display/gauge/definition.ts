/**
 * Gauge Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent } from '@core/registry'
import { GaugeMetadata } from './metadata'
import { GaugeSchema } from './schema'
import Gauge from './Gauge.svelte'
import type { GaugeConfig, GaugeData, GaugeThreshold } from './types'

/**
 * Props passed to Gauge.svelte
 */
interface GaugeProps {
  data: GaugeData
}

/**
 * Format a value based on format type
 */
export function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number',
  currencySymbol: string = '$',
  decimals: number = 0
): string {
  const rounded = Number(value.toFixed(decimals))
  if (format === 'currency') {
    return `${currencySymbol}${rounded.toLocaleString()}`
  }
  if (format === 'percent') {
    return `${rounded}%`
  }
  return rounded.toLocaleString()
}

/**
 * Calculate percentage of scale
 */
export function calculatePercent(value: number, min: number, max: number): number {
  if (max === min) return 0
  const clamped = Math.max(min, Math.min(max, value))
  return ((clamped - min) / (max - min)) * 100
}

/**
 * Get color based on thresholds
 */
export function getColorForValue(
  value: number,
  thresholds: GaugeThreshold[] | undefined,
  defaultColor: string
): string {
  if (!thresholds || thresholds.length === 0) {
    return defaultColor
  }

  // Sort thresholds by value ascending
  const sorted = [...thresholds].sort((a, b) => a.value - b.value)

  // Find the appropriate color
  let color = defaultColor
  for (const threshold of sorted) {
    if (value >= threshold.value) {
      color = threshold.color
    }
  }

  return color
}

/**
 * Gauge component registration
 */
export const gaugeRegistration = defineComponent<GaugeConfig, GaugeProps>({
  metadata: GaugeMetadata,
  configSchema: GaugeSchema,
  component: Gauge,
  containerClass: 'gauge-wrapper',

  // Data binding: extract single value
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Gauge] No data available')
        return null
      }

      const valueCol = config.valueColumn

      if (!valueCol) {
        console.warn('[Gauge] valueColumn is required')
        return null
      }

      // Get the first row's value
      const row = queryResult.data[0]
      const value = parseFloat(String(row[valueCol] || 0))

      if (isNaN(value)) {
        console.warn('[Gauge] Invalid value')
        return null
      }

      return value
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): GaugeProps => {
    const value = rawData as number | null

    const min = config.min ?? 0
    const max = config.max ?? 100
    const valueFormat = config.valueFormat || 'number'
    const currencySymbol = config.currencySymbol || '$'
    const decimals = config.decimals ?? 0
    const defaultColor = config.color || '#3B82F6'

    if (value === null) {
      return {
        data: {
          value: 0,
          formattedValue: formatValue(0, valueFormat, currencySymbol, decimals),
          percent: 0,
          min,
          max,
          title: config.title,
          subtitle: config.subtitle,
          color: defaultColor,
          config
        }
      }
    }

    const percent = calculatePercent(value, min, max)
    const color = getColorForValue(value, config.thresholds, defaultColor)
    const formattedValue = formatValue(value, valueFormat, currencySymbol, decimals)

    return {
      data: {
        value,
        formattedValue,
        percent,
        min,
        max,
        title: config.title,
        subtitle: config.subtitle,
        color,
        config
      }
    }
  }
})

export default gaugeRegistration
