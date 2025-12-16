/**
 * KPI Grid Component Types
 */

export type TrendType = 'up' | 'down' | 'neutral'

export interface KPICardConfig {
  label: string           // Card title/label
  value: string           // Static value OR column name for value
  format?: string         // Format type (currency, percent, number, compact)
  icon?: string           // Optional emoji icon
  color?: string          // Accent color (green, red, blue, purple, amber, gray)
  // Static mode fields
  trend?: TrendType       // Static trend direction
  trendValue?: string     // Static trend display value (e.g., "+12.5%")
  // Data-bound mode fields
  compareValue?: string   // Column for comparison value (calculates trend)
  compareLabel?: string   // Label for comparison (e.g., "vs last month")
}

export interface KPIGridConfig {
  query?: string          // SQL result name (optional - static mode if omitted)
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
