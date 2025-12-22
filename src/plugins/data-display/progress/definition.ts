/**
 * Progress Bar Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { ProgressMetadata } from './metadata'
import Progress from './Progress.svelte'
import { fmt } from '@core/shared/format'
import type { ProgressConfig, ProgressData } from './types'

// Schema for Progress config - all fields optional to support static mode
const ProgressSchema = {
  fields: [
    { name: 'query', type: 'string' as const, required: false },  // Optional - static mode if omitted
    { name: 'value', type: 'string' as const, required: false },  // Static number OR column name
    { name: 'max', type: 'string' as const, required: false },    // Static number OR column name
    { name: 'maxValue', type: 'number' as const, default: 100 },
    { name: 'label', type: 'string' as const },
    { name: 'format', type: 'string' as const, default: 'number' },
    { name: 'color', type: 'string' as const, default: 'blue' },
    { name: 'size', type: 'string' as const, default: 'md' },
    { name: 'showValue', type: 'boolean' as const, default: true },
    { name: 'showPercent', type: 'boolean' as const, default: true },
    { name: 'animated', type: 'boolean' as const, default: true }
  ]
}

interface ProgressProps {
  data: ProgressData
}

/**
 * Parse progress config from block content
 */
function parseProgressContent(content: string): Partial<ProgressConfig> {
  const config: Partial<ProgressConfig> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
      const key = trimmed.substring(0, colonIdx).trim()
      const value = trimmed.substring(colonIdx + 1).trim()

      switch (key) {
        case 'value':
          // Try to parse as number for static mode
          const numVal = parseFloat(value)
          ;(config as any).value = isNaN(numVal) ? value : numVal
          ;(config as any)._staticValue = !isNaN(numVal)
          break
        case 'max':
          const numMax = parseFloat(value)
          ;(config as any).max = isNaN(numMax) ? value : numMax
          ;(config as any)._staticMax = !isNaN(numMax)
          break
        case 'maxValue':
          config.maxValue = parseFloat(value) || 100
          break
        case 'label':
          config.label = value
          break
        case 'color':
          config.color = value as any
          break
        case 'size':
          config.size = value as any
          break
        case 'showValue':
          config.showValue = value === 'true'
          break
        case 'showPercent':
          config.showPercent = value === 'true'
          break
        case 'animated':
          config.animated = value === 'true'
          break
        case 'query':
          config.query = value
          break
        case 'format':
          config.format = value
          break
      }
    }
  }

  return config
}

/**
 * Progress Bar component registration
 */
export const progressRegistration = defineComponent<ProgressConfig, ProgressProps>({
  metadata: ProgressMetadata,
  configSchema: ProgressSchema,
  component: Progress,
  containerClass: 'progress-wrapper',

  // No dataBinding - handle both static and SQL modes in buildProps
  buildProps: (config, _extractedData, context) => {
    try {
      const block = (context as any).block

      // Parse content to get config values
      let parsedConfig: Partial<ProgressConfig> & { _staticValue?: boolean; _staticMax?: boolean } = {}
      if (block?.content) {
        parsedConfig = parseProgressContent(block.content)
      }

      // Merge configs - parsedConfig values override schema-parsed config
      const finalConfig = { ...config, ...parsedConfig }

      // Determine if we have a static value
      // Static mode if: _staticValue flag is set, OR no query is specified
      const hasStaticValue = parsedConfig._staticValue === true
      const hasQuery = Boolean(finalConfig.query)
      const isStaticMode = hasStaticValue || !hasQuery

      let value: number
      let max: number

      if (isStaticMode) {
        // Static mode - extract value from parsed config or schema config
        if (typeof parsedConfig.value === 'number') {
          value = parsedConfig.value
        } else if (finalConfig.value !== undefined) {
          value = parseFloat(String(finalConfig.value)) || 0
        } else {
          value = 0
        }

        // Extract max from parsed config or use maxValue/default
        if (typeof parsedConfig.max === 'number') {
          max = parsedConfig.max
        } else {
          max = finalConfig.maxValue || 100
        }
      } else {
        // Data-bound mode would need SQL result - for now return placeholder
        // TODO: Add SQL data binding support
        console.log('[progress] Data-bound mode not yet supported, returning null')
        return null
      }

      // Calculate percentage
      const percent = max > 0 ? (value / max) * 100 : 0

      // Format the value
      const formatted = fmt(value, finalConfig.format || 'number')

      return {
        data: {
          config: finalConfig as ProgressConfig,
          value,
          max,
          percent,
          formatted,
          label: finalConfig.label
        }
      }
    } catch (error) {
      console.error('[progress] buildProps error:', error)
      return null
    }
  }
})

export default progressRegistration
