/**
 * Radar Chart Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing radar chart configuration
 */
export const RadarSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'labelColumn', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'seriesColumn', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'height', type: 'number', default: 400 },
    { name: 'max', type: 'number' },
    { name: 'min', type: 'number', default: 0 },
    { name: 'levels', type: 'number', default: 5 },
    { name: 'fill', type: 'boolean', default: true },
    { name: 'fillOpacity', type: 'number', default: 0.2 },
    { name: 'strokeWidth', type: 'number', default: 2 },
    { name: 'showDots', type: 'boolean', default: true },
    { name: 'dotRadius', type: 'number', default: 4 },
    { name: 'showLabels', type: 'boolean', default: true },
    { name: 'showValues', type: 'boolean', default: false },
    { name: 'showGrid', type: 'boolean', default: true },
    { name: 'colors', type: 'array' },
    { name: 'gridColor', type: 'string', default: '#e5e7eb' },
    { name: 'axisColor', type: 'string', default: '#9ca3af' },
    { name: 'labelColor', type: 'string', default: '#374151' },
    {
      name: 'valueFormat',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'currencySymbol', type: 'string', default: '$' },
    { name: 'class', type: 'string' }
  ]
}
