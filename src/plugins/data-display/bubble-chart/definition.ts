/**
 * Bubble Chart Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 * Transforms SQL query results into bubble chart data.
 */

import { defineComponent } from '@core/registry'
import { BubbleChartMetadata } from './metadata'
import BubbleChart from './BubbleChart.svelte'
import type { BubbleChartConfig, BubbleChartData, BubbleItem } from './types'

/**
 * Props passed to BubbleChart.svelte
 */
interface BubbleChartProps {
  data: BubbleChartData
}

/**
 * Default color palette for grouped bubbles
 */
const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

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
 * Validate query data for bubble chart
 */
export function validateBubbleChartData(
  queryResult: { data?: Record<string, unknown>[] },
  config: BubbleChartConfig
): Record<string, unknown>[] | null {
  if (!queryResult.data || queryResult.data.length === 0) {
    console.warn('[BubbleChart] No data available')
    return null
  }

  const xCol = config.x
  const yCol = config.y
  const sizeCol = config.size

  if (!xCol || !yCol || !sizeCol) {
    console.warn('[BubbleChart] x, y, and size columns are required')
    return null
  }

  // Validate columns exist
  const firstRow = queryResult.data[0]
  if (!(xCol in firstRow)) {
    console.warn(`[BubbleChart] Column "${xCol}" not found in data`)
    return null
  }
  if (!(yCol in firstRow)) {
    console.warn(`[BubbleChart] Column "${yCol}" not found in data`)
    return null
  }
  if (!(sizeCol in firstRow)) {
    console.warn(`[BubbleChart] Column "${sizeCol}" not found in data`)
    return null
  }

  return queryResult.data
}

/**
 * Build bubble chart data from rows
 */
export function buildBubbleChartData(
  rows: Record<string, unknown>[],
  config: BubbleChartConfig
): BubbleChartData {
  const xCol = config.x
  const yCol = config.y
  const sizeCol = config.size
  const labelCol = config.label
  const groupCol = config.group
  const valueFormat = config.valueFormat || 'number'
  const currencySymbol = config.currencySymbol || '$'
  const colors = config.colors || DEFAULT_COLORS
  const defaultColor = config.color || '#3B82F6'
  const minBubbleSize = config.minBubbleSize || 10
  const maxBubbleSize = config.maxBubbleSize || 50

  // Extract unique groups
  const groupsSet = new Set<string>()
  if (groupCol) {
    for (const row of rows) {
      if (row[groupCol] !== undefined) {
        groupsSet.add(String(row[groupCol]))
      }
    }
  }
  const groups = Array.from(groupsSet)

  // Create bubbles and calculate ranges
  const bubbles: BubbleItem[] = []
  let xMin = Infinity
  let xMax = -Infinity
  let yMin = Infinity
  let yMax = -Infinity
  let sizeMin = Infinity
  let sizeMax = -Infinity

  for (const row of rows) {
    const x = typeof row[xCol] === 'number' ? row[xCol] : parseFloat(String(row[xCol])) || 0
    const y = typeof row[yCol] === 'number' ? row[yCol] : parseFloat(String(row[yCol])) || 0
    const size = typeof row[sizeCol] === 'number' ? row[sizeCol] : parseFloat(String(row[sizeCol])) || 0
    const label = labelCol ? String(row[labelCol] ?? '') : undefined
    const group = groupCol ? String(row[groupCol] ?? '') : undefined
    const groupIndex = group ? groups.indexOf(group) : 0
    const color = groups.length > 0 ? colors[groupIndex % colors.length] : defaultColor

    bubbles.push({
      id: `bubble-${bubbles.length}`,
      x,
      y,
      size,
      radius: 0, // Will be calculated after size range is known
      label,
      group,
      color,
      formatted: {
        x: formatValue(x, valueFormat, currencySymbol),
        y: formatValue(y, valueFormat, currencySymbol),
        size: formatValue(size, valueFormat, currencySymbol)
      }
    })

    xMin = Math.min(xMin, x)
    xMax = Math.max(xMax, x)
    yMin = Math.min(yMin, y)
    yMax = Math.max(yMax, y)
    sizeMin = Math.min(sizeMin, size)
    sizeMax = Math.max(sizeMax, size)
  }

  // Handle edge cases
  if (xMin === Infinity) xMin = 0
  if (xMax === -Infinity) xMax = 1
  if (yMin === Infinity) yMin = 0
  if (yMax === -Infinity) yMax = 1
  if (sizeMin === Infinity) sizeMin = 0
  if (sizeMax === -Infinity) sizeMax = 1
  if (sizeMax === sizeMin) sizeMax = sizeMin + 1

  // Add padding to ranges (10%)
  const xPadding = (xMax - xMin) * 0.1
  const yPadding = (yMax - yMin) * 0.1
  xMin -= xPadding
  xMax += xPadding
  yMin -= yPadding
  yMax += yPadding

  // Calculate bubble radii
  const sizeRange = sizeMax - sizeMin
  for (const bubble of bubbles) {
    const normalized = sizeRange > 0 ? (bubble.size - sizeMin) / sizeRange : 0.5
    bubble.radius = minBubbleSize + normalized * (maxBubbleSize - minBubbleSize)
  }

  return {
    bubbles,
    groups,
    xRange: [xMin, xMax],
    yRange: [yMin, yMax],
    sizeRange: [sizeMin, sizeMax],
    config
  }
}

