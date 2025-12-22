/**
 * BulletChart Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent } from '@core/registry'
import { BulletChartMetadata } from './metadata'
import { BulletChartSchema } from './schema'
import BulletChart from './BulletChart.svelte'
import type { BulletChartConfig, BulletChartData, BulletItem } from './types'

/**
 * Props passed to BulletChart.svelte
 */
interface BulletChartProps {
  data: BulletChartData
}

/**
 * Raw item from query
 */
interface RawItem {
  label: string
  value: number
  target?: number
}

/**
 * Default qualitative ranges (percentages)
 */
const DEFAULT_RANGES = [60, 80, 100]

/**
 * Default range colors (poor, satisfactory, good)
 */
const DEFAULT_RANGE_COLORS = ['#e5e7eb', '#d1d5db', '#9ca3af']

/**
 * Format a value based on format type
 */
export function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number',
  currencySymbol: string = '$'
): string {
  if (format === 'currency') {
    return `${currencySymbol}${value.toLocaleString()}`
  }
  if (format === 'percent') {
    return `${value.toFixed(1)}%`
  }
  return value.toLocaleString()
}

/**
 * Calculate percentage of a value within a range
 */
export function calculatePercent(value: number, min: number, max: number): number {
  if (max === min) return 0
  return ((value - min) / (max - min)) * 100
}

/**
 * BulletChart component registration
 */
export const bulletChartRegistration = defineComponent<BulletChartConfig, BulletChartProps>({
  metadata: BulletChartMetadata,
  configSchema: BulletChartSchema,
  component: BulletChart,
  containerClass: 'bullet-chart-wrapper',

  // Data binding: extract items
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[BulletChart] No data available')
        return null
      }

      const valueCol = config.valueColumn
      const targetCol = config.targetColumn
      const labelCol = config.labelColumn

      if (!valueCol) {
        console.warn('[BulletChart] valueColumn is required')
        return null
      }

      // Extract items from query result
      const rawItems: RawItem[] = []

      for (let i = 0; i < queryResult.data.length; i++) {
        const row = queryResult.data[i]
        const value = parseFloat(String(row[valueCol] || 0))

        if (isNaN(value)) continue

        const label = labelCol ? String(row[labelCol] || `Item ${i + 1}`) : `Item ${i + 1}`
        const target = targetCol ? parseFloat(String(row[targetCol] || 0)) : undefined

        rawItems.push({
          label,
          value,
          target: target !== undefined && !isNaN(target) ? target : undefined
        })
      }

      if (rawItems.length === 0) {
        console.warn('[BulletChart] No valid items found')
        return null
      }

      return rawItems
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): BulletChartProps => {
    const rawItems = rawData as RawItem[] | null

    if (!rawItems || rawItems.length === 0) {
      return {
        data: {
          items: [],
          title: config.title,
          subtitle: config.subtitle,
          min: 0,
          max: 100,
          ranges: DEFAULT_RANGES,
          rangeColors: DEFAULT_RANGE_COLORS,
          config
        }
      }
    }

    const valueFormat = config.valueFormat || 'number'
    const currencySymbol = config.currencySymbol || '$'

    // Calculate min/max
    const allValues = rawItems.flatMap(item =>
      item.target !== undefined ? [item.value, item.target] : [item.value]
    )
    const min = config.min ?? 0
    const max = config.max ?? Math.max(...allValues) * 1.1 // Add 10% padding

    // Build bullet items
    const items: BulletItem[] = rawItems.map((item, index) => ({
      id: `bullet-${index}`,
      label: item.label,
      value: item.value,
      formattedValue: formatValue(item.value, valueFormat, currencySymbol),
      target: item.target,
      formattedTarget: item.target !== undefined
        ? formatValue(item.target, valueFormat, currencySymbol)
        : undefined,
      valuePercent: calculatePercent(item.value, min, max),
      targetPercent: item.target !== undefined
        ? calculatePercent(item.target, min, max)
        : undefined
    }))

    // Get ranges and colors
    const ranges = config.ranges || DEFAULT_RANGES
    const rangeColors = config.rangeColors || DEFAULT_RANGE_COLORS

    return {
      data: {
        items,
        title: config.title,
        subtitle: config.subtitle,
        min,
        max,
        ranges,
        rangeColors,
        config
      }
    }
  }
})

export default bulletChartRegistration
