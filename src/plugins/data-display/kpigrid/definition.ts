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
    { name: 'query', type: 'string' as const },  // Optional - static mode if omitted
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
        { name: 'color', type: 'string' as const },
        // Static mode fields
        { name: 'trend', type: 'string' as const },
        { name: 'trendValue', type: 'string' as const },
        // Data-bound mode fields
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

    // Check for cards: section
    if (trimmed === 'cards:') {
      inCardsSection = true
      continue
    }

    // Top-level config (columns, gap, query)
    if (!inCardsSection && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':')
      const key = trimmed.substring(0, colonIdx).trim()
      const value = trimmed.substring(colonIdx + 1).trim()

      if (key === 'columns') config.columns = parseInt(value) || 0
      if (key === 'gap') config.gap = value
      if (key === 'query') config.query = value
      continue
    }

    // Card list item start
    if (inCardsSection && trimmed.startsWith('-')) {
      // Save previous card
      if (currentCard && currentCard.label) {
        cards.push(currentCard as KPICardConfig)
      }
      currentCard = {}

      // Parse inline key:value if present (e.g., "- label: Total Revenue")
      const inlineContent = trimmed.substring(1).trim()
      if (inlineContent.includes(':')) {
        const colonIdx = inlineContent.indexOf(':')
        const key = inlineContent.substring(0, colonIdx).trim()
        const value = inlineContent.substring(colonIdx + 1).trim()
        ;(currentCard as any)[key] = value
      }
      continue
    }

    // Card properties (indented under -)
    if (inCardsSection && currentCard && line.startsWith('    ') && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':')
      const key = trimmed.substring(0, colonIdx).trim()
      const value = trimmed.substring(colonIdx + 1).trim()
      ;(currentCard as any)[key] = value
    }
  }

  // Save last card
  if (currentCard && currentCard.label) {
    cards.push(currentCard as KPICardConfig)
  }

  return { config, cards }
}

/**
 * Build cards from static config (no SQL query)
 */
function buildStaticCards(cardConfigs: KPICardConfig[]): KPICardData[] {
  return cardConfigs.map(cardConfig => {
    // Parse the value - could be a formatted string like "¥2,580,000"
    const valueStr = cardConfig.value || '0'
    // Remove currency symbols and commas for parsing
    const cleanValue = valueStr.replace(/[¥$€£,]/g, '').trim()
    const numValue = parseFloat(cleanValue) || 0

    // Use the original value as formatted (it's already formatted)
    const formatted = cardConfig.value

    // Use static trend if provided
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
 * Build cards from SQL query result
 */
function buildDataBoundCards(
  cardConfigs: KPICardConfig[],
  row: Record<string, unknown>
): KPICardData[] {
  return cardConfigs.map(cardConfig => {
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
}

/**
 * KPI Grid component registration
 */
export const kpiGridRegistration = defineComponent<KPIGridConfig, KPIGridProps>({
  metadata: KPIGridMetadata,
  configSchema: KPIGridSchema,
  component: KPIGrid,
  containerClass: 'kpigrid-wrapper',

  // Data binding only when query is specified
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, config) => {
      // If no query specified, return null to skip data binding
      if (!config.query) return null

      const row = queryResult.data[0] || {}
      return { row, cards: config.cards || [] }
    }
  },

  buildProps: (config, extractedData, context) => {
    // Get the original block to access raw content
    const block = (context as any).block

    // Parse content to extract cards (handles nested YAML correctly)
    let parsedCards: KPICardConfig[] = []
    let parsedConfig: Partial<KPIGridConfig> = {}

    if (block?.content) {
      const parsed = parseKPIContent(block.content)
      parsedCards = parsed.cards
      parsedConfig = parsed.config
    }

    // Merge parsed config with schema-parsed config
    const finalConfig: KPIGridConfig = {
      ...config,
      ...parsedConfig,
      cards: parsedCards.length > 0 ? parsedCards : (config.cards || [])
    }

    const cardConfigs = finalConfig.cards

    // Static mode: no query specified
    if (!finalConfig.query) {
      const cards = buildStaticCards(cardConfigs)
      return {
        data: {
          config: finalConfig,
          cards
        }
      }
    }

    // Data-bound mode: query specified
    if (!extractedData) return null

    const { row } = extractedData as { row: Record<string, unknown>; cards: KPICardConfig[] }
    const cards = buildDataBoundCards(cardConfigs, row)

    return {
      data: {
        config: finalConfig,
        cards
      }
    }
  }
})

export default kpiGridRegistration
