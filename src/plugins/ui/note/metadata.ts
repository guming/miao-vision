/**
 * Note Component Metadata
 */

import { createMetadata } from '@core/registry'

export const NoteMetadata = createMetadata({
  type: 'ui',
  language: 'note',
  displayName: 'Note',
  description: 'GitHub-style admonition/callout box',
  icon: '📝',
  category: 'ui',
  tags: ['ui', 'note', 'callout', 'admonition', 'tip', 'warning'],
  props: [
    {
      name: 'type',
      type: 'string',
      required: false,
      description: 'Note type: note, tip, important, warning, caution (default: note)'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Custom title (defaults to type name)'
    },
    {
      name: 'collapsible',
      type: 'boolean',
      required: false,
      description: 'Make note collapsible (default: false)'
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      required: false,
      description: 'If collapsible, default open state (default: true)'
    }
  ],
  examples: [
    `\`\`\`note
type: tip
---
This is a helpful tip for users.
\`\`\``
  ]
})
