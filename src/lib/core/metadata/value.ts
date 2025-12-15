/**
 * Value Component Metadata
 *
 * Displays a single value from a query result with formatting support
 */

import type { ComponentMetadata } from '../component-registry'

export const ValueMetadata: ComponentMetadata = {
  language: 'value',
  displayName: 'Value',
  description: 'Display a single value from a query result with formatting',
  type: 'component',
  category: 'data-viz',

  props: [
    {
      name: 'data',
      type: 'string',
      description: 'Name of the SQL query block to get data from',
      required: true
    },
    {
      name: 'column',
      type: 'string',
      description: 'Column name to display the value from',
      required: true
    },
    {
      name: 'row',
      type: 'number',
      description: 'Row index to get value from (default: 0)',
      required: false,
      default: 0
    },
    {
      name: 'format',
      type: 'enum',
      description: 'Format type for the value',
      required: false,
      default: 'auto',
      options: ['auto', 'number', 'currency', 'percent', 'date', 'text']
    },
    {
      name: 'precision',
      type: 'number',
      description: 'Decimal precision for number formats',
      required: false,
      default: 2
    },
    {
      name: 'prefix',
      type: 'string',
      description: 'Text to display before the value',
      required: false
    },
    {
      name: 'suffix',
      type: 'string',
      description: 'Text to display after the value',
      required: false
    },
    {
      name: 'placeholder',
      type: 'string',
      description: 'Text to display when value is null/undefined',
      required: false,
      default: '-'
    },
    {
      name: 'class',
      type: 'string',
      description: 'Additional CSS classes',
      required: false
    }
  ],

  examples: [
    {
      title: 'Basic Value',
      code: `\`\`\`value
data: total_sales
column: total
\`\`\``
    },
    {
      title: 'Currency Format',
      code: `\`\`\`value
data: revenue_query
column: revenue
format: currency
prefix: $
\`\`\``
    },
    {
      title: 'Percentage',
      code: `\`\`\`value
data: metrics
column: growth_rate
format: percent
precision: 1
suffix: %
\`\`\``
    }
  ]
}
