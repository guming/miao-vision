/**
 * Treemap Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 * Implements a squarified treemap layout algorithm.
 */

import { defineComponent } from '@core/registry'
import { TreemapMetadata } from './metadata'
import { TreemapSchema } from './schema'
import Treemap from './Treemap.svelte'
import type { TreemapConfig, TreemapData, TreemapTile } from './types'

/**
 * Props passed to Treemap.svelte
 */
interface TreemapProps {
  data: TreemapData
}

/**
 * Raw item data from query
 */
interface RawItem {
  label: string
  value: number
  group?: string
}

/**
 * Rectangle for layout calculations
 */
interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Color schemes for tiles
 */
const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
  category: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'],
  blue: ['#1E40AF', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
  green: ['#166534', '#15803D', '#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7'],
  warm: ['#9A3412', '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5'],
  cool: ['#1E3A8A', '#1E40AF', '#3730A3', '#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE'],
  mono: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6']
}

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
 * Get color for an item based on scheme and index
 */
export function getTileColor(index: number, colorScheme: string = 'default'): string {
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.default
  return colors[index % colors.length]
}

/**
 * Calculate the aspect ratio for a row of items
 */
function worstRatio(row: RawItem[], width: number, areaScale: number): number {
  if (row.length === 0) return Infinity

  const rowSum = row.reduce((sum, item) => sum + item.value, 0)
  const rowArea = rowSum * areaScale
  const rowWidth = rowArea / width

  let worst = 0
  for (const item of row) {
    const itemArea = item.value * areaScale
    const itemHeight = itemArea / rowWidth
    const ratio = Math.max(rowWidth / itemHeight, itemHeight / rowWidth)
    worst = Math.max(worst, ratio)
  }

  return worst
}

/**
 * Squarified treemap layout algorithm
 * Attempts to create tiles with aspect ratios close to 1 (squares)
 */
export function squarify(
  items: RawItem[],
  rect: Rect,
  totalValue: number,
  padding: number = 2
): TreemapTile[] {
  if (items.length === 0 || totalValue <= 0) return []

  const tiles: TreemapTile[] = []
  const areaScale = (rect.width * rect.height) / totalValue

  // Sort items by value (largest first)
  const sortedItems = [...items].sort((a, b) => b.value - a.value)

  let remaining = [...sortedItems]
  let currentRect = { ...rect }

  while (remaining.length > 0) {
    const width = Math.min(currentRect.width, currentRect.height)
    const row: RawItem[] = []

    // Add items to row while aspect ratio improves
    let currentWorst = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const testRow = [...row, remaining[i]]
      const newWorst = worstRatio(testRow, width, areaScale)

      if (newWorst <= currentWorst) {
        row.push(remaining[i])
        currentWorst = newWorst
      } else {
        break
      }
    }

    // If no items added, force add one
    if (row.length === 0 && remaining.length > 0) {
      row.push(remaining[0])
    }

    // Calculate row dimensions
    const rowSum = row.reduce((sum, item) => sum + item.value, 0)
    const rowArea = rowSum * areaScale
    const isHorizontal = currentRect.width >= currentRect.height
    const rowSize = rowArea / width

    // Position tiles in this row
    let offset = 0
    for (const item of row) {
      const itemArea = item.value * areaScale
      const itemSize = itemArea / rowSize

      const tile: Omit<TreemapTile, 'id' | 'formattedValue' | 'percent' | 'color'> = {
        label: item.label,
        value: item.value,
        group: item.group,
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }

      if (isHorizontal) {
        tile.x = currentRect.x + padding / 2
        tile.y = currentRect.y + offset + padding / 2
        tile.width = rowSize - padding
        tile.height = itemSize - padding
      } else {
        tile.x = currentRect.x + offset + padding / 2
        tile.y = currentRect.y + padding / 2
        tile.width = itemSize - padding
        tile.height = rowSize - padding
      }

      // Ensure non-negative dimensions
      tile.width = Math.max(0, tile.width)
      tile.height = Math.max(0, tile.height)

      tiles.push(tile as TreemapTile)
      offset += itemSize
    }

    // Update remaining items and rect
    remaining = remaining.slice(row.length)

    if (isHorizontal) {
      currentRect = {
        x: currentRect.x + rowSize,
        y: currentRect.y,
        width: currentRect.width - rowSize,
        height: currentRect.height
      }
    } else {
      currentRect = {
        x: currentRect.x,
        y: currentRect.y + rowSize,
        width: currentRect.width,
        height: currentRect.height - rowSize
      }
    }
  }

  return tiles
}

/**
 * Treemap component registration
 */
export const treemapRegistration = defineComponent<TreemapConfig, TreemapProps>({
  metadata: TreemapMetadata,
  configSchema: TreemapSchema,
  component: Treemap,
  containerClass: 'treemap-wrapper',

  // Data binding: extract label-value pairs
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Treemap] No data available')
        return null
      }

      const labelCol = config.labelColumn
      const valueCol = config.valueColumn
      const groupCol = config.groupColumn

      if (!labelCol || !valueCol) {
        console.warn('[Treemap] labelColumn and valueColumn are required')
        return null
      }

      // Extract items from query result
      const rawItems: RawItem[] = []

      for (const row of queryResult.data) {
        const label = String(row[labelCol] || '')
        const value = parseFloat(String(row[valueCol] || 0))
        const group = groupCol ? String(row[groupCol] || '') : undefined

        if (label && !isNaN(value) && value > 0) {
          rawItems.push({ label, value, group })
        }
      }

      if (rawItems.length === 0) {
        console.warn('[Treemap] No valid items found')
        return null
      }

      return rawItems
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): TreemapProps => {
    const rawItems = rawData as RawItem[] | null

    if (!rawItems || rawItems.length === 0) {
      return {
        data: {
          tiles: [],
          title: config.title,
          subtitle: config.subtitle,
          totalValue: 0,
          config
        }
      }
    }

    const height = config.height || 400
    const width = 600 // Default width, will scale in component
    const padding = config.tilePadding ?? 2
    const colorScheme = config.colorScheme || 'default'
    const valueFormat = config.valueFormat || 'number'
    const currencySymbol = config.currencySymbol || '$'

    const totalValue = rawItems.reduce((sum, item) => sum + item.value, 0)

    // Layout the treemap
    const rect: Rect = { x: 0, y: 0, width, height }
    const layoutTiles = squarify(rawItems, rect, totalValue, padding)

    // Add computed properties to tiles
    const tiles: TreemapTile[] = layoutTiles.map((tile, index) => ({
      ...tile,
      id: `tile-${index}`,
      formattedValue: formatValue(tile.value, valueFormat, currencySymbol),
      percent: (tile.value / totalValue) * 100,
      color: getTileColor(index, colorScheme)
    }))

    return {
      data: {
        tiles,
        title: config.title,
        subtitle: config.subtitle,
        totalValue,
        config
      }
    }
  }
})

export default treemapRegistration
