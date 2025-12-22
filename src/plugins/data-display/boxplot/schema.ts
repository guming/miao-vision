/**
 * BoxPlot Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing box plot configuration
 */
export const BoxPlotSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'groupColumn', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'height', type: 'number', default: 300 },
    { name: 'color', type: 'string', default: '#3B82F6' },
    { name: 'showOutliers', type: 'boolean', default: true },
    { name: 'outlierMultiplier', type: 'number', default: 1.5 },
    { name: 'showMean', type: 'boolean', default: true },
    {
      name: 'orientation',
      type: 'enum',
      enum: ['vertical', 'horizontal'],
      default: 'vertical'
    },
    {
      name: 'valueFormat',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'currencySymbol', type: 'string', default: '$' },
    { name: 'showLabels', type: 'boolean', default: true },
    { name: 'class', type: 'string' }
  ]
}
