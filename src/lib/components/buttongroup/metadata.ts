/**
 * ButtonGroup Component Metadata
 */

import { createMetadata } from '@/lib/core/component-registry'

export const ButtonGroupMetadata = createMetadata({
  type: 'input',
  language: 'buttongroup',
  displayName: 'Button Group',
  description: 'Interactive button group input for filtering data',
  icon: '🔘',
  category: 'input',
  tags: ['input', 'buttongroup', 'toggle', 'filter'],
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Input variable name for referencing in SQL'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Title displayed above the button group'
    },
    {
      name: 'options',
      type: 'array',
      required: false,
      description: 'Inline options (alternative to SQL data source)'
    },
    {
      name: 'data',
      type: 'query',
      required: false,
      description: 'SQL query name providing the options'
    },
    {
      name: 'value',
      type: 'string',
      required: false,
      description: 'Column name for option values (when using data)'
    },
    {
      name: 'defaultValue',
      type: 'string',
      required: false,
      description: 'Default selected value'
    }
  ],
  examples: [
    `\`\`\`buttongroup
name: time_range
title: Time Range
options:
  - 7d: Last 7 Days
  - 30d: Last 30 Days
  - 90d: Last 90 Days
defaultValue: 30d
\`\`\``
  ]
})
