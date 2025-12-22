/**
 * Radar Chart Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent } from '@core/registry'
import { RadarMetadata } from './metadata'
import { RadarSchema } from './schema'
import Radar from './Radar.svelte'
import type { RadarConfig, RadarData, RadarAxis, RadarSeries, RadarPoint, RadarGridLevel } from './types'

/**
 * Props passed to Radar.svelte
 */
interface RadarProps {
  data: RadarData
}

/**
 * Default color palette
 */
const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316'  // orange
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
 * Calculate angle for each axis
 */
export function calculateAxisAngle(index: number, totalAxes: number): number {
  // Start from top (-90 degrees) and go clockwise
  return (Math.PI * 2 * index) / totalAxes - Math.PI / 2
}

/**
 * Convert polar coordinates to cartesian
 */
export function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  }
}

/**
 * Build axes from dimension labels
 */
export function buildAxes(labels: string[], radius: number): RadarAxis[] {
  const labelOffset = 1.15 // Position labels slightly outside the chart

  return labels.map((label, index) => {
    const angle = calculateAxisAngle(index, labels.length)
    const labelPos = polarToCartesian(angle, radius * labelOffset)

    // Determine text anchor based on position
    let anchor: 'start' | 'middle' | 'end' = 'middle'
    const normalizedX = Math.cos(angle)
    if (normalizedX < -0.1) {
      anchor = 'end'
    } else if (normalizedX > 0.1) {
      anchor = 'start'
    }

    return {
      id: `axis-${index}`,
      label,
      angle,
      labelX: labelPos.x,
      labelY: labelPos.y,
      anchor
    }
  })
}

/**
 * Build grid levels (concentric polygons)
 */
export function buildGridLevels(
  axes: RadarAxis[],
  levels: number,
  radius: number,
  minValue: number,
  maxValue: number,
  valueFormat: 'number' | 'currency' | 'percent',
  currencySymbol: string
): RadarGridLevel[] {
  const gridLevels: RadarGridLevel[] = []

  for (let i = 1; i <= levels; i++) {
    const levelRadius = (radius * i) / levels
    const levelValue = minValue + ((maxValue - minValue) * i) / levels

    // Build polygon path for this level
    const points = axes.map(axis => {
      const pos = polarToCartesian(axis.angle, levelRadius)
      return `${pos.x},${pos.y}`
    })

    gridLevels.push({
      level: i,
      radius: levelRadius,
      value: levelValue,
      formattedValue: formatValue(levelValue, valueFormat, currencySymbol),
      path: `M ${points.join(' L ')} Z`
    })
  }

  return gridLevels
}

/**
 * Normalize a value to 0-1 range
 */
export function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

/**
 * Build a series of radar points
 */
export function buildSeries(
  seriesName: string,
  values: number[],
  axes: RadarAxis[],
  radius: number,
  minValue: number,
  maxValue: number,
  color: string,
  valueFormat: 'number' | 'currency' | 'percent',
  currencySymbol: string,
  seriesIndex: number
): RadarSeries {
  const points: RadarPoint[] = axes.map((axis, i) => {
    const value = values[i] ?? 0
    const normalized = normalizeValue(value, minValue, maxValue)
    const pos = polarToCartesian(axis.angle, radius * normalized)

    return {
      axisId: axis.id,
      value,
      normalizedValue: normalized,
      x: pos.x,
      y: pos.y,
      formattedValue: formatValue(value, valueFormat, currencySymbol)
    }
  })

  // Build polygon path
  const pathPoints = points.map(p => `${p.x},${p.y}`)
  const path = `M ${pathPoints.join(' L ')} Z`

  return {
    id: `series-${seriesIndex}`,
    name: seriesName,
    color,
    points,
    path
  }
}

/**
 * Extract series data from query result
 */
