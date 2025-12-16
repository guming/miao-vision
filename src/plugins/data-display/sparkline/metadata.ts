/**
 * Sparkline Component Metadata
 */

import { createMetadata } from '@core/registry'

export const SparklineMetadata = createMetadata({
  type: 'data-viz',
  language: 'sparkline',
  displayName: 'Sparkline',
  description: 'Inline mini chart for showing trends',
  icon: '📈',
  category: 'data-viz',
  tags: ['chart', 'sparkline', 'trend', 'inline'],
  props: [
    {
      name: 'query',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data'
    },
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Column name for the values to plot'
    },
    {
      name: 'type',
      type: 'string',
      required: false,
      description: 'Chart type: line, bar, or area (default: line)'
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      description: 'Line/bar color (default: #667eea)'
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      description: 'Height in pixels (default: 32)'
    },
    {
      name: 'width',
      type: 'number',
      required: false,
      description: 'Width in pixels (default: 100)'
    }
  ],
  examples: [
    `\`\`\`sparkline
query: daily_sales
value: revenue
type: line
color: #10B981
height: 40
\`\`\``
  ]
})
