/**
 * Progress Bar Component Metadata
 */

import { createMetadata } from '@core/registry'

export const ProgressMetadata = createMetadata({
  type: 'data-viz',
  language: 'progress',
  displayName: 'Progress Bar',
  description: 'Visual progress indicator for goals and targets',
  icon: '📊',
  category: 'data-viz',
  tags: ['progress', 'goal', 'target', 'kpi', 'percentage'],
  props: [
    {
      name: 'query',
      type: 'string',
      required: false,
      description: 'SQL result name (optional for static values)'
    },
    {
      name: 'value',
      type: 'string',
      required: false,
      description: 'Static number OR column name'
    },
    {
      name: 'max',
      type: 'string',
      required: false,
      description: 'Column for max value'
    },
    {
      name: 'maxValue',
      type: 'number',
      required: false,
      description: 'Fixed max value (default: 100)'
    },
    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Display label'
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      description: 'Bar color (green, blue, red, purple, orange)'
    },
    {
      name: 'size',
      type: 'string',
      required: false,
      description: 'Bar size: sm, md, lg'
    }
  ],
  examples: [
    `\`\`\`progress
query: sales_target
value: current_sales
maxValue: 100000
label: Q4 Sales Target
color: green
format: currency
\`\`\``
  ]
})
