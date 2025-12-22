/**
 * Calendar Heatmap Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing calendar heatmap configuration
 */
export const CalendarHeatmapSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'dateColumn', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'startDate', type: 'string' },
    { name: 'endDate', type: 'string' },
    {
      name: 'colorScheme',
      type: 'enum',
      enum: ['green', 'blue', 'orange', 'purple', 'red', 'gray'],
      default: 'green'
    },
    { name: 'colorLevels', type: 'number', default: 4 },
    { name: 'showMonthLabels', type: 'boolean', default: true },
    { name: 'showDayLabels', type: 'boolean', default: true },
    { name: 'showLegend', type: 'boolean', default: true },
    { name: 'cellSize', type: 'number', default: 12 },
    { name: 'cellGap', type: 'number', default: 2 },
    { name: 'tooltipFormat', type: 'string' },
    { name: 'emptyColor', type: 'string', default: '#ebedf0' },
    { name: 'class', type: 'string' }
  ]
}
