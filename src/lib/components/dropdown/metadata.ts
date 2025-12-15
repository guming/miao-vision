/**
 * Dropdown Component Metadata
 */

import { createMetadata } from '@/lib/core/component-registry'

export const DropdownMetadata = createMetadata({
  type: 'input',
  language: 'dropdown',
  displayName: 'Dropdown',
  description: 'Interactive dropdown input for filtering data',
  icon: '🔽',
  category: 'input',
  tags: ['input', 'dropdown', 'select', 'filter'],
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Input variable name for referencing in SQL',
      examples: ['selected_region', 'category_filter']
    },
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the options',
      examples: ['regions', 'categories']
    },
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Column name for option values',
      examples: ['id', 'code']
    },
    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Column name for option labels (default: same as value)',
      examples: ['name', 'display_name']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Title displayed above the dropdown'
    },
    {
      name: 'defaultValue',
      type: 'string',
      required: false,
      description: 'Default selected value'
    }
  ],
  examples: [
    `\`\`\`dropdown
name: selected_region
data: regions
value: region_code
label: region_name
title: Select Region
defaultValue: US
\`\`\``
  ]
})
