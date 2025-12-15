/**
 * Value Component Metadata
 */

import { createMetadata } from '@/lib/core/component-registry'

export const ValueMetadata = createMetadata({
  type: 'data-viz',
  language: 'value',
  displayName: 'Value',
  description: 'Display a single value from a query result inline',
  icon: '🔢',
  category: 'metric',
  tags: ['data-viz', 'inline', 'value'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['total_revenue', 'user_count']
    },
    {
      name: 'column',
      type: 'string',
      required: true,
      description: 'Column name containing the value to display',
      examples: ['revenue', 'count']
    },
    {
      name: 'row',
      type: 'number',
      required: false,
      default: 0,
      description: 'Row index to extract value from'
    },
    {
      name: 'format',
      type: 'string',
      required: false,
      default: 'auto',
      description: 'Value format type',
      options: ['auto', 'number', 'currency', 'percent', 'date', 'text']
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
    `\`\`\`value
data: total_revenue
column: revenue
format: currency
prefix: $
\`\`\``
  ]
})
