/**
 * Funnel Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing funnel configuration
 */
export const FunnelSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'nameColumn', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'showValues', type: 'boolean', default: true },
    { name: 'showPercent', type: 'boolean', default: true },
    {
      name: 'percentBase',
      type: 'enum',
      enum: ['first', 'previous'],
      default: 'first'
    },
    {
      name: 'valueFormat',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'currencySymbol', type: 'string', default: '$' },
    { name: 'decimals', type: 'number', default: 0 },
    {
      name: 'colorScheme',
      type: 'enum',
      enum: ['default', 'gradient', 'blue', 'green', 'orange'],
      default: 'default'
    },
    {
      name: 'align',
      type: 'enum',
      enum: ['center', 'left', 'right'],
      default: 'center'
    },
    { name: 'height', type: 'number', default: 300 },
    { name: 'showConnectors', type: 'boolean', default: true },
    { name: 'class', type: 'string' }
  ]
}
