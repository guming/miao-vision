/**
 * Waterfall Chart Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing waterfall chart configuration
 */
export const WaterfallSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'labelColumn', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'totalColumn', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'height', type: 'number', default: 400 },
    { name: 'positiveColor', type: 'string', default: '#22c55e' },
    { name: 'negativeColor', type: 'string', default: '#ef4444' },
    { name: 'totalColor', type: 'string', default: '#3b82f6' },
    {
      name: 'valueFormat',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'currencySymbol', type: 'string', default: '$' },
    { name: 'showLabels', type: 'boolean', default: true },
    { name: 'showConnectors', type: 'boolean', default: true },
    {
      name: 'orientation',
      type: 'enum',
      enum: ['vertical', 'horizontal'],
      default: 'vertical'
    },
    { name: 'class', type: 'string' }
  ]
}
