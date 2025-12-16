/**
 * KPI Grid Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { KPIGridMetadata } from './metadata'
import KPIGrid from './KPIGrid.svelte'
import { fmt } from '@core/shared/format'
import type { KPIGridConfig, KPIGridData, KPICardData, KPICardConfig } from './types'

// Schema for KPI Grid config
const KPIGridSchema = {
  fields: [
    { name: 'query', type: 'string' as const, required: true },
    { name: 'columns', type: 'number' as const, default: 0 },
    { name: 'gap', type: 'string' as const, default: '1rem' }
  ],
  sections: [
    {
      name: 'cards',
      itemFields: [
        { name: 'label', type: 'string' as const },
        { name: 'value', type: 'string' as const },
        { name: 'format', type: 'string' as const },
        { name: 'icon', type: 'string' as const },
        { name: 'compareValue', type: 'string' as const },
        { name: 'compareLabel', type: 'string' as const },
        { name: 'color', type: 'string' as const }
      ]
    }
  ]
}

interface KPIGridProps {
  data: KPIGridData
}

/**
 * Calculate trend from current and comparison values
 */
function calculateTrend(current: number, compare: number, label?: string) {
  if (!compare || compare === 0) return undefined

  const percent = ((current - compare) / Math.abs(compare)) * 100
  const direction = percent > 0.5 ? 'up' : percent < -0.5 ? 'down' : 'neutral'

  return {
    direction: direction as 'up' | 'down' | 'neutral',
    percent,
    label: label || ''
  }
}

/**
 * KPI Grid component registration
 */
export const kpiGridRegistration = defineComponent<KPIGridConfig, KPIGridProps>({
  metadata: KPIGridMetadata,
  configSchema: KPIGridSchema,
  component: KPIGrid,
  containerClass: 'kpigrid-wrapper',

  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, config) => {
      const row = queryResult.data[0] || {}
      const cards = config.cards || []

      return {
        row,
        cards
      }
    }
  },

  buildProps: (config, extractedData, _context) => {
    if (!extractedData) return null

    const { row, cards: cardConfigs } = extractedData as {
      row: Record<string, unknown>
      cards: KPICardConfig[]
    }

    const cards: KPICardData[] = cardConfigs.map(cardConfig => {
      const rawValue = row[cardConfig.value]
      const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || 0

      // Format the value
      const formatted = fmt(numValue, cardConfig.format || 'number')

      // Calculate trend if comparison value exists
      let trend = undefined
      if (cardConfig.compareValue) {
        const compareRaw = row[cardConfig.compareValue]
        const compareValue = typeof compareRaw === 'number' ? compareRaw : parseFloat(String(compareRaw)) || 0
        trend = calculateTrend(numValue, compareValue, cardConfig.compareLabel)
      }

      return {
        label: cardConfig.label,
        value: numValue,
        formatted,
        icon: cardConfig.icon,
        color: cardConfig.color || 'blue',
        trend
      }
    })

    return {
      data: {
        config,
        cards
      }
    }
  }
})

export default kpiGridRegistration
