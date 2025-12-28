/**
 * Area Chart Component Definition (Adapter Layer)
 *
 * Transforms SQL query results into area chart data with SVG paths.
 */

import { defineComponent } from '@core/registry'
import { AreaChartMetadata } from '@core/engine/chart-metadata'
import AreaChart from './AreaChart.svelte'
import type { AreaChartConfig, AreaChartData, AreaSeries, AreaPoint } from './types'

/**
 * Props passed to AreaChart.svelte
 */
interface AreaChartProps {
  data: AreaChartData
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
 * Generate SVG path for area (filled region)
 */
function generateAreaPath(
  points: AreaPoint[],
  xValues: (number | string)[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  chartWidth: number,
  chartHeight: number,
  xIsNumeric: boolean
): string {
  if (points.length === 0) return ''

  const pathParts: string[] = []

  // Draw top line (forward)
  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const x = xIsNumeric
      ? ((Number(point.xValue) - xMin) / (xMax - xMin)) * chartWidth
      : (xValues.indexOf(point.xValue) / Math.max(xValues.length - 1, 1)) * chartWidth
    const y = chartHeight - ((point.y - yMin) / (yMax - yMin)) * chartHeight

    if (i === 0) {
      pathParts.push(`M ${x} ${y}`)
    } else {
      pathParts.push(`L ${x} ${y}`)
    }
  }

  // Draw bottom line (reverse)
  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i]
    const x = xIsNumeric
      ? ((Number(point.xValue) - xMin) / (xMax - xMin)) * chartWidth
      : (xValues.indexOf(point.xValue) / Math.max(xValues.length - 1, 1)) * chartWidth
    const y0 = chartHeight - ((point.y0 - yMin) / (yMax - yMin)) * chartHeight

    pathParts.push(`L ${x} ${y0}`)
  }

  pathParts.push('Z')  // Close path
  return pathParts.join(' ')
}

/**
 * Generate SVG path for line (top edge of area)
 */
function generateLinePath(
  points: AreaPoint[],
  xValues: (number | string)[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  chartWidth: number,
  chartHeight: number,
  xIsNumeric: boolean
): string {
  if (points.length === 0) return ''

  const pathParts: string[] = []

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const x = xIsNumeric
      ? ((Number(point.xValue) - xMin) / (xMax - xMin)) * chartWidth
      : (xValues.indexOf(point.xValue) / Math.max(xValues.length - 1, 1)) * chartWidth
    const y = chartHeight - ((point.y - yMin) / (yMax - yMin)) * chartHeight

    if (i === 0) {
      pathParts.push(`M ${x} ${y}`)
    } else {
      pathParts.push(`L ${x} ${y}`)
    }
  }

  return pathParts.join(' ')
}

/**
 * Config schema
 */
const AreaChartSchema = {
  fields: [
    { name: 'data', type: 'string' as const, required: true },
    { name: 'x', type: 'string' as const, required: true },
    { name: 'y', type: 'string' as const, required: true },
    { name: 'group', type: 'string' as const, required: false },
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
    { name: 'showLine', type: 'boolean' as const, required: false, default: true },
    { name: 'fillOpacity', type: 'number' as const, required: false, default: 0.7 },
    { name: 'strokeWidth', type: 'number' as const, required: false, default: 2 },
    { name: 'stacked', type: 'boolean' as const, required: false, default: false },
    { name: 'valueFormat', type: 'string' as const, required: false, default: 'number' },
    { name: 'currencySymbol', type: 'string' as const, required: false, default: '$' }
  ]
}

/**
 * Area Chart component registration
 */
