/**
 * Calendar Heatmap Plugin
 *
 * Display GitHub-style calendar heatmaps for visualizing daily activity patterns.
 */

export { calendarHeatmapRegistration, default } from './definition'
export { CalendarHeatmapMetadata } from './metadata'
export { CalendarHeatmapSchema } from './schema'
export { default as CalendarHeatmap } from './CalendarHeatmap.svelte'
export type {
  CalendarHeatmapConfig,
  CalendarHeatmapData,
  CalendarDay,
  CalendarWeek,
  MonthLabel
} from './types'
