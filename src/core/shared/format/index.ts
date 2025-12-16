/**
 * Format System
 *
 * Global formatting utilities for numbers, currency, percentages, and dates.
 * Inspired by Evidence.dev's fmt() function.
 *
 * @module core/shared/format
 *
 * @example
 * ```typescript
 * import { fmt } from '@core/shared/format'
 *
 * fmt(1234567.89, 'currency')    // ¥1,234,567.89
 * fmt(0.1234, 'percent')         // 12.34%
 * fmt(1234567, 'num0')           // 1,234,568
 * fmt(new Date(), 'date')        // 2024-01-15
 * ```
 */

export type FormatType =
  | 'number'      // Default: 1,234.56
  | 'num0'        // No decimals: 1,235
  | 'num1'        // 1 decimal: 1,234.6
  | 'num2'        // 2 decimals: 1,234.56
  | 'num3'        // 3 decimals: 1,234.568
  | 'currency'    // Currency: ¥1,234.56
  | 'usd'         // US Dollar: $1,234.56
  | 'eur'         // Euro: €1,234.56
  | 'percent'     // Percentage: 12.34%
  | 'pct0'        // Percentage no decimals: 12%
  | 'pct1'        // Percentage 1 decimal: 12.3%
  | 'date'        // Date: 2024-01-15
  | 'datetime'    // DateTime: 2024-01-15 14:30
  | 'time'        // Time: 14:30:00
  | 'shortdate'   // Short date: Jan 15
  | 'longdate'    // Long date: January 15, 2024
  | 'relative'    // Relative: 3 days ago
  | 'compact'     // Compact: 1.2K, 3.4M
  | 'bytes'       // Bytes: 1.5 KB, 2.3 MB
  | 'ordinal'     // Ordinal: 1st, 2nd, 3rd

export interface FormatOptions {
  locale?: string
  currency?: string
  decimals?: number
  prefix?: string
  suffix?: string
  nullValue?: string
  zeroValue?: string
}

const DEFAULT_LOCALE = 'zh-CN'
const DEFAULT_CURRENCY = 'CNY'

/**
 * Format a value based on format type
 *
 * @param value - The value to format
 * @param format - Format type or custom format string
 * @param options - Additional formatting options
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * fmt(1234.56, 'currency')           // ¥1,234.56
 * fmt(1234.56, 'usd')                // $1,234.56
 * fmt(0.1234, 'percent')             // 12.34%
 * fmt(1234567, 'compact')            // 123.5万
 * fmt(new Date(), 'date')            // 2024-01-15
 * fmt(null, 'number', { nullValue: 'N/A' })  // N/A
 * ```
 */
export function fmt(
  value: unknown,
  format: FormatType | string = 'number',
  options: FormatOptions = {}
): string {
  const { nullValue = '-', zeroValue, prefix = '', suffix = '' } = options

  // Handle null/undefined
  if (value === null || value === undefined) {
    return nullValue
  }

  // Handle zero with custom display
  if (value === 0 && zeroValue !== undefined) {
    return zeroValue
  }

  // Route to appropriate formatter
  const formatted = formatByType(value, format as FormatType, options)

  return `${prefix}${formatted}${suffix}`
}

/**
 * Format by type
 */
function formatByType(value: unknown, format: FormatType, options: FormatOptions): string {
  const { locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY, decimals } = options

  // Number formats
  if (typeof value === 'number' || !isNaN(Number(value))) {
    const num = Number(value)

    switch (format) {
      case 'number':
        return formatNumber(num, decimals ?? 2, locale)

      case 'num0':
        return formatNumber(num, 0, locale)

      case 'num1':
        return formatNumber(num, 1, locale)

      case 'num2':
        return formatNumber(num, 2, locale)

      case 'num3':
        return formatNumber(num, 3, locale)

      case 'currency':
        return formatCurrency(num, currency, locale)

      case 'usd':
        return formatCurrency(num, 'USD', 'en-US')

      case 'eur':
        return formatCurrency(num, 'EUR', 'de-DE')

      case 'percent':
        return formatPercent(num, decimals ?? 2, locale)

      case 'pct0':
        return formatPercent(num, 0, locale)

      case 'pct1':
        return formatPercent(num, 1, locale)

      case 'compact':
        return formatCompact(num, locale)

      case 'bytes':
        return formatBytes(num)

      case 'ordinal':
        return formatOrdinal(num)

      default:
        // Fall through to date or string
        break
    }
  }

  // Date formats
  if (value instanceof Date || (typeof value === 'string' && isDateString(value))) {
    const date = value instanceof Date ? value : new Date(value)

    if (!isNaN(date.getTime())) {
      switch (format) {
        case 'date':
          return formatDate(date, locale)

        case 'datetime':
          return formatDateTime(date, locale)

        case 'time':
          return formatTime(date, locale)

        case 'shortdate':
          return formatShortDate(date, locale)

        case 'longdate':
          return formatLongDate(date, locale)

        case 'relative':
          return formatRelative(date)

        default:
          return formatDate(date, locale)
      }
    }
  }

  // Default: return as string
  return String(value)
}

