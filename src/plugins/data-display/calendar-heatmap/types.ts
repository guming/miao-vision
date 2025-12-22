/**
 * Calendar Heatmap Component Types
 *
 * Configuration and data types for the Calendar Heatmap visualization.
 */

/**
 * Calendar heatmap configuration from markdown
 */
export interface CalendarHeatmapConfig {
  /** Query name providing the data */
  data: string

  /** Column containing date values */
  dateColumn: string

  /** Column containing the values to display */
  valueColumn: string

  /** Chart title */
  title?: string

  /** Start date (defaults to 1 year ago) */
  startDate?: string

  /** End date (defaults to today) */
  endDate?: string

  /** Color scheme for the heatmap */
  colorScheme?: 'green' | 'blue' | 'orange' | 'purple' | 'red' | 'gray'

  /** Number of color levels (2-5) */
  colorLevels?: number

  /** Show month labels */
  showMonthLabels?: boolean

  /** Show day labels (Mon, Wed, Fri) */
  showDayLabels?: boolean

  /** Show legend */
  showLegend?: boolean

  /** Cell size in pixels */
  cellSize?: number

  /** Gap between cells in pixels */
  cellGap?: number

  /** Tooltip format string */
  tooltipFormat?: string

  /** Empty cell color */
  emptyColor?: string

  /** Additional CSS class */
  class?: string
}

/**
 * Individual day data
 */
export interface CalendarDay {
  /** Date string (YYYY-MM-DD) */
  date: string

  /** Value for this day */
  value: number

  /** Color for this cell */
  color: string

  /** Color level (0 = empty, 1-n = intensity levels) */
  level: number

  /** Day of week (0 = Sunday, 6 = Saturday) */
  dayOfWeek: number

  /** Week index within the calendar */
  weekIndex: number

  /** Formatted tooltip text */
  tooltip: string
}

/**
 * Week column in the calendar
 */
export interface CalendarWeek {
  /** Week index */
  index: number

  /** Days in this week */
  days: (CalendarDay | null)[]
}

/**
 * Month label position
 */
export interface MonthLabel {
  /** Month name (short) */
  name: string

  /** Week index where this month starts */
  weekIndex: number
}

/**
 * Processed calendar data passed to component
 */
export interface CalendarHeatmapData {
  /** Array of weeks */
  weeks: CalendarWeek[]

  /** Month labels */
  monthLabels: MonthLabel[]

  /** Legend items */
  legend: { color: string; label: string }[]

  /** Title */
  title?: string

  /** Min value in data */
  minValue: number

  /** Max value in data */
  maxValue: number

  /** Total value sum */
  totalValue: number

  /** Number of days with data */
  daysWithData: number

  /** Component configuration */
  config: CalendarHeatmapConfig
}
