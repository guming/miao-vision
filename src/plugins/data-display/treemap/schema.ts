/**
 * Treemap Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing treemap configuration
 */
export const TreemapSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'labelColumn', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'groupColumn', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'height', type: 'number', default: 400 },
    {
      name: 'colorScheme',
      type: 'enum',
      enum: ['default', 'category', 'blue', 'green', 'warm', 'cool', 'mono'],
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
    { name: 'minLabelSize', type: 'number', default: 40 },
    { name: 'tilePadding', type: 'number', default: 2 },
    { name: 'borderRadius', type: 'number', default: 4 },
    { name: 'class', type: 'string' }
  ]
}
