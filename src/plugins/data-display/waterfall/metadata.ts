/**
 * Waterfall Chart Component Metadata
 */

import { createMetadata } from '@core/registry'

export const WaterfallMetadata = createMetadata({
  type: 'data-viz',
  language: 'waterfall',
  displayName: 'Waterfall Chart',
  description: 'Display incremental changes showing how values build up or break down',
  icon: '\u{1F4C9}',
  category: 'chart',
  tags: ['data-viz', 'chart', 'waterfall', 'bridge', 'incremental', 'financial'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['revenue_breakdown', 'profit_analysis']
    },
    {
      name: 'labelColumn',
      type: 'string',
      required: true,
      description: 'Column containing labels for each bar',
      examples: ['category', 'item', 'description']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing values (positive or negative)',
      examples: ['amount', 'change', 'value']
    },
    {
      name: 'totalColumn',
      type: 'string',
      required: false,
      description: 'Column indicating if row is a total (boolean)',
      examples: ['is_total', 'total_flag']
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
      default: 400,
      description: 'Chart height in pixels'
    },
    {
      name: 'positiveColor',
      type: 'string',
      required: false,
      default: '#22c55e',
      description: 'Color for positive (increase) bars'
    },
    {
      name: 'negativeColor',
      type: 'string',
      required: false,
      default: '#ef4444',
      description: 'Color for negative (decrease) bars'
    },
    {
      name: 'totalColor',
      type: 'string',
      required: false,
      default: '#3b82f6',
      description: 'Color for total bars'
    },
    {
      name: 'showLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show value labels on bars'
    },
    {
      name: 'showConnectors',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show connecting lines between bars'
    }
  ],
  examples: [
    `\`\`\`waterfall
data: profit_breakdown
labelColumn: category
valueColumn: amount
title: Profit Analysis
valueFormat: currency
\`\`\``,
    `\`\`\`waterfall
data: revenue_changes
labelColumn: item
valueColumn: change
totalColumn: is_total
title: Revenue Bridge
positiveColor: #10b981
negativeColor: #f59e0b
\`\`\``
  ]
})
