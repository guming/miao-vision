/**
 * Heatmap Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing heatmap configuration
 */
export const HeatmapSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'xColumn', type: 'string', required: true },
    { name: 'yColumn', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'cellWidth', type: 'number', default: 40 },
    { name: 'cellHeight', type: 'number', default: 40 },
    { name: 'cellGap', type: 'number', default: 2 },
    { name: 'minColor', type: 'string', default: '#f0f9ff' },
    { name: 'midColor', type: 'string' },
    { name: 'maxColor', type: 'string', default: '#1e40af' },
    { name: 'min', type: 'number' },
    { name: 'max', type: 'number' },
    { name: 'showValues', type: 'boolean', default: true },
    { name: 'showXLabels', type: 'boolean', default: true },
    { name: 'showYLabels', type: 'boolean', default: true },
    { name: 'showLegend', type: 'boolean', default: true },
    {
      name: 'valueFormat',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'currencySymbol', type: 'string', default: '$' },
    { name: 'decimals', type: 'number', default: 1 },
    { name: 'roundedCorners', type: 'boolean', default: true },
    { name: 'class', type: 'string' }
  ]
}
