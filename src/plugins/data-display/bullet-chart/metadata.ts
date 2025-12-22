/**
 * BulletChart Component Metadata
 */

import { createMetadata } from '@core/registry'

export const BulletChartMetadata = createMetadata({
  type: 'data-viz',
  language: 'bullet',
  displayName: 'Bullet Chart',
  description: 'Compare values against targets and qualitative ranges',
  icon: '\u{1F3AF}',
  category: 'chart',
  tags: ['data-viz', 'chart', 'bullet', 'target', 'comparison', 'kpi', 'performance'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_performance', 'kpi_metrics']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing the actual/current value',
      examples: ['actual', 'value', 'current']
    },
    {
      name: 'targetColumn',
      type: 'string',
      required: false,
      description: 'Column containing the target value',
      examples: ['target', 'goal', 'benchmark']
    },
    {
      name: 'labelColumn',
      type: 'string',
      required: false,
      description: 'Column containing labels for each bullet',
      examples: ['metric', 'name', 'category']
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
      name: 'min',
      type: 'number',
      required: false,
      default: 0,
      description: 'Minimum value on the scale'
    },
    {
      name: 'max',
      type: 'number',
      required: false,
      description: 'Maximum value on the scale (auto-calculated if not set)'
    },
    {
      name: 'orientation',
      type: 'string',
      required: false,
      default: 'horizontal',
      description: 'Chart orientation',
      options: ['horizontal', 'vertical']
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      default: '#1f2937',
      description: 'Primary bar color'
    },
    {
      name: 'showTarget',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show target marker'
    },
    {
      name: 'showValues',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show value labels'
    }
  ],
  examples: [
    `\`\`\`bullet
data: sales_performance
valueColumn: actual
targetColumn: target
labelColumn: region
title: Sales Performance by Region
\`\`\``,
    `\`\`\`bullet
data: kpi_metrics
valueColumn: score
targetColumn: goal
labelColumn: metric_name
title: Q4 KPI Performance
valueFormat: percent
\`\`\``
  ]
})
