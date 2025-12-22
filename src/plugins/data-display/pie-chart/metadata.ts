/**
 * Pie Chart Component Metadata
 */

import { createMetadata } from '@core/registry'

export const PieChartMetadata = createMetadata({
  type: 'data-viz',
  language: 'pie',
  displayName: 'Pie Chart',
  description: 'Show proportions of a whole as pie or donut slices',
  icon: '🥧',
  category: 'comparison',
  tags: ['chart', 'proportion', 'pie', 'donut', 'visualization'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_by_category', 'market_share']
    },
    {
      name: 'x',
      type: 'string',
      required: true,
      description: 'Column name for category labels (slices)',
      examples: ['category', 'region', 'product']
    },
    {
      name: 'y',
      type: 'string',
      required: true,
      description: 'Column name for values (slice size)',
      examples: ['revenue', 'count', 'amount']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    },
    {
      name: 'innerRadius',
      type: 'number',
      required: false,
      default: 0,
      description: 'Inner radius for donut chart (0 = pie, >0 = donut)'
    },
    {
      name: 'showLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show category labels'
    },
    {
      name: 'showPercentages',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show percentage values'
    },
    {
      name: 'showLegend',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show legend'
    }
  ],
  examples: [
    `\`\`\`pie
data: sales_by_category
x: category
y: revenue
title: Revenue by Category
\`\`\``,
    `\`\`\`pie
data: market_share
x: company
y: share
title: Market Share
innerRadius: 60
showLegend: true
\`\`\``
  ]
})
