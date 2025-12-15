/**
 * Alert Component Metadata
 *
 * Displays callout/alert boxes for highlighting important information
 */

import type { ComponentMetadata } from '../component-registry'

export const AlertMetadata: ComponentMetadata = {
  language: 'alert',
  displayName: 'Alert',
  description: 'Display an alert/callout box for important information',
  type: 'component',
  category: 'ui',

  props: [
    {
      name: 'type',
      type: 'enum',
      description: 'Alert type/style',
      required: false,
      default: 'info',
      options: ['info', 'success', 'warning', 'error', 'tip', 'note']
    },
    {
      name: 'title',
      type: 'string',
      description: 'Alert title (optional)',
      required: false
    },
    {
      name: 'icon',
      type: 'boolean',
      description: 'Show icon (default: true)',
      required: false,
      default: true
    },
    {
      name: 'dismissible',
      type: 'boolean',
      description: 'Allow dismissing the alert',
      required: false,
      default: false
    }
  ],

  examples: [
    {
      title: 'Info Alert',
      code: `\`\`\`alert
type: info
title: Note
\`\`\`
This is important information.`
    },
    {
      title: 'Warning Alert',
      code: `\`\`\`alert
type: warning
title: Caution
\`\`\`
Please review before proceeding.`
    },
    {
      title: 'Success Alert',
      code: `\`\`\`alert
type: success
\`\`\`
Operation completed successfully!`
    }
  ]
}