/**
 * Config schema for bubble chart
 */
const BubbleChartSchema = {
  fields: [
    { name: 'data', type: 'string' as const, required: true },
    { name: 'x', type: 'string' as const, required: true },
    { name: 'y', type: 'string' as const, required: true },
    { name: 'size', type: 'string' as const, required: true },
    { name: 'label', type: 'string' as const, required: false },
    { name: 'group', type: 'string' as const, required: false },
    { name: 'title', type: 'string' as const, required: false },
    { name: 'subtitle', type: 'string' as const, required: false },
    { name: 'xLabel', type: 'string' as const, required: false },
    { name: 'yLabel', type: 'string' as const, required: false },
    { name: 'height', type: 'number' as const, required: false, default: 400 },
    { name: 'width', type: 'number' as const, required: false, default: 600 },
    { name: 'color', type: 'string' as const, required: false, default: '#3B82F6' },
    { name: 'minBubbleSize', type: 'number' as const, required: false, default: 10 },
    { name: 'maxBubbleSize', type: 'number' as const, required: false, default: 50 },
    { name: 'showLabels', type: 'boolean' as const, required: false, default: true },
    { name: 'showLegend', type: 'boolean' as const, required: false, default: true },
    { name: 'showGrid', type: 'boolean' as const, required: false, default: true },
    { name: 'opacity', type: 'number' as const, required: false, default: 0.7 },
    { name: 'showTooltips', type: 'boolean' as const, required: false, default: true },
    { name: 'valueFormat', type: 'string' as const, required: false, default: 'number' },
    { name: 'currencySymbol', type: 'string' as const, required: false, default: '$' }
  ]
}

/**
 * Bubble Chart component registration
 */
export const bubbleChartRegistration = defineComponent<BubbleChartConfig, BubbleChartProps>({
  metadata: BubbleChartMetadata,
  configSchema: BubbleChartSchema,
  component: BubbleChart,
  containerClass: 'bubble-chart-wrapper',

  // Data binding: extract rows from SQL query
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => validateBubbleChartData(queryResult, config)
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): BubbleChartProps => {
    const rows = rawData as Record<string, unknown>[] | null

    // Empty state
    if (!rows || rows.length === 0) {
      return {
        data: {
          bubbles: [],
          groups: [],
          xRange: [0, 1],
          yRange: [0, 1],
          sizeRange: [0, 1],
          config
        }
      }
    }

    return {
      data: buildBubbleChartData(rows, config)
    }
  }
})

export default bubbleChartRegistration
