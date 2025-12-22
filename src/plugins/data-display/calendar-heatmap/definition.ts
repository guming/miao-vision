/**
 * Calendar Heatmap Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 */

import { defineComponent } from '@core/registry'
import { CalendarHeatmapMetadata } from './metadata'
import { CalendarHeatmapSchema } from './schema'
import CalendarHeatmap from './CalendarHeatmap.svelte'
import type {
  CalendarHeatmapConfig,
  CalendarHeatmapData,
  CalendarDay,
  CalendarWeek,
  MonthLabel
} from './types'

/**
 * Props passed to CalendarHeatmap.svelte
 */
interface CalendarHeatmapProps {
  data: CalendarHeatmapData
}

/**
 * Color schemes with intensity levels
 */
const COLOR_SCHEMES: Record<string, string[]> = {
  green: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  blue: ['#ebedf0', '#9ecae9', '#6baed6', '#3182bd', '#08519c'],
  orange: ['#ebedf0', '#ffcc80', '#ffb74d', '#ffa726', '#f57c00'],
  purple: ['#ebedf0', '#d4b9da', '#c994c7', '#df65b0', '#980043'],
  red: ['#ebedf0', '#fcbba1', '#fc9272', '#fb6a4a', '#cb181d'],
  gray: ['#ebedf0', '#c6c6c6', '#9e9e9e', '#757575', '#424242']
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Parse date string to Date object
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  // Handle various date formats
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null

  return date
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get color for a value based on scheme and levels
 */
export function getColorForValue(
  value: number,
  minValue: number,
  maxValue: number,
  colorScheme: string = 'green',
  colorLevels: number = 4,
  emptyColor: string = '#ebedf0'
): { color: string; level: number } {
  if (value === 0 || maxValue === 0) {
    return { color: emptyColor, level: 0 }
  }

  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.green
  const range = maxValue - minValue || 1
  const normalizedValue = (value - minValue) / range

  // Calculate level (1 to colorLevels)
  const level = Math.min(
    colorLevels,
    Math.max(1, Math.ceil(normalizedValue * colorLevels))
  )

  // Map level to color index (skip index 0 which is empty color)
  const colorIndex = Math.min(level, colors.length - 1)

  return { color: colors[colorIndex], level }
}

/**
 * Generate date range for calendar
 */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Calendar Heatmap component registration
 */
export const calendarHeatmapRegistration = defineComponent<CalendarHeatmapConfig, CalendarHeatmapProps>({
  metadata: CalendarHeatmapMetadata,
  configSchema: CalendarHeatmapSchema,
  component: CalendarHeatmap,
  containerClass: 'calendar-heatmap-wrapper',

  // Data binding: extract date-value pairs
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[CalendarHeatmap] No data available')
        return null
      }

      const dateCol = config.dateColumn
      const valueCol = config.valueColumn

      if (!dateCol || !valueCol) {
        console.warn('[CalendarHeatmap] dateColumn and valueColumn are required')
        return null
      }

      // Build date -> value map
      const valueMap = new Map<string, number>()

      for (const row of queryResult.data) {
        const dateStr = String(row[dateCol] || '')
        const value = parseFloat(String(row[valueCol] || 0))

        const date = parseDate(dateStr)
        if (date && !isNaN(value)) {
          const key = formatDateKey(date)
          valueMap.set(key, (valueMap.get(key) || 0) + value)
        }
      }

      return valueMap
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): CalendarHeatmapProps => {
    const valueMap = rawData as Map<string, number> | null

    // Default date range: 1 year ago to today
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const startDate = config.startDate ? parseDate(config.startDate) || oneYearAgo : oneYearAgo
    const endDate = config.endDate ? parseDate(config.endDate) || today : today

    // Adjust start date to begin on Sunday
    const adjustedStart = new Date(startDate)
    adjustedStart.setDate(adjustedStart.getDate() - adjustedStart.getDay())

    // Generate all dates in range
    const dates = generateDateRange(adjustedStart, endDate)

    // Calculate stats
    let minValue = Infinity
    let maxValue = 0
    let totalValue = 0
    let daysWithData = 0

    if (valueMap) {
      for (const value of valueMap.values()) {
        if (value > 0) {
          minValue = Math.min(minValue, value)
          maxValue = Math.max(maxValue, value)
          totalValue += value
          daysWithData++
        }
      }
    }

    if (minValue === Infinity) minValue = 0

    const colorScheme = config.colorScheme || 'green'
    const colorLevels = Math.min(5, Math.max(2, config.colorLevels || 4))
    const emptyColor = config.emptyColor || '#ebedf0'

    // Build weeks and days
    const weeks: CalendarWeek[] = []
    const monthLabels: MonthLabel[] = []
    let currentWeekIndex = -1
    let lastMonth = -1

    for (const date of dates) {
      const dayOfWeek = date.getDay()

      // Start new week on Sunday
      if (dayOfWeek === 0) {
        currentWeekIndex++
        weeks.push({
          index: currentWeekIndex,
          days: new Array(7).fill(null)
        })
      }

      if (currentWeekIndex < 0) continue

      const dateKey = formatDateKey(date)
      const value = valueMap?.get(dateKey) || 0
      const { color, level } = getColorForValue(
        value,
        minValue,
        maxValue,
        colorScheme,
        colorLevels,
        emptyColor
      )

      // Track month changes for labels
      const month = date.getMonth()
      if (month !== lastMonth && dayOfWeek <= 3) {
        monthLabels.push({
          name: MONTH_NAMES[month],
          weekIndex: currentWeekIndex
        })
        lastMonth = month
      }

      const day: CalendarDay = {
        date: dateKey,
        value,
        color,
        level,
        dayOfWeek,
        weekIndex: currentWeekIndex,
        tooltip: `${dateKey}: ${value.toLocaleString()}`
      }

      weeks[currentWeekIndex].days[dayOfWeek] = day
    }

    // Build legend
    const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.green
    const legend = colors.slice(0, colorLevels + 1).map((color, i) => ({
      color,
      label: i === 0 ? 'None' : `Level ${i}`
    }))

    return {
      data: {
        weeks,
        monthLabels,
        legend,
        title: config.title,
        minValue,
        maxValue,
        totalValue,
        daysWithData,
        config
      }
    }
  }
})

export default calendarHeatmapRegistration
