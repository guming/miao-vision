/**
 * TextInput Component Metadata
 */

import { createMetadata } from '@core/registry'

export const TextInputMetadata = createMetadata({
  type: 'input',
  language: 'textinput',
  displayName: 'Text Input',
  description: 'Text input for search and filtering',
  icon: '🔍',
  category: 'input',
  tags: ['input', 'text', 'search', 'filter'],
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Input variable name for referencing in SQL',
      examples: ['search_term', 'filter_text']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Title displayed above the input'
    },
    {
      name: 'placeholder',
      type: 'string',
      required: false,
      description: 'Placeholder text shown when empty',
      examples: ['Search...', 'Enter keyword']
    },
    {
      name: 'defaultValue',
      type: 'string',
      required: false,
      description: 'Default input value'
    },
    {
      name: 'debounce',
      type: 'number',
      required: false,
      description: 'Debounce delay in milliseconds (default: 300)'
    },
    {
      name: 'minLength',
      type: 'number',
      required: false,
      description: 'Minimum characters before triggering update'
    },
    {
      name: 'inputType',
      type: 'string',
      required: false,
      description: 'HTML input type: text, search, email, url, tel'
    }
  ],
  examples: [
    `\`\`\`textinput
name: search_term
title: Search Products
placeholder: Enter product name...
debounce: 500
\`\`\``
  ]
})
