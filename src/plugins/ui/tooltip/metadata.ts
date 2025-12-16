/**
 * Tooltip Component Metadata
 */

import { createMetadata } from '@core/registry'

export const TooltipMetadata = createMetadata({
  type: 'ui',
  language: 'tooltip',
  displayName: 'Tooltip',
  description: 'Hover tooltip for additional information',
  icon: '💬',
  category: 'ui',
  tags: ['ui', 'tooltip', 'hint', 'help', 'info'],
  props: [
    {
      name: 'text',
      type: 'string',
      required: true,
      description: 'Tooltip text content'
    },
    {
      name: 'trigger',
      type: 'string',
      required: false,
      description: 'Trigger text/label'
    },
    {
      name: 'position',
      type: 'string',
      required: false,
      description: 'Position: top, bottom, left, right'
    },
    {
      name: 'icon',
      type: 'string',
      required: false,
      description: 'Optional icon emoji'
    }
  ],
  examples: [
    `\`\`\`tooltip
text: This metric shows total revenue including all product categories
trigger: Revenue
icon: ℹ️
position: top
\`\`\``
  ]
})
