/**
 * Calendar Heatmap Component Metadata
 */

import { createMetadata } from '@core/registry'

export const CalendarHeatmapMetadata = createMetadata({
  type: 'data-viz',
  language: 'calendar-heatmap',
  displayName: 'Calendar Heatmap',
  description: 'Display a GitHub-style calendar heatmap for visualizing daily activity patterns',
  icon: '📅',
  category: 'chart',
  tags: ['data-viz', 'chart', 'calendar', 'heatmap', 'activity', 'time-series'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['daily_activity', 'commits_per_day']
    },
    {
      name: 'dateColumn',
      type: 'string',
      required: true,
      description: 'Column containing date values (YYYY-MM-DD format)',
      examples: ['date', 'created_at', 'day']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing the values to display',
      examples: ['count', 'commits', 'amount']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    },
    {
      name: 'startDate',
      type: 'string',
      required: false,
      description: 'Start date (YYYY-MM-DD). Defaults to 1 year ago.'
    },
    {
      name: 'endDate',
      type: 'string',
      required: false,
      description: 'End date (YYYY-MM-DD). Defaults to today.'
    },
    {
      name: 'colorScheme',
      type: 'string',
      required: false,
      default: 'green',
      description: 'Color scheme for the heatmap',
      options: ['green', 'blue', 'orange', 'purple', 'red', 'gray']
    },
    {
      name: 'colorLevels',
      type: 'number',
      required: false,
      default: 4,
      description: 'Number of color intensity levels (2-5)'
    },
    {
      name: 'showMonthLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show month labels'
    },
    {
      name: 'showDayLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show day of week labels'
    },
    {
      name: 'showLegend',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show the color legend'
    },
    {
      name: 'cellSize',
      type: 'number',
      required: false,
      default: 12,
      description: 'Size of each cell in pixels'
    },
    {
      name: 'cellGap',
      type: 'number',
      required: false,
      default: 2,
      description: 'Gap between cells in pixels'
    }
  ],
  examples: [
    `\`\`\`calendar-heatmap
data: daily_commits
dateColumn: date
valueColumn: commit_count
title: Contribution Activity
colorScheme: green
\`\`\``,
    `\`\`\`calendar-heatmap
data: daily_sales
dateColumn: sale_date
valueColumn: revenue
colorScheme: blue
showDayLabels: false
\`\`\``
  ]
})
