/**
 * BigValue Component Types
 */

export interface BigValueConfig {
  query: string       // SQL result name to use as data source
  value: string       // Column name to extract the value from
  title?: string      // Display title
  format?: 'number' | 'currency' | 'percent'  // Value format
  comparison?: string // Optional: reference to comparison query result
  comparisonLabel?: string  // Label for comparison (e.g., "vs last month")
}

export interface BigValueData {
  value: number
  title: string
  formatted: string
  comparison?: ComparisonData
}

export interface ComparisonData {
  value: number           // Raw comparison value
  percent: number         // Percentage change
  trend: 'up' | 'down' | 'neutral'
  label: string           // Display label
  formatted: string       // Formatted comparison value
}
