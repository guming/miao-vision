/**
 * KPI Grid Component Types
 */

export type TrendType = 'up' | 'down' | 'neutral'

export interface KPICardConfig {
  label: string           // Card title/label
  value: string           // Column name for value
  format?: string         // Format type (currency, percent, number, compact)
  icon?: string           // Optional emoji icon
  compareValue?: string   // Column for comparison value
  compareLabel?: string   // Label for comparison (e.g., "vs last month")
  color?: string          // Accent color (green, red, blue, purple, orange)
}

export interface KPIGridConfig {
  query: string           // SQL result name
  columns?: number        // Number of columns (default: auto)
  gap?: string            // Gap between cards (default: 1rem)
  cards: KPICardConfig[]  // Card configurations
}

export interface KPICardData {
  label: string
  value: number
  formatted: string
  icon?: string
  color: string
  trend?: {
    direction: TrendType
    percent: number
    label: string
  }
}

export interface KPIGridData {
  config: KPIGridConfig
  cards: KPICardData[]
}
