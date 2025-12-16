/**
 * Sparkline / Mini Chart Component Metadata
 */

import { createMetadata } from '@core/registry'

export const SparklineMetadata = createMetadata({
  type: 'data-viz',
  language: 'sparkline',
  displayName: 'Sparkline',
  description: 'Inline mini chart for showing trends (line, bar, area, winloss, bullet)',
  icon: '📈',
  category: 'data-viz',
  tags: ['chart', 'sparkline', 'trend', 'inline', 'minichart', 'winloss', 'bullet'],
  props: [
    {
      name: 'values',
      type: 'array',
      required: false,
      description: 'Static values array (comma-separated numbers)'
    },
    {
      name: 'query',
      type: 'string',
      required: false,
      description: 'SQL query name (optional for static values)'
    },
    {
      name: 'type',
      type: 'string',
      required: false,
      description: 'Chart type: line, bar, area, winloss, bullet (default: line)'
    },
    {
      name: 'showLast',
      type: 'boolean',
      required: false,
      description: 'Show last value label (default: false)'
    },
    {
      name: 'referenceLine',
      type: 'string',
      required: false,
      description: 'Reference line: number, "avg", or "median"'
    },
    {
      name: 'targetValue',
      type: 'number',
      required: false,
      description: 'Target value for bullet chart'
    },
    {
      name: 'bandLow',
      type: 'number',
      required: false,
      description: 'Low threshold for range band'
    },
    {
      name: 'bandHigh',
      type: 'number',
      required: false,
      description: 'High threshold for range band'
    }
  ],
  examples: [
    `\`\`\`sparkline
values: 10, 15, 12, 18, 14, 20, 22
type: line
showMinMax: true
showLast: true
\`\`\``,
    `\`\`\`sparkline
values: 5, -3, 8, -2, 6, -1, 4
type: winloss
width: 120
\`\`\``,
    `\`\`\`sparkline
values: 75
type: bullet
targetValue: 100
width: 150
\`\`\``
  ]
})
