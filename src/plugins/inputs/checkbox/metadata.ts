/**
 * Checkbox Component Metadata
 */

import { createMetadata } from '@core/registry'

export const CheckboxMetadata = createMetadata({
  type: 'input',
  language: 'checkbox',
  displayName: 'Checkbox',
  description: 'Boolean input for toggling options on/off',
  icon: '☑️',
  category: 'input',
  tags: ['input', 'checkbox', 'boolean', 'toggle', 'filter'],
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Input variable name for referencing in SQL'
    },
    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Label text displayed next to the checkbox'
    },
    {
      name: 'defaultValue',
      type: 'boolean',
      required: false,
      description: 'Default checked state (true/false)'
    },
    {
      name: 'description',
      type: 'string',
      required: false,
      description: 'Optional description text below the checkbox'
    }
  ],
  examples: [
    `\`\`\`checkbox
name: include_inactive
label: Include inactive items
defaultValue: false
\`\`\``,
    `\`\`\`checkbox
name: show_details
label: Show detailed view
defaultValue: true
description: Enable this to see additional columns
\`\`\``
  ]
})
