/**
 * DateRange Component Types
 */

export interface DateRangeConfig {
  name: string              // Input variable name (creates {name}_start and {name}_end)
  title?: string            // Display title
  startDefault?: string     // Default start date (YYYY-MM-DD)
  endDefault?: string       // Default end date (YYYY-MM-DD)
  minDate?: string          // Minimum selectable date
  maxDate?: string          // Maximum selectable date
  presets?: DateRangePreset[] | boolean  // Preset options or true for defaults
}

export interface DateRangePreset {
  label: string             // Display label
  value: string             // Preset key (e.g., '7d', '30d', 'mtd', 'ytd')
  start: string | (() => string)  // Start date or function
  end: string | (() => string)    // End date or function
}

export interface DateRangeData {
  config: DateRangeConfig
  presets: DateRangePreset[]
}

export interface DateRangeValue {
  start: string | null
  end: string | null
}

/**
 * Default presets
 */
export const DEFAULT_PRESETS: DateRangePreset[] = [
  {
    label: 'Last 7 Days',
    value: '7d',
    start: () => getRelativeDate(-7),
    end: () => getToday()
  },
  {
    label: 'Last 30 Days',
    value: '30d',
    start: () => getRelativeDate(-30),
    end: () => getToday()
  },
  {
    label: 'This Month',
    value: 'mtd',
    start: () => getMonthStart(),
    end: () => getToday()
  },
  {
    label: 'Last Month',
    value: 'lastmonth',
    start: () => getLastMonthStart(),
    end: () => getLastMonthEnd()
  },
  {
    label: 'Year to Date',
    value: 'ytd',
    start: () => getYearStart(),
    end: () => getToday()
  }
]

// Date utility functions
function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function getRelativeDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function getMonthStart(): string {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().split('T')[0]
}

function getLastMonthStart(): string {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  date.setDate(1)
  return date.toISOString().split('T')[0]
}

function getLastMonthEnd(): string {
  const date = new Date()
  date.setDate(0) // Last day of previous month
  return date.toISOString().split('T')[0]
}

function getYearStart(): string {
  const date = new Date()
  date.setMonth(0)
  date.setDate(1)
  return date.toISOString().split('T')[0]
}
