/**
 * Input Component Metadata Definitions
 */

import { createMetadata, type ComponentMetadata } from '../component-registry'

/**
 * Dropdown Input
 */
export const DropdownMetadata = createMetadata({
  type: 'input',
  language: 'dropdown',
  displayName: 'Dropdown',
  description: 'Single-select dropdown menu from query results',
  icon: '▼',
  category: 'input',
  tags: ['input', 'filter', 'select', 'dropdown'],
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Variable name (accessible as ${inputs.xxx})',
      examples: ['selected_region', 'selected_category']
    },
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing options',
      examples: ['regions_list', 'categories_list']
    },
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Column to use as option values',
      examples: ['region', 'category', 'id']
    },
    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Column to use as option labels (defaults to value)',
      examples: ['region_name', 'category_display_name']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Label displayed above the dropdown',
      examples: ['Select a Region', 'Choose Category']
    },
    {
      name: 'placeholder',
      type: 'string',
      required: false,
      description: 'Placeholder text when no option selected',
      examples: ['Choose an option...', 'Select...']
    },
    {
      name: 'defaultValue',
      type: 'string',
      required: false,
      description: 'Default selected value',
      examples: ['North America', 'Electronics']
    }
  ],
  examples: [
    `\`\`\`dropdown
name: selected_region
data: regions_list
value: region
title: Select a Region
defaultValue: North America
\`\`\``
  ]
})

/**
 * Button Group Input
 */
export const ButtonGroupMetadata = createMetadata({
  type: 'input',
  language: 'buttongroup',
  displayName: 'Button Group',
  description: 'Single-select button group for quick filtering',
  icon: '🔘',
  category: 'input',
  tags: ['input', 'filter', 'select', 'buttons'],
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Variable name (accessible as ${inputs.xxx})',
      examples: ['time_period', 'view_mode']
    },
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing options',
      examples: ['time_periods', 'view_modes']
    },
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Column to use as button values',
      examples: ['period', 'mode']
    },
    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Column to use as button labels',
      examples: ['period_display', 'mode_name']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Label displayed above the button group',
      examples: ['Time Period', 'View Mode']
    },
    {
      name: 'defaultValue',
      type: 'string',
      required: false,
      description: 'Default selected value',
      examples: ['month', 'table']
    }
  ],
  examples: [
    `\`\`\`buttongroup
name: time_period
data: periods
value: period_value
label: period_label
title: Select Time Period
defaultValue: month
\`\`\``
  ]
})

/**
 * All input metadata
 */
export const INPUT_METADATA: ComponentMetadata[] = [
  DropdownMetadata,
  ButtonGroupMetadata
]
