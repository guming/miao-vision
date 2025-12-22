/**
 * Delta Component Metadata
 */

import { createMetadata } from '@core/registry'

export const DeltaMetadata = createMetadata({
  type: 'data-viz',
  language: 'delta',
  displayName: 'Delta',
  description: 'Display inline comparison indicator showing value changes',
  icon: '📈',
  category: 'metric',
  tags: ['data-viz', 'inline', 'comparison', 'change', 'delta'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['revenue_comparison', 'metrics']
    },
    {
      name: 'column',
      type: 'string',
      required: true,
      description: 'Column name containing the current value',
      examples: ['current_value', 'this_month']
    },
    {
      name: 'comparison',
      type: 'string',
      required: false,
      description: 'Column name for comparison value. If not provided, uses next row.',
      examples: ['previous_value', 'last_month']
    },
    {
      name: 'row',
      type: 'number',
      required: false,
      default: 0,
      description: 'Row index for current value'
    },
    {
      name: 'comparisonRow',
      type: 'number',
      required: false,
      description: 'Row index for comparison value (defaults to row + 1 if comparison column not specified)'
    },
    {
      name: 'format',
      type: 'string',
      required: false,
      default: 'percent',
      description: 'Display format for the delta',
      options: ['absolute', 'percent']
    },
    {
      name: 'decimals',
      type: 'number',
      required: false,
      default: 1,
      description: 'Number of decimal places'
    },
    {
      name: 'showSymbol',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show +/- symbol'
    },
    {
      name: 'showArrow',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show directional arrow'
    },
    {
      name: 'positiveIsGood',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether positive change is good (green). Set false for metrics like costs.'
    },
    {
      name: 'chip',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Display as a pill/chip badge style'
    },
    {
      name: 'prefix',
      type: 'string',
      required: false,
      description: 'Text to display before the value'
    },
    {
      name: 'suffix',
      type: 'string',
      required: false,
      description: 'Text to display after the value'
    }
  ],
  examples: [
    `\`\`\`delta
data: revenue_comparison
column: current
comparison: previous
format: percent
\`\`\``,
    `\`\`\`delta
data: metrics
column: value
format: absolute
positiveIsGood: false
chip: true
\`\`\``
  ]
})
