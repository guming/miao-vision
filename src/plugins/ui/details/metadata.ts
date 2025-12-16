/**
 * Details Component Metadata
 */

import { createMetadata } from '@core/registry'

export const DetailsMetadata = createMetadata({
  type: 'ui',
  language: 'details',
  displayName: 'Details',
  description: 'Expandable details section',
  icon: '📄',
  category: 'ui',
  tags: ['ui', 'details', 'collapse', 'expandable', 'disclosure'],
  props: [
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'Section title'
    },
    {
      name: 'icon',
      type: 'string',
      required: false,
      description: 'Optional icon'
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      required: false,
      description: 'Default expanded state (default: false)'
    },
    {
      name: 'bordered',
      type: 'boolean',
      required: false,
      description: 'Show border (default: true)'
    }
  ],
  examples: [
    `\`\`\`details
title: Technical Details
icon: 🔧
defaultOpen: false
---
This content is hidden by default and can be expanded.
\`\`\``
  ]
})
