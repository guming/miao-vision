/**
 * Funnel Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent } from '@core/registry'
import { FunnelMetadata } from './metadata'
import { FunnelSchema } from './schema'
import Funnel from './Funnel.svelte'
import type { FunnelConfig, FunnelData, FunnelStage } from './types'

/**
 * Props passed to Funnel.svelte
 */
interface FunnelProps {
  data: FunnelData
}

/**
 * Color schemes for funnel visualization
 */
const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'],
  gradient: ['#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444', '#DC2626'],
  blue: ['#1E40AF', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'],
  green: ['#166534', '#15803D', '#16A34A', '#22C55E', '#4ADE80', '#86EFAC'],
  orange: ['#9A3412', '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74']
}

/**
 * Format a numeric value based on format type
 */
export function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number',
  decimals: number = 0,
  currencySymbol: string = '$'
): string {
  if (format === 'currency') {
    return `${currencySymbol}${value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`
  }

  if (format === 'percent') {
    return `${value.toFixed(decimals)}%`
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  })
}

/**
 * Get color for a stage based on scheme and index
 */
export function getStageColor(
  index: number,
  totalStages: number,
  colorScheme: string = 'default',
  customColors?: string[]
): string {
  if (customColors && customColors.length > 0) {
    return customColors[index % customColors.length]
  }

  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.default

  // Distribute colors evenly across stages
  const colorIndex = Math.floor((index / totalStages) * colors.length)
  return colors[Math.min(colorIndex, colors.length - 1)]
}

/**
 * Funnel component registration using adapter layer
 */
export const funnelRegistration = defineComponent<FunnelConfig, FunnelProps>({
  metadata: FunnelMetadata,
  configSchema: FunnelSchema,
  component: Funnel,
  containerClass: 'funnel-wrapper',

  // Data binding: extract stages from query result
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Funnel] No data available')
        return null
      }

      const nameCol = config.nameColumn
      const valueCol = config.valueColumn

      if (!nameCol || !valueCol) {
        console.warn('[Funnel] nameColumn and valueColumn are required')
        return null
      }

      // Check columns exist
      if (!queryResult.columns.includes(nameCol)) {
        console.warn(`[Funnel] Column "${nameCol}" not found`)
        return null
      }
      if (!queryResult.columns.includes(valueCol)) {
        console.warn(`[Funnel] Column "${valueCol}" not found`)
        return null
      }

      // Extract stages from query result
      const rawStages = queryResult.data.map((row) => ({
        name: String(row[nameCol] ?? ''),
        value: parseFloat(String(row[valueCol] ?? 0))
      })).filter(s => !isNaN(s.value))

      if (rawStages.length === 0) {
        console.warn('[Funnel] No valid stages found')
        return null
      }

      return rawStages
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): FunnelProps => {
    const rawStages = rawData as Array<{ name: string; value: number }> | null

    if (!rawStages || rawStages.length === 0) {
      return {
        data: {
          stages: [],
          title: config.title,
          subtitle: config.subtitle,
          totalConversion: 0,
          config
        }
      }
    }

    const firstValue = rawStages[0].value
    const lastValue = rawStages[rawStages.length - 1].value
    const maxValue = Math.max(...rawStages.map(s => s.value))

    const format = config.valueFormat || 'number'
    const decimals = config.decimals ?? 0
    const currencySymbol = config.currencySymbol || '$'
    const colorScheme = config.colorScheme || 'default'

    // Build processed stages
    const stages: FunnelStage[] = rawStages.map((stage, index) => {
      const previousValue = index > 0 ? rawStages[index - 1].value : stage.value

      return {
        name: stage.name,
        value: stage.value,
        percentOfFirst: firstValue > 0 ? (stage.value / firstValue) * 100 : 0,
        percentOfPrevious: previousValue > 0 ? (stage.value / previousValue) * 100 : 0,
        formattedValue: formatValue(stage.value, format, decimals, currencySymbol),
        widthPercent: maxValue > 0 ? (stage.value / maxValue) * 100 : 0,
        color: getStageColor(index, rawStages.length, colorScheme, config.colors)
      }
    })

    // Calculate total conversion
    const totalConversion = firstValue > 0 ? (lastValue / firstValue) * 100 : 0

    return {
      data: {
        stages,
        title: config.title,
        subtitle: config.subtitle,
        totalConversion,
        config
      }
    }
  }
})

export default funnelRegistration