export const areaChartRegistration = defineComponent<AreaChartConfig, AreaChartProps>({
  metadata: AreaChartMetadata,
  configSchema: AreaChartSchema,
  component: AreaChart,
  containerClass: 'area-chart-wrapper',

  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[AreaChart] No data available')
        return null
      }

      const xCol = config.x
      const yCol = config.y

      if (!xCol || !yCol) {
        console.warn('[AreaChart] x and y columns are required')
        return null
      }

      const firstRow = queryResult.data[0]
      if (!(xCol in firstRow) || !(yCol in firstRow)) {
        console.warn('[AreaChart] Required columns not found')
        return null
      }

      return queryResult.data
    }
  },

  buildProps: (config, rawData, _context): AreaChartProps | null => {
    const rows = rawData as Record<string, unknown>[] | null

    if (!rows || rows.length === 0) {
      return {
        data: {
          config,
          series: [],
          xValues: [],
          xMin: 0,
          xMax: 1,
          yMin: 0,
          yMax: 1,
          xIsNumeric: true
        }
      }
    }

    const xCol = config.x
    const yCol = config.y
    const groupCol = config.group
    const valueFormat = config.valueFormat || 'number'
    const currencySymbol = config.currencySymbol || '$'
    const colors = config.colors || DEFAULT_COLORS
    const defaultColor = config.color || '#3B82F6'
    const stacked = config.stacked || false

    const width = config.width || 680
    const height = config.height || 400
    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    // Extract x values
    const xValuesSet = new Set<number | string>()
    let xIsNumeric = true

    for (const row of rows) {
      const xVal = row[xCol]
      if (xVal !== null && xVal !== undefined) {
        const numVal = Number(xVal)
        if (!isNaN(numVal)) {
          xValuesSet.add(numVal)
        } else {
          xValuesSet.add(String(xVal))
          xIsNumeric = false
        }
      }
    }

    const xValues = Array.from(xValuesSet).sort((a, b) => {
      if (xIsNumeric) {
        return Number(a) - Number(b)
      }
      return String(a).localeCompare(String(b))
    })

    // Extract groups
    const groupsSet = new Set<string>()
    if (groupCol) {
      for (const row of rows) {
        if (row[groupCol] !== undefined && row[groupCol] !== null) {
          groupsSet.add(String(row[groupCol]))
        }
      }
    }
    const groups = groupsSet.size > 0 ? Array.from(groupsSet) : ['default']

    // Build series data
    const seriesMap = new Map<string, Map<number | string, number>>()
    for (const group of groups) {
      seriesMap.set(group, new Map())
    }

    for (const row of rows) {
      const xVal = row[xCol]
      const yVal = typeof row[yCol] === 'number' ? row[yCol] : parseFloat(String(row[yCol])) || 0
      const group = groupCol && row[groupCol] !== null ? String(row[groupCol]) : 'default'

      if (xVal === null || xVal === undefined) continue

      const xValue = xIsNumeric ? Number(xVal) : String(xVal)
      seriesMap.get(group)?.set(xValue, yVal)
    }

    // Calculate stacked values and bounds
    let yMin = stacked ? 0 : Infinity
    let yMax = -Infinity

    const seriesData: Array<{ group: string; points: AreaPoint[] }> = []

    for (const group of groups) {
      const points: AreaPoint[] = []
      const dataMap = seriesMap.get(group)!

      for (const xValue of xValues) {
        const yValue = dataMap.get(xValue) || 0

        // Calculate baseline (y0) for stacking
        let y0 = 0
        if (stacked) {
          // Sum all previous groups' values at this x
          for (const prevGroup of groups) {
            if (prevGroup === group) break
            const prevData = seriesMap.get(prevGroup)
            y0 += prevData?.get(xValue) || 0
          }
        }

        const y = y0 + yValue

        points.push({
          x: xIsNumeric ? Number(xValue) : xValues.indexOf(xValue),
          y,
          y0,
          xValue,
          yValue,
          formatted: formatValue(yValue, valueFormat, currencySymbol),
          group
        })

        if (!stacked) {
          yMin = Math.min(yMin, yValue)
        }
        yMax = Math.max(yMax, y)
      }

      seriesData.push({ group, points })
    }

    if (yMin === Infinity) yMin = 0
    if (yMin === yMax) {
      yMin = yMin - 1
      yMax = yMax + 1
    }

    const xMin = xIsNumeric ? Number(xValues[0]) : 0
    const xMax = xIsNumeric ? Number(xValues[xValues.length - 1]) : xValues.length - 1

    // Create series with SVG paths
    const series: AreaSeries[] = []
    seriesData.forEach((sd, index) => {
      const color = groups.length > 1 ? colors[index % colors.length] : defaultColor

      const areaPath = generateAreaPath(
        sd.points,
        xValues,
        xMin,
        xMax,
        yMin,
        yMax,
        chartWidth,
        chartHeight,
        xIsNumeric
      )

      const linePath = generateLinePath(
        sd.points,
        xValues,
        xMin,
        xMax,
        yMin,
        yMax,
        chartWidth,
        chartHeight,
        xIsNumeric
      )

      series.push({
        id: `series-${sd.group}`,
        label: sd.group === 'default' ? config.yLabel || config.y : sd.group,
        points: sd.points,
        color,
        areaPath,
        linePath
      })
    })

    return {
      data: {
        config,
        series,
        xValues,
        xMin,
        xMax,
        yMin,
        yMax,
        xIsNumeric
      }
    }
  }
})

export default areaChartRegistration
