/**
 * DateRange Component Metadata
 */

import { createMetadata } from '@core/registry'

export const DateRangeMetadata = createMetadata({
  type: 'input',
  language: 'daterange',
  displayName: 'Date Range',
  description: 'Date range picker for filtering time-series data',
  icon: '📅',
  category: 'input',
  tags: ['input', 'date', 'range', 'time', 'filter'],
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Input variable name (creates {name}_start and {name}_end)',
      examples: ['date_filter', 'period']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Title displayed above the date range picker'
    },
    {
      name: 'startDefault',
      type: 'string',
      required: false,
      description: 'Default start date (YYYY-MM-DD format)'
    },
    {
      name: 'endDefault',
      type: 'string',
      required: false,
      description: 'Default end date (YYYY-MM-DD format)'
    },
    {
      name: 'minDate',
      type: 'string',
      required: false,
      description: 'Minimum selectable date (YYYY-MM-DD format)'
    },
    {
      name: 'maxDate',
      type: 'string',
      required: false,
      description: 'Maximum selectable date (YYYY-MM-DD format)'
    },
    {
      name: 'presets',
      type: 'boolean',
      required: false,
      description: 'Show preset buttons (Last 7 Days, Last 30 Days, etc.)'
    }
  ],
  examples: [
    `\`\`\`daterange
name: date_filter
title: Select Date Range
startDefault: 2024-01-01
endDefault: 2024-12-31
presets: true
\`\`\``
  ]
})
