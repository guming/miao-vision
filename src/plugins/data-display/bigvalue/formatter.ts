/**
 * BigValue Formatter
 *
 * Utility functions for formatting numbers, currency, and percentages.
 * Uses the core format system for consistency.
 */

import type { ComparisonData } from './types'
import { fmt, type FormatType } from '@core/shared/format'

// Re-export core formatters for convenience
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact
} from '@core/shared/format'

/**
 * Format value based on specified format type
 * Maps BigValue format types to core format types
 */
export function formatValue(
  value: number,
  format: FormatType | 'number' | 'currency' | 'percent' = 'number'
): string {
  return fmt(value, format)
}

/**
 * Calculate comparison between current and previous values
 */
export function calculateComparison(
  current: number,
  previous: number,
  label: string = 'vs previous',
  format: 'number' | 'currency' | 'percent' = 'number'
): ComparisonData {
  const diff = current - previous
  const percent = previous !== 0 ? diff / previous : 0

  let trend: 'up' | 'down' | 'neutral'
  if (Math.abs(percent) < 0.001) {
    trend = 'neutral'
  } else if (diff > 0) {
    trend = 'up'
  } else {
    trend = 'down'
  }

  return {
    value: diff,
    percent,
    trend,
    label,
    formatted: formatValue(diff, format)
  }
}

/**
 * Get trend icon
 */
export function getTrendIcon(trend: 'up' | 'down' | 'neutral'): string {
  switch (trend) {
    case 'up':
      return '↑'
    case 'down':
      return '↓'
    case 'neutral':
    default:
      return '→'
  }
}

/**
 * Get trend color class
 */
export function getTrendColor(trend: 'up' | 'down' | 'neutral'): string {
  switch (trend) {
    case 'up':
      return 'text-green-600'
    case 'down':
      return 'text-red-600'
    case 'neutral':
    default:
      return 'text-gray-500'
  }
}
