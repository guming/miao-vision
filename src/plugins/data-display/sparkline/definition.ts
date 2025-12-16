/**
 * Sparkline / Mini Chart Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { SparklineMetadata } from './metadata'
import Sparkline from './Sparkline.svelte'
import { fmt } from '@core/shared/format'
import type { SparklineConfig, SparklineData } from './types'

// Schema for sparkline config - all optional to support static mode
const SparklineSchema = {
  fields: [
    { name: 'query', type: 'string' as const, required: false },
    { name: 'value', type: 'string' as const, required: false },
    { name: 'values', type: 'array' as const, required: false },
    { name: 'type', type: 'string' as const, default: 'line' },
    { name: 'color', type: 'string' as const },
    { name: 'positiveColor', type: 'string' as const },
    { name: 'negativeColor', type: 'string' as const },
    { name: 'height', type: 'number' as const, default: 32 },
    { name: 'width', type: 'number' as const, default: 100 },
    { name: 'showDots', type: 'boolean' as const, default: false },
    { name: 'showMinMax', type: 'boolean' as const, default: false },
    { name: 'showLast', type: 'boolean' as const, default: false },
    { name: 'referenceLine', type: 'string' as const },
    { name: 'referenceColor', type: 'string' as const },
    { name: 'targetValue', type: 'number' as const },
    { name: 'bandLow', type: 'number' as const },
    { name: 'bandHigh', type: 'number' as const },
    { name: 'bandColor', type: 'string' as const },
    { name: 'format', type: 'string' as const },
    { name: 'label', type: 'string' as const }
  ]
}

interface SparklineProps {
  data: SparklineData
}

/**
 * Parse sparkline content to extract static values
 */
function parseSparklineContent(content: string): Partial<SparklineConfig> {
  const config: Partial<SparklineConfig> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
      const key = trimmed.substring(0, colonIdx).trim()
      const value = trimmed.substring(colonIdx + 1).trim()

      switch (key) {
        case 'values':
          // Parse comma-separated numbers
          config.values = value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
          break
        case 'type':
          config.type = value as any
          break
        case 'color':
          config.color = value
          break
        case 'positiveColor':
          config.positiveColor = value
          break
        case 'negativeColor':
          config.negativeColor = value
          break
        case 'height':
          config.height = parseInt(value) || 32
          break
        case 'width':
          config.width = parseInt(value) || 100
          break
        case 'showDots':
          config.showDots = value === 'true'
          break
        case 'showMinMax':
          config.showMinMax = value === 'true'
          break
        case 'showLast':
          config.showLast = value === 'true'
          break
        case 'referenceLine':
          if (value === 'avg' || value === 'median') {
            config.referenceLine = value
          } else {
            const num = parseFloat(value)
            if (!isNaN(num)) config.referenceLine = num
          }
          break
        case 'referenceColor':
          config.referenceColor = value
          break
        case 'targetValue':
          config.targetValue = parseFloat(value)
          break
        case 'bandLow':
          config.bandLow = parseFloat(value)
          break
        case 'bandHigh':
          config.bandHigh = parseFloat(value)
          break
        case 'bandColor':
          config.bandColor = value
          break
        case 'format':
          config.format = value
          break
        case 'label':
          config.label = value
          break
        case 'query':
          config.query = value
          break
        case 'value':
          config.value = value
          break
      }
    }
  }

  return config
}

/**
 * Calculate statistics from values array
 */
function calculateStats(values: number[]) {
  if (values.length === 0) {
    return { min: 0, max: 0, minIndex: 0, maxIndex: 0, avg: 0, median: 0, last: 0 }
  }

  let min = Infinity
  let max = -Infinity
  let minIndex = 0
  let maxIndex = 0
  let sum = 0

  values.forEach((v, i) => {
    if (v < min) { min = v; minIndex = i }
    if (v > max) { max = v; maxIndex = i }
    sum += v
  })

  if (!isFinite(min)) min = 0
  if (!isFinite(max)) max = 0

  const avg = sum / values.length
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const last = values[values.length - 1]

  return { min, max, minIndex, maxIndex, avg, median, last }
}

/**
 * Sparkline component registration
 */
export const sparklineRegistration = defineComponent<SparklineConfig, SparklineProps>({
  metadata: SparklineMetadata,
  configSchema: SparklineSchema,
  component: Sparkline,
  containerClass: 'sparkline-wrapper',

  // No dataBinding - handle both static and SQL modes in buildProps
  buildProps: (config, _extractedData, context) => {
    const block = (context as any).block

    // Parse content for static values
    let parsedConfig: Partial<SparklineConfig> = {}
    if (block?.content) {
      parsedConfig = parseSparklineContent(block.content)
    }

    // Merge configs
    const finalConfig = { ...config, ...parsedConfig }

    // Get values - prefer static values
    let values: number[] = []
    if (parsedConfig.values && parsedConfig.values.length > 0) {
      values = parsedConfig.values
    } else if (finalConfig.values && finalConfig.values.length > 0) {
      values = finalConfig.values
    } else {
      // SQL mode would need data binding - return placeholder for now
      // TODO: Add SQL data binding support
      return null
    }

    // Calculate statistics
    const stats = calculateStats(values)
    const lastFormatted = fmt(stats.last, finalConfig.format || 'number')

    return {
      data: {
        config: finalConfig as SparklineConfig,
        values,
        ...stats,
        lastFormatted
      }
    }
  }
})

export default sparklineRegistration