function extractSeriesData(
  queryResult: { data: Record<string, unknown>[] },
  config: RadarConfig
): { labels: string[]; seriesMap: Map<string, Map<string, number>> } {
  const labelCol = config.labelColumn
  const valueCol = config.valueColumn
  const seriesCol = config.seriesColumn

  const labels = new Set<string>()
  const seriesMap = new Map<string, Map<string, number>>()

  // Handle single value column or multiple
  const valueColumns = typeof valueCol === 'string'
    ? valueCol.split(',').map(s => s.trim())
    : valueCol

  for (const row of queryResult.data) {
    const label = String(row[labelCol] || '')
    if (!label) continue

    labels.add(label)

    if (seriesCol && row[seriesCol]) {
      // Grouped by series column
      const seriesName = String(row[seriesCol])
      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, new Map())
      }
      const series = seriesMap.get(seriesName)!
      const value = parseFloat(String(row[valueColumns[0]] || 0))
      if (!isNaN(value)) {
        series.set(label, value)
      }
    } else {
      // Multiple value columns as separate series
      for (const col of valueColumns) {
        if (!seriesMap.has(col)) {
          seriesMap.set(col, new Map())
        }
        const series = seriesMap.get(col)!
        const value = parseFloat(String(row[col] || 0))
        if (!isNaN(value)) {
          series.set(label, value)
        }
      }
    }
  }

  return {
    labels: Array.from(labels),
    seriesMap
  }
}

/**
 * Radar component registration
 */
export const radarRegistration = defineComponent<RadarConfig, RadarProps>({
  metadata: RadarMetadata,
  configSchema: RadarSchema,
  component: Radar,
  containerClass: 'radar-wrapper',

  // Data binding: extract items
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Radar] No data available')
        return null
      }

      const labelCol = config.labelColumn
      const valueCol = config.valueColumn

      if (!labelCol || !valueCol) {
        console.warn('[Radar] labelColumn and valueColumn are required')
        return null
      }

      return extractSeriesData(queryResult, config)
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): RadarProps => {
    const extracted = rawData as { labels: string[]; seriesMap: Map<string, Map<string, number>> } | null

    if (!extracted || extracted.labels.length === 0) {
      return {
        data: {
          axes: [],
          series: [],
          gridLevels: [],
          title: config.title,
          subtitle: config.subtitle,
          centerX: 200,
          centerY: 200,
          radius: 150,
          minValue: 0,
          maxValue: 100,
          config
        }
      }
    }

    const { labels, seriesMap } = extracted
    const height = config.height || 400
    const padding = 60 // Space for labels
    const centerX = height / 2
    const centerY = height / 2
    const radius = (height - padding * 2) / 2

    // Calculate min/max values across all series
    let allValues: number[] = []
    for (const series of seriesMap.values()) {
      allValues = allValues.concat(Array.from(series.values()))
    }

    const minValue = config.min ?? 0
    const maxValue = config.max ?? (allValues.length > 0 ? Math.max(...allValues) * 1.1 : 100)

    const valueFormat = config.valueFormat || 'number'
    const currencySymbol = config.currencySymbol || '$'
    const levels = config.levels || 5
    const colors = config.colors || DEFAULT_COLORS

    // Build axes
    const axes = buildAxes(labels, radius)

    // Build grid levels
    const gridLevels = buildGridLevels(
      axes,
      levels,
      radius,
      minValue,
      maxValue,
      valueFormat,
      currencySymbol
    )

    // Build series
    const series: RadarSeries[] = []
    let seriesIndex = 0

    for (const [seriesName, valueMap] of seriesMap) {
      const values = labels.map(label => valueMap.get(label) ?? 0)
      const color = colors[seriesIndex % colors.length]

      series.push(buildSeries(
        seriesName,
        values,
        axes,
        radius,
        minValue,
        maxValue,
        color,
        valueFormat,
        currencySymbol,
        seriesIndex
      ))

      seriesIndex++
    }

    return {
      data: {
        axes,
        series,
        gridLevels,
        title: config.title,
        subtitle: config.subtitle,
        centerX,
        centerY,
        radius,
        minValue,
        maxValue,
        config
      }
    }
  }
})

export default radarRegistration
