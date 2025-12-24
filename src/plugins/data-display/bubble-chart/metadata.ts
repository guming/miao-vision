/**
 * Bubble Chart Component Metadata
 */

import { createMetadata } from '@core/registry'

export const BubbleChartMetadata = createMetadata({
  type: 'data-viz',
  language: 'bubble',
  displayName: 'Bubble Chart',
  description: 'Visualize three-dimensional data using bubbles with x, y, and size',
  icon: '🫧',
  category: 'correlation',
  tags: ['chart', 'scatter', 'bubble', 'correlation', 'three-dimensional', 'visualization'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['product_metrics', 'company_data']
    },
    {
      name: 'x',
      type: 'string',
      required: true,
      description: 'Column name for X-axis',
      examples: ['revenue', 'price', 'rating']
    },
    {
      name: 'y',
      type: 'string',
      required: true,
      description: 'Column name for Y-axis',
      examples: ['profit', 'sales', 'growth']
    },
    {
      name: 'size',
      type: 'string',
      required: true,
      description: 'Column name for bubble size',
      examples: ['market_share', 'users', 'volume']
    },
    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Column name for bubble labels',
      examples: ['product_name', 'company', 'category']
    },
    {
      name: 'group',
      type: 'string',
      required: false,
      description: 'Column name for grouping/coloring bubbles',
      examples: ['category', 'region', 'segment']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    },
    {
      name: 'xLabel',
      type: 'string',
      required: false,
      description: 'X-axis label'
    },
    {
      name: 'yLabel',
      type: 'string',
      required: false,
      description: 'Y-axis label'
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 400,
      description: 'Chart height in pixels'
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      default: '#3B82F6',
      description: 'Bubble color (for single series)'
    },
    {
      name: 'minBubbleSize',
      type: 'number',
      required: false,
      default: 10,
      description: 'Minimum bubble size in pixels'
    },
    {
      name: 'maxBubbleSize',
      type: 'number',
      required: false,
      default: 50,
      description: 'Maximum bubble size in pixels'
    },
    {
      name: 'showLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show labels on bubbles'
    },
    {
      name: 'showLegend',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show legend for grouped bubbles'
    },
    {
      name: 'opacity',
      type: 'number',
      required: false,
      default: 0.7,
      description: 'Bubble opacity (0-1)'
    }
  ],
  examples: [
    `\`\`\`bubble
data: product_performance
x: price
y: sales
size: market_share
label: product_name
title: Product Performance Analysis
xLabel: Price ($)
yLabel: Sales Volume
\`\`\``,
    `\`\`\`bubble
data: company_metrics
x: revenue
y: profit
size: employees
group: industry
label: company_name
title: Company Performance by Industry
showLegend: true
\`\`\``
  ]
})
