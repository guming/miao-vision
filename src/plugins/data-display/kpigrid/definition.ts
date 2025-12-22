/**
 * KPI Grid Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { KPIGridMetadata } from './metadata'
import KPIGrid from './KPIGrid.svelte'
import { fmt } from '@core/shared/format'
import type { KPIGridConfig, KPIGridData, KPICardData, KPICardConfig, TrendType } from './types'

// Schema for KPI Grid config
const KPIGridSchema = {
  fields: [
    { name: 'query', type: 'string' as const, required: false },
    { name: 'columns', type: 'number' as const, required: false, default: 0 },
    { name: 'gap', type: 'string' as const, required: false, default: '1rem' }
  ],
  sections: [
    {
      name: 'cards',
      itemFields: [
        { name: 'label', type: 'string' as const },
        { name: 'value', type: 'string' as const },
        { name: 'format', type: 'string' as const },
        { name: 'icon', type: 'string' as const },
        { name: 'color', type: 'string' as const },
        { name: 'trend', type: 'string' as const },
        { name: 'trendValue', type: 'string' as const },
        { name: 'compareValue', type: 'string' as const },
        { name: 'compareLabel', type: 'string' as const }
      ]
    }
  ]
}

interface KPIGridProps {
  data: KPIGridData
}

/**
 * Parse YAML-like content to extract cards
 */
function parseKPIContent(content: string): { config: Partial<KPIGridConfig>; cards: KPICardConfig[] } {
  const lines = content.split('\n')
  const config: Partial<KPIGridConfig> = {}
  const cards: KPICardConfig[] = []
  let currentCard: Partial<KPICardConfig> | null = null
  let inCardsSection = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (trimmed === 'cards:') {
      inCardsSection = true
      continue
    }

    if (!inCardsSection && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':')
      const key = trimmed.substring(0, colonIdx).trim()
      const value = trimmed.substring(colonIdx + 1).trim()

      if (key === 'columns') config.columns = parseInt(value) || 0
      if (key === 'gap') config.gap = value
      if (key === 'query') config.query = value
      continue
    }

    if (inCardsSection && trimmed.startsWith('-')) {
      if (currentCard && currentCard.label) {
        cards.push(currentCard as KPICardConfig)
      }
      currentCard = {}

      const inlineContent = trimmed.substring(1).trim()
      if (inlineContent.includes(':')) {
        const colonIdx = inlineContent.indexOf(':')
        const key = inlineContent.substring(0, colonIdx).trim()
        const value = inlineContent.substring(colonIdx + 1).trim()
        ;(currentCard as any)[key] = value
      }
      continue
    }

    if (inCardsSection && currentCard && line.startsWith('    ') && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':')
      const key = trimmed.substring(0, colonIdx).trim()
      const value = trimmed.substring(colonIdx + 1).trim()
      ;(currentCard as any)[key] = value
    }
  }

  if (currentCard && currentCard.label) {
    cards.push(currentCard as KPICardConfig)
  }

  return { config, cards }
}

/**
 * Build cards from SQL query result
 */
function buildDataBoundCards(
  cardConfigs: KPICardConfig[],
  queryData: Record<string, unknown>
): KPICardData[] {
  return cardConfigs.map(cardConfig => {
    // Get value from query result using column name
    const columnName = cardConfig.value
    const rawValue = queryData[columnName]
    const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || 0

    // Format the value based on format type
    const formatted = fmt(numValue, cardConfig.format || 'number')

    // Handle comparison value if provided
    let trend: { direction: TrendType; percent: number; label: string } | undefined = undefined
    if (cardConfig.compareValue && queryData[cardConfig.compareValue] !== undefined) {
      const compareVal = parseFloat(String(queryData[cardConfig.compareValue])) || 0
      const diff = numValue - compareVal
      const percent = compareVal !== 0 ? (diff / compareVal) * 100 : 0

      trend = {
        direction: (diff >= 0 ? 'up' : 'down') as TrendType,
        percent: Math.abs(percent),
        label: cardConfig.compareLabel || ''
      }
    } else if (cardConfig.trend) {
      // Static trend from config
      trend = {
        direction: cardConfig.trend,
        percent: 0,
        label: cardConfig.trendValue || ''
      }
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
}

/**
 * Build cards from static config (no SQL query)
 */
function buildStaticCards(cardConfigs: KPICardConfig[]): KPICardData[] {
  return cardConfigs.map(cardConfig => {
    const valueStr = cardConfig.value || '0'
    const cleanValue = valueStr.replace(/[¥$€£,]/g, '').trim()
    const numValue = parseFloat(cleanValue) || 0
    const formatted = cardConfig.value

    let trend = undefined
    if (cardConfig.trend) {
      trend = {
        direction: cardConfig.trend,
        percent: 0,
        label: cardConfig.trendValue || ''
      }
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
}

/**
 * KPI Grid component registration
 */
export const kpiGridRegistration = defineComponent<KPIGridConfig, KPIGridProps>({
  metadata: KPIGridMetadata,
  configSchema: KPIGridSchema,
  component: KPIGrid,
  containerClass: 'kpigrid-wrapper',

  // Data binding for SQL query
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, _config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[KPIGrid] No data available')
        return null
      }
      // Return first row of data
      return queryResult.data[0]
    }
  },

  buildProps: (config, extractedData, context) => {
    const block = (context as any).block

    // Parse content to extract cards
    let parsedCards: KPICardConfig[] = []
    let parsedConfig: Partial<KPIGridConfig> = {}

    if (block?.content) {
      const parsed = parseKPIContent(block.content)
      parsedCards = parsed.cards
      parsedConfig = parsed.config
    }

    // Merge configs
    const finalConfig: KPIGridConfig = {
      ...config,
      ...parsedConfig,
      cards: parsedCards.length > 0 ? parsedCards : (config.cards || [])
    }

    const cardConfigs = finalConfig.cards

    // Check if we have SQL data
    const queryData = extractedData as Record<string, unknown> | null
    const hasQuery = Boolean(finalConfig.query)

    let cards: KPICardData[]

    if (hasQuery && queryData) {
      // Data-bound mode - extract values from query result
      cards = buildDataBoundCards(cardConfigs, queryData)
    } else {
      // Static mode - use values as-is
      cards = buildStaticCards(cardConfigs)
    }

    return {
      data: {
        config: finalConfig,
        cards
      }
    }
  }
})

export default kpiGridRegistration
