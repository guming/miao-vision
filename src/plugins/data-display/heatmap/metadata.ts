/**
 * Heatmap Component Metadata
 */

import { createMetadata } from '@core/registry'

export const HeatmapMetadata = createMetadata({
  type: 'data-viz',
  language: 'heatmap',
  displayName: 'Heatmap',
  description: 'Display matrix data as colored cells (correlation matrices, pivot tables)',
  icon: '\u{1F7E6}',
  category: 'chart',
  tags: ['data-viz', 'chart', 'heatmap', 'matrix', 'correlation', 'pivot'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['correlation_matrix', 'pivot_data']
    },
    {
      name: 'xColumn',
      type: 'string',
      required: true,
      description: 'Column containing X-axis labels (columns)',
      examples: ['feature_x', 'month', 'category']
    },
    {
      name: 'yColumn',
      type: 'string',
      required: true,
      description: 'Column containing Y-axis labels (rows)',
      examples: ['feature_y', 'product', 'region']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing the values',
      examples: ['correlation', 'count', 'revenue']
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
      name: 'cellWidth',
      type: 'number',
      required: false,
      default: 40,
      description: 'Cell width in pixels'
    },
    {
      name: 'cellHeight',
      type: 'number',
      required: false,
      default: 40,
      description: 'Cell height in pixels'
    },
    {
      name: 'minColor',
      type: 'string',
      required: false,
      default: '#f0f9ff',
      description: 'Color for minimum values'
    },
    {
      name: 'maxColor',
      type: 'string',
      required: false,
      default: '#1e40af',
      description: 'Color for maximum values'
    },
    {
      name: 'midColor',
      type: 'string',
      required: false,
      description: 'Color for midpoint values (optional, for diverging scales)'
    },
    {
      name: 'showValues',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show values in cells'
    },
    {
      name: 'showLegend',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show color legend'
    }
  ],
  examples: [
    `\`\`\`heatmap
data: correlation_matrix
xColumn: feature_x
yColumn: feature_y
valueColumn: correlation
title: Feature Correlations
minColor: #fecaca
midColor: #fef3c7
maxColor: #bbf7d0
\`\`\``,
    `\`\`\`heatmap
data: sales_pivot
xColumn: month
yColumn: product
valueColumn: revenue
title: Monthly Sales by Product
cellWidth: 50
cellHeight: 35
valueFormat: currency
\`\`\``
  ]
})
