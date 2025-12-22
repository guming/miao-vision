/**
 * Gauge Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing gauge configuration
 */
export const GaugeSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'min', type: 'number', default: 0 },
    { name: 'max', type: 'number', default: 100 },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'size', type: 'number', default: 200 },
    {
      name: 'type',
      type: 'enum',
      enum: ['full', 'half', 'quarter'],
      default: 'half'
    },
    {
      name: 'valueFormat',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'currencySymbol', type: 'string', default: '$' },
    { name: 'decimals', type: 'number', default: 0 },
    { name: 'showValue', type: 'boolean', default: true },
    { name: 'showLimits', type: 'boolean', default: true },
    { name: 'color', type: 'string', default: '#3B82F6' },
    { name: 'backgroundColor', type: 'string', default: '#e5e7eb' },
    { name: 'thickness', type: 'number', default: 20 },
    { name: 'class', type: 'string' }
  ]
}
