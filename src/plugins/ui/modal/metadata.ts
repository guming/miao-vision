/**
 * Modal Component Metadata
 */

import { createMetadata } from '@core/registry'

export const ModalMetadata = createMetadata({
  type: 'ui',
  language: 'modal',
  displayName: 'Modal',
  description: 'Modal dialog for displaying content in an overlay',
  icon: '📦',
  category: 'ui',
  tags: ['ui', 'modal', 'dialog', 'popup', 'overlay'],
  props: [
    {
      name: 'buttonText',
      type: 'string',
      required: false,
      description: 'Trigger button text (default: "Open")'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Modal title'
    },
    {
      name: 'size',
      type: 'string',
      required: false,
      description: 'Modal size: sm, md, lg, xl (default: md)'
    },
    {
      name: 'closeOnOverlay',
      type: 'boolean',
      required: false,
      description: 'Close when clicking overlay (default: true)'
    },
    {
      name: 'closeOnEscape',
      type: 'boolean',
      required: false,
      description: 'Close on Escape key (default: true)'
    },
    {
      name: 'showClose',
      type: 'boolean',
      required: false,
      description: 'Show close button (default: true)'
    }
  ],
  examples: [
    `\`\`\`modal
buttonText: View Details
title: Product Details
size: md
---
This is the modal content. You can include **markdown** here.
\`\`\``
  ]
})
