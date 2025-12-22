/**
 * Waterfall Chart Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent } from '@core/registry'
import { WaterfallMetadata } from './metadata'
import { WaterfallSchema } from './schema'
import Waterfall from './Waterfall.svelte'
import type { WaterfallConfig, WaterfallData, WaterfallBar, WaterfallBarType } from './types'

/**
 * Props passed to Waterfall.svelte
 */
interface WaterfallProps {
  data: WaterfallData
}

/**
 * Raw item from query
 */
interface RawItem {
  label: string
  value: number
  isTotal: boolean
}

/**
 * Format a value based on format type
 */
export function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number',
  currencySymbol: string = '$'
): string {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : value > 0 ? '+' : ''

  if (format === 'currency') {
    return `${sign}${currencySymbol}${absValue.toLocaleString()}`
  }
  if (format === 'percent') {
    return `${sign}${absValue.toFixed(1)}%`
  }
  return `${sign}${absValue.toLocaleString()}`
}

/**
 * Get bar color based on type
 */
export function getBarColor(
  type: WaterfallBarType,
  positiveColor: string,
  negativeColor: string,
  totalColor: string
): string {
  switch (type) {
    case 'increase':
      return positiveColor
    case 'decrease':
      return negativeColor
    case 'total':
      return totalColor
    default:
      return positiveColor
  }
}

/**
 * Determine bar type based on value and isTotal flag
 */
export function getBarType(value: number, isTotal: boolean): WaterfallBarType {
  if (isTotal) return 'total'
  return value >= 0 ? 'increase' : 'decrease'
}

/**
 * Build waterfall bars with cumulative positions
 */
export function buildWaterfallBars(
  items: RawItem[],
  config: WaterfallConfig
): WaterfallBar[] {
  const positiveColor = config.positiveColor || '#22c55e'
  const negativeColor = config.negativeColor || '#ef4444'
  const totalColor = config.totalColor || '#3b82f6'
  const valueFormat = config.valueFormat || 'number'
  const currencySymbol = config.currencySymbol || '$'

  const bars: WaterfallBar[] = []
  let cumulative = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const type = getBarType(item.value, item.isTotal)

    let start: number
    let end: number

    if (type === 'total') {
      // Total bars start from 0
      start = 0
      end = cumulative
    } else {
      // Regular bars build on cumulative
      start = cumulative
      end = cumulative + item.value
      cumulative = end
    }

    bars.push({
      id: `bar-${i}`,
      label: item.label,
      value: item.value,
      formattedValue: formatValue(
        type === 'total' ? end : item.value,
        valueFormat,
        currencySymbol
      ),
      start,
      end,
      type,
      color: getBarColor(type, positiveColor, negativeColor, totalColor)
    })
  }

  return bars
}

/**
 * Waterfall component registration
 */
export const waterfallRegistration = defineComponent<WaterfallConfig, WaterfallProps>({
  metadata: WaterfallMetadata,
  configSchema: WaterfallSchema,
  component: Waterfall,
  containerClass: 'waterfall-wrapper',

  // Data binding: extract items
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Waterfall] No data available')
        return null
      }

      const labelCol = config.labelColumn
      const valueCol = config.valueColumn
      const totalCol = config.totalColumn

      if (!labelCol || !valueCol) {
        console.warn('[Waterfall] labelColumn and valueColumn are required')
        return null
      }

      // Extract items from query result
      const rawItems: RawItem[] = []

      for (const row of queryResult.data) {
        const label = String(row[labelCol] || '')
        const value = parseFloat(String(row[valueCol] || 0))
        const isTotal = totalCol
          ? Boolean(row[totalCol])
          : false

        if (label && !isNaN(value)) {
          rawItems.push({ label, value, isTotal })
        }
      }

      if (rawItems.length === 0) {
        console.warn('[Waterfall] No valid items found')
        return null
      }

      return rawItems
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): WaterfallProps => {
    const rawItems = rawData as RawItem[] | null

    if (!rawItems || rawItems.length === 0) {
      return {
        data: {
          bars: [],
          title: config.title,
          subtitle: config.subtitle,
          minValue: 0,
          maxValue: 100,
          config
        }
      }
    }

    const bars = buildWaterfallBars(rawItems, config)

    // Calculate min/max for scale
    const allPositions = bars.flatMap(bar => [bar.start, bar.end])
    const minValue = Math.min(...allPositions, 0)
    const maxValue = Math.max(...allPositions)

    return {
      data: {
        bars,
        title: config.title,
        subtitle: config.subtitle,
        minValue,
        maxValue,
        config
      }
    }
  }
})

export default waterfallRegistration
