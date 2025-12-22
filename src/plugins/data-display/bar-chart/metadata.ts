/**
 * Bar Chart Component Metadata
 */

import { createMetadata } from '@core/registry'

export const BarChartMetadata = createMetadata({
  type: 'data-viz',
  language: 'bar',
  displayName: 'Bar Chart',
  description: 'Compare values across categories with vertical or horizontal bars',
  icon: '📊',
  category: 'comparison',
  tags: ['chart', 'comparison', 'categorical', 'bar', 'visualization'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_by_category', 'product_counts']
    },
    {
      name: 'x',
      type: 'string',
      required: true,
      description: 'Column name for X-axis (categories)',
      examples: ['category', 'product', 'region']
    },
    {
      name: 'y',
      type: 'string',
      required: true,
      description: 'Column name for Y-axis (values)',
      examples: ['revenue', 'count', 'amount']
    },
    {
      name: 'group',
      type: 'string',
      required: false,
      description: 'Column name for grouping/coloring multiple series',
      examples: ['year', 'product_type']
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
      default: 300,
      description: 'Chart height in pixels'
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      default: '#3B82F6',
      description: 'Bar color (for single series)'
    },
    {
      name: 'horizontal',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Display as horizontal bar chart'
    },
    {
      name: 'showLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show value labels on bars'
    },
    {
      name: 'sort',
      type: 'string',
      required: false,
      default: 'none',
      description: 'Sort order: none, asc, or desc'
    }
  ],
  examples: [
    `\`\`\`bar
data: sales_by_region
x: region
y: revenue
title: Revenue by Region
\`\`\``,
    `\`\`\`bar
data: quarterly_sales
x: quarter
y: amount
group: product
title: Quarterly Sales by Product
showLegend: true
\`\`\``
  ]
})
