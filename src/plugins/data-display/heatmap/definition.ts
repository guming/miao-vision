/**
 * Heatmap Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent } from '@core/registry'
import { HeatmapMetadata } from './metadata'
import { HeatmapSchema } from './schema'
import Heatmap from './Heatmap.svelte'
import type { HeatmapConfig, HeatmapData, HeatmapCell } from './types'

/**
 * Props passed to Heatmap.svelte
 */
interface HeatmapProps {
  data: HeatmapData
}

/**
 * Raw data item from query
 */
interface RawItem {
  xLabel: string
  yLabel: string
  value: number
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    return { r: 0, g: 0, b: 0 }
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  }
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(color1: string, color2: string, t: number): string {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  const r = rgb1.r + (rgb2.r - rgb1.r) * t
  const g = rgb1.g + (rgb2.g - rgb1.g) * t
  const b = rgb1.b + (rgb2.b - rgb1.b) * t

  return rgbToHex(r, g, b)
}

/**
 * Get color for a normalized value (0-1)
 */
export function getColorForValue(
  normalizedValue: number,
  minColor: string,
  maxColor: string,
  midColor?: string
): string {
  if (midColor) {
    // Three-point gradient (diverging)
    if (normalizedValue <= 0.5) {
      return interpolateColor(minColor, midColor, normalizedValue * 2)
    } else {
      return interpolateColor(midColor, maxColor, (normalizedValue - 0.5) * 2)
    }
  }
  // Two-point gradient
  return interpolateColor(minColor, maxColor, normalizedValue)
}

/**
 * Format a value based on format type
 */
export function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number',
  currencySymbol: string = '$',
  decimals: number = 1
): string {
  if (format === 'currency') {
    return `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  }
  if (format === 'percent') {
    return `${value.toFixed(decimals)}%`
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/**
 * Normalize a value to 0-1 range
 */
export function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

/**
 * Build heatmap cells from raw data
 */
export function buildHeatmapCells(
  items: RawItem[],
  xLabels: string[],
  yLabels: string[],
  config: HeatmapConfig,
  minValue: number,
  maxValue: number
): HeatmapCell[] {
  const minColor = config.minColor || '#f0f9ff'
  const maxColor = config.maxColor || '#1e40af'
  const midColor = config.midColor
  const valueFormat = config.valueFormat || 'number'
  const currencySymbol = config.currencySymbol || '$'
  const decimals = config.decimals ?? 1

  // Create a lookup map for quick access
  const valueMap = new Map<string, number>()
  for (const item of items) {
    const key = `${item.yLabel}|${item.xLabel}`
    valueMap.set(key, item.value)
  }

  const cells: HeatmapCell[] = []

  for (let row = 0; row < yLabels.length; row++) {
    for (let col = 0; col < xLabels.length; col++) {
      const yLabel = yLabels[row]
      const xLabel = xLabels[col]
      const key = `${yLabel}|${xLabel}`
      const value = valueMap.get(key) ?? 0
      const normalizedVal = normalizeValue(value, minValue, maxValue)

      cells.push({
        id: `cell-${row}-${col}`,
        xLabel,
        yLabel,
        value,
        normalizedValue: normalizedVal,
        color: getColorForValue(normalizedVal, minColor, maxColor, midColor),
        formattedValue: formatValue(value, valueFormat, currencySymbol, decimals),
        row,
        col
      })
    }
  }

  return cells
}

/**
 * Heatmap component registration
 */
export const heatmapRegistration = defineComponent<HeatmapConfig, HeatmapProps>({
  metadata: HeatmapMetadata,
  configSchema: HeatmapSchema,
  component: Heatmap,
  containerClass: 'heatmap-wrapper',

  // Data binding: extract items
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Heatmap] No data available')
        return null
      }

      const xCol = config.xColumn
      const yCol = config.yColumn
      const valueCol = config.valueColumn

      if (!xCol || !yCol || !valueCol) {
        console.warn('[Heatmap] xColumn, yColumn, and valueColumn are required')
        return null
      }

      // Extract items from query result
      const items: RawItem[] = []
      const xLabelsSet = new Set<string>()
      const yLabelsSet = new Set<string>()

      for (const row of queryResult.data) {
        const xLabel = String(row[xCol] || '')
        const yLabel = String(row[yCol] || '')
        const value = parseFloat(String(row[valueCol] || 0))

        if (xLabel && yLabel && !isNaN(value)) {
          items.push({ xLabel, yLabel, value })
          xLabelsSet.add(xLabel)
          yLabelsSet.add(yLabel)
        }
      }

      if (items.length === 0) {
        console.warn('[Heatmap] No valid items found')
        return null
      }

      return {
        items,
        xLabels: Array.from(xLabelsSet),
        yLabels: Array.from(yLabelsSet)
      }
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): HeatmapProps => {
    const extracted = rawData as { items: RawItem[]; xLabels: string[]; yLabels: string[] } | null

    if (!extracted || extracted.items.length === 0) {
      return {
        data: {
          cells: [],
          xLabels: [],
          yLabels: [],
          title: config.title,
          subtitle: config.subtitle,
          minValue: 0,
          maxValue: 1,
          config
        }
      }
    }

    const { items, xLabels, yLabels } = extracted

    // Calculate min/max values
    const values = items.map(item => item.value)
    const minValue = config.min ?? Math.min(...values)
    const maxValue = config.max ?? Math.max(...values)

    // Build cells
    const cells = buildHeatmapCells(items, xLabels, yLabels, config, minValue, maxValue)

    return {
      data: {
        cells,
        xLabels,
        yLabels,
        title: config.title,
        subtitle: config.subtitle,
        minValue,
        maxValue,
        config
      }
    }
  }
})

export default heatmapRegistration
