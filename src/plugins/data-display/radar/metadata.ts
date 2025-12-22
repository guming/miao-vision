/**
 * Radar Chart Component Metadata
 */

import { createMetadata } from '@core/registry'

export const RadarMetadata = createMetadata({
  type: 'data-viz',
  language: 'radar',
  displayName: 'Radar Chart',
  description: 'Display multi-dimensional data on radial axes (spider chart)',
  icon: '\u{1F578}',
  category: 'chart',
  tags: ['data-viz', 'chart', 'radar', 'spider', 'multi-dimensional', 'comparison'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['performance_metrics', 'skill_scores']
    },
    {
      name: 'labelColumn',
      type: 'string',
      required: true,
      description: 'Column containing axis/dimension labels',
      examples: ['metric', 'skill', 'category']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing values (or comma-separated for multiple series)',
      examples: ['score', 'value', 'actual,target']
    },
    {
      name: 'seriesColumn',
      type: 'string',
      required: false,
      description: 'Column for series names when grouping data',
      examples: ['team', 'product', 'year']
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
      name: 'height',
      type: 'number',
      required: false,
      default: 400,
      description: 'Chart height in pixels'
    },
    {
      name: 'max',
      type: 'number',
      required: false,
      description: 'Maximum value for scale (auto-calculated if not set)'
    },
    {
      name: 'min',
      type: 'number',
      required: false,
      default: 0,
      description: 'Minimum value for scale'
    },
    {
      name: 'levels',
      type: 'number',
      required: false,
      default: 5,
      description: 'Number of concentric grid levels'
    },
    {
      name: 'fill',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to fill the radar area'
    },
    {
      name: 'fillOpacity',
      type: 'number',
      required: false,
      default: 0.2,
      description: 'Fill opacity (0-1)'
    },
    {
      name: 'showDots',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show dots at data points'
    },
    {
      name: 'showLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show axis labels'
    },
    {
      name: 'showGrid',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show the grid/web'
    },
    {
      name: 'colors',
      type: 'array',
      required: false,
      description: 'Color palette for series',
      examples: ['["#3b82f6", "#ef4444", "#22c55e"]']
    }
  ],
  examples: [
    `\`\`\`radar
data: skill_assessment
labelColumn: skill
valueColumn: score
title: Developer Skills
fill: true
showDots: true
\`\`\``,
    `\`\`\`radar
data: team_comparison
labelColumn: metric
valueColumn: value
seriesColumn: team
title: Team Performance
colors: ["#3b82f6", "#ef4444"]
levels: 4
\`\`\``
  ]
})
