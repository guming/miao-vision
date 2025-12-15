/**
 * BigValue Component Metadata
 *
 * Defines the component schema, props, and examples for documentation/IDE support
 */

import { createMetadata } from '@/lib/core/component-registry'

export const BigValueMetadata = createMetadata({
  type: 'data-viz',
  language: 'bigvalue',
  displayName: 'Big Value',
  description: 'Display a single large metric value with optional formatting and comparison',
  icon: '🔢',
  category: 'metric',
  tags: ['data-viz', 'metric', 'kpi', 'number'],
  props: [
    {
      name: 'query',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data (should return single row)',
      examples: ['total_revenue', 'user_count']
    },
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Column name containing the value to display',
      examples: ['revenue', 'total', 'count']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Title displayed above the value',
      examples: ['Total Revenue', 'Active Users', 'YTD Sales']
    },
    {
      name: 'format',
      type: 'string',
      required: false,
      default: 'number',
      description: 'Value format type',
      options: ['number', 'currency', 'percent']
    },
    {
      name: 'comparison',
      type: 'query',
      required: false,
      description: 'SQL query name for comparison value',
      examples: ['last_month_revenue']
    },
    {
      name: 'comparisonLabel',
      type: 'string',
      required: false,
      description: 'Label for comparison display',
      examples: ['vs last month', 'vs previous year']
    }
  ],
  examples: [
    `\`\`\`bigvalue
query: total_revenue
value: revenue
title: Total Revenue
format: currency
\`\`\``,
    `\`\`\`bigvalue
query: current_users
value: count
title: Active Users
comparison: last_month_users
comparisonLabel: vs last month
\`\`\``
  ]
})
