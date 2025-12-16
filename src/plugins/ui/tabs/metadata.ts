/**
 * Tabs Component Metadata
 */

import { createMetadata } from '@core/registry'

export const TabsMetadata = createMetadata({
  type: 'ui',
  language: 'tabs',
  displayName: 'Tabs',
  description: 'Tabbed content container for organizing related content',
  icon: '📑',
  category: 'ui',
  tags: ['ui', 'tabs', 'navigation', 'layout'],
  props: [
    {
      name: 'defaultTab',
      type: 'number',
      required: false,
      description: 'Default active tab index (0-based)'
    },
    {
      name: 'variant',
      type: 'string',
      required: false,
      description: 'Tab style: default, pills, or underline'
    },
    {
      name: 'fullWidth',
      type: 'boolean',
      required: false,
      description: 'Make tabs take full width'
    }
  ],
  examples: [
    `\`\`\`tabs
- Overview
- Details
- History
\`\`\`

{tab Overview}
## Overview content here
{/tab}

{tab Details}
## Details content here
{/tab}

{tab History}
## History content here
{/tab}`
  ]
})
