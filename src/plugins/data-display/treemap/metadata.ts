/**
 * Treemap Component Metadata
 */

import { createMetadata } from '@core/registry'

export const TreemapMetadata = createMetadata({
  type: 'data-viz',
  language: 'treemap',
  displayName: 'Treemap',
  description: 'Display hierarchical data as nested rectangles sized by value',
  icon: '🗺️',
  category: 'chart',
  tags: ['data-viz', 'chart', 'treemap', 'hierarchy', 'proportion', 'breakdown'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['budget_breakdown', 'category_distribution']
    },
    {
      name: 'labelColumn',
      type: 'string',
      required: true,
      description: 'Column containing category/label names',
      examples: ['category', 'name', 'label']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing values for sizing',
      examples: ['amount', 'count', 'size']
    },
    {
      name: 'groupColumn',
      type: 'string',
      required: false,
      description: 'Optional column for grouping/parent categories',
      examples: ['department', 'parent_category']
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
      name: 'colorScheme',
      type: 'string',
      required: false,
      default: 'default',
      description: 'Color scheme for tiles',
      options: ['default', 'category', 'blue', 'green', 'warm', 'cool', 'mono']
    },
    {
      name: 'showLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show labels on tiles'
    },
    {
      name: 'showValues',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show values on tiles'
    },
    {
      name: 'valueFormat',
      type: 'string',
      required: false,
      default: 'number',
      description: 'Value format',
      options: ['number', 'currency', 'percent']
    },
    {
      name: 'tilePadding',
      type: 'number',
      required: false,
      default: 2,
      description: 'Padding between tiles in pixels'
    }
  ],
  examples: [
    `\`\`\`treemap
data: budget_breakdown
labelColumn: category
valueColumn: amount
title: Budget Allocation
colorScheme: blue
\`\`\``,
    `\`\`\`treemap
data: sales_by_product
labelColumn: product_name
valueColumn: revenue
groupColumn: category
valueFormat: currency
\`\`\``
  ]
})
