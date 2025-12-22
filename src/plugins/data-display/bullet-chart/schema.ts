/**
 * BulletChart Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing bullet chart configuration
 */
export const BulletChartSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'targetColumn', type: 'string' },
    { name: 'labelColumn', type: 'string' },
    { name: 'min', type: 'number', default: 0 },
    { name: 'max', type: 'number' },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'height', type: 'number', default: 300 },
    {
      name: 'orientation',
      type: 'enum',
      enum: ['horizontal', 'vertical'],
      default: 'horizontal'
    },
    {
      name: 'valueFormat',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'currencySymbol', type: 'string', default: '$' },
    { name: 'showValues', type: 'boolean', default: true },
    { name: 'showTarget', type: 'boolean', default: true },
    { name: 'color', type: 'string', default: '#1f2937' },
    { name: 'class', type: 'string' }
  ]
}
