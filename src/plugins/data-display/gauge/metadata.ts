/**
 * Gauge Component Metadata
 */

import { createMetadata } from '@core/registry'

export const GaugeMetadata = createMetadata({
  type: 'data-viz',
  language: 'gauge',
  displayName: 'Gauge',
  description: 'Display a value on a circular scale',
  icon: '\u{1F3AF}',
  category: 'chart',
  tags: ['data-viz', 'chart', 'gauge', 'meter', 'dial', 'kpi', 'progress'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['current_score', 'performance_metric']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing the value to display',
      examples: ['value', 'score', 'percentage']
    },
    {
      name: 'min',
      type: 'number',
      required: false,
      default: 0,
      description: 'Minimum value on the scale'
    },
    {
      name: 'max',
      type: 'number',
      required: false,
      default: 100,
      description: 'Maximum value on the scale'
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
      name: 'size',
      type: 'number',
      required: false,
      default: 200,
      description: 'Gauge size in pixels'
    },
    {
      name: 'type',
      type: 'string',
      required: false,
      default: 'half',
      description: 'Gauge type',
      options: ['full', 'half', 'quarter']
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      default: '#3B82F6',
      description: 'Color for the filled portion'
    },
    {
      name: 'showValue',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show value in center'
    },
    {
      name: 'showLimits',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show min/max labels'
    },
    {
      name: 'thickness',
      type: 'number',
      required: false,
      default: 20,
      description: 'Thickness of the gauge arc'
    }
  ],
  examples: [
    `\`\`\`gauge
data: performance_score
valueColumn: score
min: 0
max: 100
title: Performance Score
color: #10B981
\`\`\``,
    `\`\`\`gauge
data: completion_rate
valueColumn: percent
title: Project Completion
type: half
valueFormat: percent
\`\`\``
  ]
})
