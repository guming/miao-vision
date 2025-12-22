/**
 * Histogram Component Metadata
 */

import { createMetadata } from '@core/registry'

export const HistogramMetadata = createMetadata({
  type: 'data-viz',
  language: 'histogram',
  displayName: 'Histogram',
  description: 'Display data distribution as binned bars',
  icon: '\u{1F4CA}',
  category: 'chart',
  tags: ['data-viz', 'chart', 'histogram', 'distribution', 'bins', 'frequency'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_amounts', 'response_times']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing numeric values to bin',
      examples: ['amount', 'duration', 'score']
    },
    {
      name: 'bins',
      type: 'number',
      required: false,
      default: 10,
      description: 'Number of bins to create'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    },
    {
      name: 'subtitle',
      type: 'string',
      required: false,
      description: 'Chart subtitle'
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 300,
      description: 'Chart height in pixels'
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      default: '#3B82F6',
      description: 'Bar color'
    },
    {
      name: 'showXAxis',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show X-axis'
    },
    {
      name: 'showYAxis',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show Y-axis'
    },
    {
      name: 'xAxisLabel',
      type: 'string',
      required: false,
      description: 'Label for X-axis'
    },
    {
      name: 'yAxisLabel',
      type: 'string',
      required: false,
      default: 'Count',
      description: 'Label for Y-axis'
    },
    {
      name: 'showLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show count labels on bars'
    }
  ],
  examples: [
    `\`\`\`histogram
data: order_amounts
valueColumn: amount
bins: 15
title: Order Amount Distribution
xAxisLabel: Amount ($)
color: #10B981
\`\`\``,
    `\`\`\`histogram
data: response_times
valueColumn: duration_ms
bins: 20
title: API Response Times
xAxisLabel: Duration (ms)
yAxisLabel: Frequency
\`\`\``
  ]
})
