/**
 * Alert Component Metadata
 */

import { createMetadata } from '@/lib/core/component-registry'

export const AlertMetadata = createMetadata({
  type: 'ui',
  language: 'alert',
  displayName: 'Alert',
  description: 'Display callout/alert boxes for highlighting important information',
  icon: '📢',
  category: 'ui',
  tags: ['ui', 'alert', 'callout', 'notice'],
  props: [
    {
      name: 'type',
      type: 'string',
      required: false,
      default: 'info',
      description: 'Alert type/style',
      options: ['info', 'success', 'warning', 'error', 'tip', 'note']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Title displayed in the alert header'
    },
    {
      name: 'icon',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show icon in the alert'
    },
    {
      name: 'dismissible',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Allow user to dismiss the alert'
    }
  ],
  examples: [
    `\`\`\`alert
type: warning
title: Important Notice

This is a warning message that users should pay attention to.
\`\`\``,
    `\`\`\`alert
type: tip
title: Pro Tip

You can use SQL template variables to make your reports interactive!
\`\`\``
  ]
})
