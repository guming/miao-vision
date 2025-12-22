/**
 * Sankey Diagram Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing sankey configuration
 */
export const SankeySchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'sourceColumn', type: 'string', required: true },
    { name: 'targetColumn', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'height', type: 'number', default: 400 },
    { name: 'nodeWidth', type: 'number', default: 20 },
    { name: 'nodePadding', type: 'number', default: 10 },
    {
      name: 'nodeAlign',
      type: 'enum',
      enum: ['left', 'right', 'center', 'justify'],
      default: 'justify'
    },
    {
      name: 'colorScheme',
      type: 'enum',
      enum: ['default', 'category', 'blue', 'green', 'warm', 'cool'],
      default: 'default'
    },
    { name: 'showLabels', type: 'boolean', default: true },
    { name: 'showValues', type: 'boolean', default: true },
    {
      name: 'valueFormat',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'currencySymbol', type: 'string', default: '$' },
    { name: 'linkOpacity', type: 'number', default: 0.5 },
    { name: 'class', type: 'string' }
  ]
}