// ============================================================================
// Number Formatters
// ============================================================================

export function formatNumber(value: number, decimals: number = 2, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(value)
}

export function formatCurrency(
  value: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

export function formatPercent(value: number, decimals: number = 2, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

export function formatCompact(value: number, locale: string = DEFAULT_LOCALE): string {
  // Use Chinese compact notation for zh-CN
  if (locale.startsWith('zh')) {
    return formatCompactChinese(value)
  }

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value)
}

function formatCompactChinese(value: number): string {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absValue >= 100000000) {
    return `${sign}${(absValue / 100000000).toFixed(1)}亿`
  }
  if (absValue >= 10000) {
    return `${sign}${(absValue / 10000).toFixed(1)}万`
  }
  if (absValue >= 1000) {
    return `${sign}${(absValue / 1000).toFixed(1)}千`
  }

  return formatNumber(value, 0, 'zh-CN')
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const k = 1024
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}

export function formatOrdinal(num: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = num % 100

  return num + (s[(v - 20) % 10] || s[v] || s[0])
}

// ============================================================================
// Date Formatters
// ============================================================================

export function formatDate(date: Date, locale: string = DEFAULT_LOCALE): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function formatDateTime(date: Date, locale: string = DEFAULT_LOCALE): string {
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatTime(date: Date, locale: string = DEFAULT_LOCALE): string {
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function formatShortDate(date: Date, locale: string = DEFAULT_LOCALE): string {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric'
  })
}

export function formatLongDate(date: Date, locale: string = DEFAULT_LOCALE): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatRelative(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  if (diffWeek < 4) return `${diffWeek}周前`
  if (diffMonth < 12) return `${diffMonth}个月前`
  return `${diffYear}年前`
}

// ============================================================================
// Utilities
// ============================================================================

function isDateString(value: string): boolean {
  // Check common date formats
  return /^\d{4}-\d{2}-\d{2}/.test(value) ||
         /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
         !isNaN(Date.parse(value))
}

/**
 * Create a formatter function with preset options
 *
 * @example
 * ```typescript
 * const usdFmt = createFormatter('usd')
 * usdFmt(1234.56)  // $1,234.56
 *
 * const pctFmt = createFormatter('percent', { decimals: 1 })
 * pctFmt(0.1234)  // 12.3%
 * ```
 */
export function createFormatter(
  format: FormatType,
  options: FormatOptions = {}
): (value: unknown) => string {
  return (value: unknown) => fmt(value, format, options)
}

/**
 * Preset formatters for common use cases
 */
export const formatters = {
  number: createFormatter('number'),
  num0: createFormatter('num0'),
  num1: createFormatter('num1'),
  num2: createFormatter('num2'),
  currency: createFormatter('currency'),
  usd: createFormatter('usd'),
  eur: createFormatter('eur'),
  percent: createFormatter('percent'),
  pct0: createFormatter('pct0'),
  pct1: createFormatter('pct1'),
  compact: createFormatter('compact'),
  bytes: createFormatter('bytes'),
  date: createFormatter('date'),
  datetime: createFormatter('datetime'),
  time: createFormatter('time'),
  shortdate: createFormatter('shortdate'),
  longdate: createFormatter('longdate'),
  relative: createFormatter('relative')
}

// Default export
export default fmt
