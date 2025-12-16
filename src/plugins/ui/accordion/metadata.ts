/**
 * Accordion Component Metadata
 */

import { createMetadata } from '@core/registry'

export const AccordionMetadata = createMetadata({
  type: 'ui',
  language: 'accordion',
  displayName: 'Accordion',
  description: 'Collapsible content sections',
  icon: '📋',
  category: 'ui',
  tags: ['ui', 'accordion', 'collapse', 'expandable', 'layout'],
  props: [
    {
      name: 'multiple',
      type: 'boolean',
      required: false,
      description: 'Allow multiple open sections (default: false)'
    },
    {
      name: 'defaultExpanded',
      type: 'number',
      required: false,
      description: 'Default expanded item index (0-based)'
    },
    {
      name: 'bordered',
      type: 'boolean',
      required: false,
      description: 'Show borders (default: true)'
    },
    {
      name: 'compact',
      type: 'boolean',
      required: false,
      description: 'Compact mode (default: false)'
    }
  ],
  examples: [
    `\`\`\`accordion
multiple: false
- Section 1
- Section 2
- Section 3
\`\`\``
  ]
})
