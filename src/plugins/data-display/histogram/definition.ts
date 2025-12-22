/**
 * Histogram Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 * Implements histogram binning algorithm.
 */

import { defineComponent } from '@core/registry'
import { HistogramMetadata } from './metadata'
import { HistogramSchema } from './schema'
import Histogram from './Histogram.svelte'
import type { HistogramConfig, HistogramData, HistogramBin } from './types'

/**
 * Props passed to Histogram.svelte
 */
interface HistogramProps {
  data: HistogramData
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
 * Create histogram bins from an array of values
 */
export function createBins(
  values: number[],
  binCount: number,
  valueFormat: 'number' | 'currency' | 'percent' = 'number',
  currencySymbol: string = '$'
): HistogramBin[] {
  if (values.length === 0 || binCount <= 0) {
    return []
  }

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  // Handle case where all values are the same
  if (minValue === maxValue) {
    return [{
      id: 0,
      min: minValue,
      max: maxValue,
      count: values.length,
      label: formatValue(minValue, valueFormat, currencySymbol),
      percent: 100,
      heightPercent: 100
    }]
  }

  const range = maxValue - minValue
  const binWidth = range / binCount

  // Initialize bins
  const bins: HistogramBin[] = []
  for (let i = 0; i < binCount; i++) {
    const binMin = minValue + i * binWidth
    const binMax = minValue + (i + 1) * binWidth
    bins.push({
      id: i,
      min: binMin,
      max: binMax,
      count: 0,
      label: `${formatValue(binMin, valueFormat, currencySymbol)} - ${formatValue(binMax, valueFormat, currencySymbol)}`,
      percent: 0,
      heightPercent: 0
    })
  }

  // Count values in each bin
  for (const value of values) {
    // Find the appropriate bin
    let binIndex = Math.floor((value - minValue) / binWidth)
    // Handle edge case where value equals maxValue
    if (binIndex >= binCount) {
      binIndex = binCount - 1
    }
    bins[binIndex].count++
  }

  // Calculate percentages and heights
  const maxCount = Math.max(...bins.map(b => b.count))
  const totalCount = values.length

  for (const bin of bins) {
    bin.percent = (bin.count / totalCount) * 100
    bin.heightPercent = maxCount > 0 ? (bin.count / maxCount) * 100 : 0
  }

  return bins
}

/**
 * Calculate statistics for a set of values
 */
export function calculateStats(values: number[]): {
  min: number
  max: number
  mean: number
  median: number
  stdDev: number
} {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const sum = values.reduce((a, b) => a + b, 0)
  const mean = sum / values.length

  // Median
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]

  // Standard deviation
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  const stdDev = Math.sqrt(variance)

  return { min, max, mean, median, stdDev }
}

/**
 * Histogram component registration
 */
export const histogramRegistration = defineComponent<HistogramConfig, HistogramProps>({
  metadata: HistogramMetadata,
  configSchema: HistogramSchema,
  component: Histogram,
  containerClass: 'histogram-wrapper',

  // Data binding: extract numeric values
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Histogram] No data available')
        return null
      }

      const valueCol = config.valueColumn

      if (!valueCol) {
        console.warn('[Histogram] valueColumn is required')
        return null
      }

      // Extract numeric values
      const values: number[] = []

      for (const row of queryResult.data) {
        const value = parseFloat(String(row[valueCol] || 0))
        if (!isNaN(value)) {
          values.push(value)
        }
      }

      if (values.length === 0) {
        console.warn('[Histogram] No valid numeric values found')
        return null
      }

      return values
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): HistogramProps => {
    const values = rawData as number[] | null

    if (!values || values.length === 0) {
      return {
        data: {
          bins: [],
          title: config.title,
          subtitle: config.subtitle,
          totalCount: 0,
          maxCount: 0,
          minValue: 0,
          maxValue: 0,
          config
        }
      }
    }

    const binCount = config.bins || 10
    const valueFormat = config.valueFormat || 'number'
    const currencySymbol = config.currencySymbol || '$'

    const bins = createBins(values, binCount, valueFormat, currencySymbol)
    const stats = calculateStats(values)
    const maxCount = Math.max(...bins.map(b => b.count), 0)

    return {
      data: {
        bins,
        title: config.title,
        subtitle: config.subtitle,
        totalCount: values.length,
        maxCount,
        minValue: stats.min,
        maxValue: stats.max,
        config
      }
    }
  }
})

export default histogramRegistration
