/**
 * BigValue Formatter
 *
 * Utility functions for formatting numbers, currency, and percentages
 */

import type { ComparisonData } from './types'

/**
 * Format number with thousands separator
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Format currency (default: CNY ¥)
 */
export function formatCurrency(value: number, currency: string = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Format value based on specified format type
 */
export function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number'
): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'percent':
      return formatPercent(value)
    case 'number':
    default:
      return formatNumber(value)
  }
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
