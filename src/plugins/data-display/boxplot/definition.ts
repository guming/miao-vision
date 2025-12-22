/**
 * BoxPlot Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 * Implements box plot statistics calculation.
 */

import { defineComponent } from '@core/registry'
import { BoxPlotMetadata } from './metadata'
import { BoxPlotSchema } from './schema'
import BoxPlot from './BoxPlot.svelte'
import type { BoxPlotConfig, BoxPlotData, BoxPlotStats } from './types'

/**
 * Props passed to BoxPlot.svelte
 */
interface BoxPlotProps {
  data: BoxPlotData
}

/**
 * Raw grouped data from query
 */
interface GroupedValues {
  group: string
  values: number[]
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
 * Calculate percentile value from sorted array
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]

  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const fraction = index - lower

  if (upper >= sorted.length) return sorted[sorted.length - 1]
  if (lower === upper) return sorted[lower]

  return sorted[lower] + fraction * (sorted[upper] - sorted[lower])
}

/**
 * Calculate box plot statistics for a group of values
 */
export function calculateBoxStats(
  group: string,
  values: number[],
  outlierMultiplier: number = 1.5
): BoxPlotStats {
  if (values.length === 0) {
    return {
      group,
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      mean: 0,
      iqr: 0,
      lowerFence: 0,
      upperFence: 0,
      lowerOutliers: [],
      upperOutliers: [],
      count: 0
    }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const count = sorted.length

  // Calculate quartiles
  const q1 = percentile(sorted, 25)
  const median = percentile(sorted, 50)
  const q3 = percentile(sorted, 75)
  const iqr = q3 - q1

  // Calculate fences for outliers
  const lowerFence = q1 - outlierMultiplier * iqr
  const upperFence = q3 + outlierMultiplier * iqr

  // Separate outliers and calculate whisker endpoints
  const lowerOutliers: number[] = []
  const upperOutliers: number[] = []
  let whiskerMin = sorted[0]
  let whiskerMax = sorted[sorted.length - 1]

  for (const value of sorted) {
    if (value < lowerFence) {
      lowerOutliers.push(value)
    } else if (whiskerMin === sorted[0] || value < whiskerMin) {
      whiskerMin = value
      break
    }
  }

  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i] > upperFence) {
      upperOutliers.push(sorted[i])
    } else {
      whiskerMax = sorted[i]
      break
    }
  }

  // Ensure whisker endpoints are within fences
  whiskerMin = Math.max(whiskerMin, sorted.find(v => v >= lowerFence) ?? sorted[0])
  whiskerMax = Math.min(whiskerMax, [...sorted].reverse().find(v => v <= upperFence) ?? sorted[sorted.length - 1])

  // Calculate mean
  const mean = values.reduce((sum, v) => sum + v, 0) / count

  return {
    group,
    min: whiskerMin,
    q1,
    median,
    q3,
    max: whiskerMax,
    mean,
    iqr,
    lowerFence,
    upperFence,
    lowerOutliers,
    upperOutliers,
    count
  }
}

/**
 * BoxPlot component registration
 */
export const boxPlotRegistration = defineComponent<BoxPlotConfig, BoxPlotProps>({
  metadata: BoxPlotMetadata,
  configSchema: BoxPlotSchema,
  component: BoxPlot,
  containerClass: 'boxplot-wrapper',

  // Data binding: extract and group numeric values
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[BoxPlot] No data available')
        return null
      }

      const valueCol = config.valueColumn
      const groupCol = config.groupColumn

      if (!valueCol) {
        console.warn('[BoxPlot] valueColumn is required')
        return null
      }

      // Group values by group column (or use 'All' if no group column)
      const groups = new Map<string, number[]>()

      for (const row of queryResult.data) {
        const value = parseFloat(String(row[valueCol] || 0))
        if (isNaN(value)) continue

        const group = groupCol ? String(row[groupCol] || 'Unknown') : 'All'

        if (!groups.has(group)) {
          groups.set(group, [])
        }
        groups.get(group)!.push(value)
      }

      if (groups.size === 0) {
        console.warn('[BoxPlot] No valid numeric values found')
        return null
      }

      // Convert to array
      const groupedValues: GroupedValues[] = []
      for (const [group, values] of groups) {
        groupedValues.push({ group, values })
      }

      return groupedValues
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): BoxPlotProps => {
    const groupedValues = rawData as GroupedValues[] | null

    if (!groupedValues || groupedValues.length === 0) {
      return {
        data: {
          boxes: [],
          title: config.title,
          subtitle: config.subtitle,
          globalMin: 0,
          globalMax: 0,
          config
        }
      }
    }

    const outlierMultiplier = config.outlierMultiplier ?? 1.5

    // Calculate statistics for each group
    const boxes: BoxPlotStats[] = groupedValues.map(({ group, values }) =>
      calculateBoxStats(group, values, outlierMultiplier)
    )

    // Sort boxes alphabetically by group
    boxes.sort((a, b) => a.group.localeCompare(b.group))

    // Calculate global min/max for scaling
    let globalMin = Infinity
    let globalMax = -Infinity

    for (const box of boxes) {
      // Include outliers in global range if showing them
      if (config.showOutliers !== false) {
        for (const outlier of box.lowerOutliers) {
          globalMin = Math.min(globalMin, outlier)
        }
        for (const outlier of box.upperOutliers) {
          globalMax = Math.max(globalMax, outlier)
        }
      }
      globalMin = Math.min(globalMin, box.min)
      globalMax = Math.max(globalMax, box.max)
    }

    // Handle edge case where no values
    if (!isFinite(globalMin)) globalMin = 0
    if (!isFinite(globalMax)) globalMax = 100

    return {
      data: {
        boxes,
        title: config.title,
        subtitle: config.subtitle,
        globalMin,
        globalMax,
        config
      }
    }
  }
})

export default boxPlotRegistration
