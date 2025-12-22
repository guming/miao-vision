/**
 * Funnel Component Metadata
 */

import { createMetadata } from '@core/registry'

export const FunnelMetadata = createMetadata({
  type: 'data-viz',
  language: 'funnel',
  displayName: 'Funnel',
  description: 'Display a funnel chart for conversion analysis and pipeline visualization',
  icon: '📊',
  category: 'chart',
  tags: ['data-viz', 'chart', 'funnel', 'conversion', 'pipeline', 'sales'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_pipeline', 'conversion_funnel']
    },
    {
      name: 'nameColumn',
      type: 'string',
      required: true,
      description: 'Column containing stage names/labels',
      examples: ['stage', 'step_name']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing stage values',
      examples: ['count', 'amount', 'users']
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
      name: 'showValues',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show value labels'
    },
    {
      name: 'showPercent',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show percentage labels'
    },
    {
      name: 'percentBase',
      type: 'string',
      required: false,
      default: 'first',
      description: 'Percentage calculation base',
      options: ['first', 'previous']
    },
    {
      name: 'valueFormat',
      type: 'string',
      required: false,
      default: 'number',
      description: 'Format for value display',
      options: ['number', 'currency', 'percent']
    },
    {
      name: 'colorScheme',
      type: 'string',
      required: false,
      default: 'default',
      description: 'Color scheme for the funnel',
      options: ['default', 'gradient', 'blue', 'green', 'orange']
    },
    {
      name: 'align',
      type: 'string',
      required: false,
      default: 'center',
      description: 'Funnel bar alignment',
      options: ['center', 'left', 'right']
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 300,
      description: 'Chart height in pixels'
    },
    {
      name: 'showConnectors',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show connector lines between stages'
    }
  ],
  examples: [
    `\`\`\`funnel
data: sales_pipeline
nameColumn: stage
valueColumn: count
title: Sales Funnel
showPercent: true
\`\`\``,
    `\`\`\`funnel
data: user_conversion
nameColumn: step
valueColumn: users
colorScheme: blue
percentBase: previous
align: left
\`\`\``
  ]
})
