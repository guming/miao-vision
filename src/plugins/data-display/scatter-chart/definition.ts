/**
 * Scatter Chart Component Definition (Adapter Layer)
 *
 * Transforms SQL query results into scatter plot data.
 */

import { defineComponent } from '@core/registry'
import { ScatterChartMetadata } from '@core/engine/chart-metadata'
import ScatterChart from './ScatterChart.svelte'
import type { ScatterChartConfig, ScatterChartData, ScatterPoint } from './types'

/**
 * Props passed to ScatterChart.svelte
 */
interface ScatterChartProps {
  data: ScatterChartData
}

/**
 * Default color palette
 */
const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

/**
 * Format a value
 */
function formatValue(
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
 * Config schema
 */
const ScatterChartSchema = {
  fields: [
    { name: 'data', type: 'string' as const, required: true },
    { name: 'x', type: 'string' as const, required: true },
    { name: 'y', type: 'string' as const, required: true },
    { name: 'group', type: 'string' as const, required: false },
    { name: 'size', type: 'string' as const, required: false },
    { name: 'title', type: 'string' as const, required: false },
    { name: 'subtitle', type: 'string' as const, required: false },
    { name: 'xLabel', type: 'string' as const, required: false },
    { name: 'yLabel', type: 'string' as const, required: false },
    { name: 'width', type: 'number' as const, required: false, default: 680 },
    { name: 'height', type: 'number' as const, required: false, default: 400 },
    { name: 'color', type: 'string' as const, required: false, default: '#3B82F6' },
    { name: 'showLabels', type: 'boolean' as const, required: false, default: true },
    { name: 'showLegend', type: 'boolean' as const, required: false, default: true },
    { name: 'showGrid', type: 'boolean' as const, required: false, default: true },
    { name: 'pointRadius', type: 'number' as const, required: false, default: 5 },
    { name: 'pointOpacity', type: 'number' as const, required: false, default: 0.7 },
    { name: 'valueFormat', type: 'string' as const, required: false, default: 'number' },
    { name: 'currencySymbol', type: 'string' as const, required: false, default: '$' }
  ]
}

/**
 * Scatter Chart component registration
 */
export const scatterChartRegistration = defineComponent<ScatterChartConfig, ScatterChartProps>({
  metadata: ScatterChartMetadata,
  configSchema: ScatterChartSchema,
  component: ScatterChart,
  containerClass: 'scatter-chart-wrapper',

  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[ScatterChart] No data available')
        return null
      }

      const xCol = config.x
      const yCol = config.y

      if (!xCol || !yCol) {
        console.warn('[ScatterChart] x and y columns are required')
        return null
      }

      const firstRow = queryResult.data[0]
      if (!(xCol in firstRow) || !(yCol in firstRow)) {
        console.warn('[ScatterChart] Required columns not found')
        return null
      }

      return queryResult.data
    }
  },

  buildProps: (config, rawData, _context): ScatterChartProps | null => {
    const rows = rawData as Record<string, unknown>[] | null

    if (!rows || rows.length === 0) {
      return {
        data: {
          config,
          points: [],
          groups: [],
          xMin: 0,
          xMax: 1,
          yMin: 0,
          yMax: 1
        }
      }
    }

    const xCol = config.x
    const yCol = config.y
    const groupCol = config.group
    const sizeCol = config.size
    const valueFormat = config.valueFormat || 'number'
    const currencySymbol = config.currencySymbol || '$'
    const colors = config.colors || DEFAULT_COLORS
    const defaultColor = config.color || '#3B82F6'
    const defaultRadius = config.pointRadius || 5

    // Extract unique groups
    const groupsSet = new Set<string>()
    if (groupCol) {
      for (const row of rows) {
        if (row[groupCol] !== undefined && row[groupCol] !== null) {
          groupsSet.add(String(row[groupCol]))
        }
      }
    }
    const groups = groupsSet.size > 0 ? Array.from(groupsSet) : []

    // Build color map for groups
    const groupColorMap = new Map<string, string>()
    groups.forEach((group, index) => {
      groupColorMap.set(group, colors[index % colors.length])
    })

    // Build points
    const points: ScatterPoint[] = []
    let xMin = Infinity
    let xMax = -Infinity
    let yMin = Infinity
    let yMax = -Infinity
    let sizeMin = Infinity
    let sizeMax = -Infinity

    // First pass: collect bounds
    for (const row of rows) {
      const xVal = typeof row[xCol] === 'number' ? row[xCol] : parseFloat(String(row[xCol]))
      const yVal = typeof row[yCol] === 'number' ? row[yCol] : parseFloat(String(row[yCol]))

      if (isNaN(xVal) || isNaN(yVal)) continue

      xMin = Math.min(xMin, xVal)
      xMax = Math.max(xMax, xVal)
      yMin = Math.min(yMin, yVal)
      yMax = Math.max(yMax, yVal)

      if (sizeCol && row[sizeCol] !== undefined) {
        const sizeVal = typeof row[sizeCol] === 'number' ? row[sizeCol] : parseFloat(String(row[sizeCol]))
        if (!isNaN(sizeVal)) {
          sizeMin = Math.min(sizeMin, sizeVal)
          sizeMax = Math.max(sizeMax, sizeVal)
        }
      }
    }

    // Handle edge cases
    if (xMin === Infinity) xMin = 0
    if (xMax === -Infinity) xMax = 1
    if (yMin === Infinity) yMin = 0
    if (yMax === -Infinity) yMax = 1
    if (xMin === xMax) {
      xMin = xMin - 1
      xMax = xMax + 1
    }
    if (yMin === yMax) {
      yMin = yMin - 1
      yMax = yMax + 1
    }

    const sizeRange = sizeMax > sizeMin ? sizeMax - sizeMin : 1

    // Second pass: create points
    for (const row of rows) {
      const xVal = typeof row[xCol] === 'number' ? row[xCol] : parseFloat(String(row[xCol]))
      const yVal = typeof row[yCol] === 'number' ? row[yCol] : parseFloat(String(row[yCol]))

      if (isNaN(xVal) || isNaN(yVal)) continue

      const group = groupCol && row[groupCol] !== null ? String(row[groupCol]) : undefined
      const color = group ? (groupColorMap.get(group) || defaultColor) : defaultColor

      // Calculate point size
      let pointSize = defaultRadius
      if (sizeCol && row[sizeCol] !== undefined) {
        const sizeVal = typeof row[sizeCol] === 'number' ? row[sizeCol] : parseFloat(String(row[sizeCol]))
        if (!isNaN(sizeVal)) {
          // Map size value to radius range (3-12)
          const normalized = (sizeVal - sizeMin) / sizeRange
          pointSize = 3 + normalized * 9
        }
      }

      points.push({
        x: xVal,
        y: yVal,
        size: pointSize,
        xValue: xVal,
        yValue: yVal,
        sizeValue: sizeCol && row[sizeCol] !== undefined ? Number(row[sizeCol]) : undefined,
        formatted: `(${formatValue(xVal, valueFormat, currencySymbol)}, ${formatValue(yVal, valueFormat, currencySymbol)})`,
        group,
        color
      })
    }

    return {
      data: {
        config,
        points,
        groups,
        xMin,
        xMax,
        yMin,
        yMax
      }
    }
  }
})

export default scatterChartRegistration
