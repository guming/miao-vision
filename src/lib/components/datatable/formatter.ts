/**
 * DataTable Formatter
 *
 * Common formatting functions for table cells
 */

import type { FormatType } from './types'

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0
  }).format(value)
}

/**
 * Format a value as currency
 */
export function formatCurrency(
  value: number,
  currency: string = 'CNY',
  locale: string = 'zh-CN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Format a value as percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Format a date
 */
export function formatDate(value: Date | string | number): string {
  if (value === null || value === undefined) {
    return ''
  }

  // Handle Date objects
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return String(value)
    }
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(value)
  }

  // Handle numbers (timestamps)
  if (typeof value === 'number') {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return String(value)
    }
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  }

  // Handle strings (date strings or ISO format)
  if (typeof value === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}/
    if (dateRegex.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(date)
      }
    }

    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date)
    }
  }

  return String(value)
}

/**
 * Format value based on format type
 */
export function formatValue(value: any, format: FormatType = 'text'): string {
  if (value === null || value === undefined) {
    return ''
  }

  switch (format) {
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : String(value)

    case 'currency':
      return typeof value === 'number' ? formatCurrency(value) : String(value)

    case 'percent':
      return typeof value === 'number' ? formatPercent(value) : String(value)

    case 'date':
      return formatDate(value)

    case 'text':
    default:
      return String(value)
  }
}

/**
 * Infer column type from sample values
 */
export function inferColumnType(values: any[]): 'number' | 'string' | 'date' | 'boolean' | 'unknown' {
  if (values.length === 0) return 'unknown'

  const samples = values.filter(v => v !== null && v !== undefined).slice(0, 10)
  if (samples.length === 0) return 'unknown'

  // Check if all are booleans
  const allBooleans = samples.every(v => typeof v === 'boolean')
  if (allBooleans) return 'boolean'

  // Check if looks like dates
  const allDates = samples.every(v => {
    if (v instanceof Date) return true

    if (typeof v === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}/
      if (dateRegex.test(v)) {
        return !isNaN(new Date(v).getTime())
      }
      const date = new Date(v)
      return !isNaN(date.getTime()) && v.length > 8
    }

    if (typeof v === 'number') {
      const minTimestamp = 0
      const maxTimestamp = 4102444800000
      return v >= minTimestamp && v <= maxTimestamp
    }

    return false
  })
  if (allDates) return 'date'

  // Check if all are numbers
  const allNumbers = samples.every(v => typeof v === 'number' || !isNaN(Number(v)))
  if (allNumbers) return 'number'

  return 'string'
}
