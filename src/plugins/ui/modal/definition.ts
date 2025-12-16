/**
 * Modal Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { ModalMetadata } from './metadata'
import Modal from './Modal.svelte'
import type { ModalConfig, ModalData } from './types'

// Schema for Modal config
const ModalSchema = {
  fields: [
    { name: 'buttonText', type: 'string' as const, default: 'Open' },
    { name: 'title', type: 'string' as const },
    { name: 'size', type: 'string' as const, default: 'md' },
    { name: 'closeOnOverlay', type: 'boolean' as const, default: true },
    { name: 'closeOnEscape', type: 'boolean' as const, default: true },
    { name: 'showClose', type: 'boolean' as const, default: true }
  ]
}

interface ModalProps {
  data: ModalData
}

/**
 * Modal component registration
 */
export const modalRegistration = defineComponent<ModalConfig, ModalProps>({
  metadata: ModalMetadata,
  configSchema: ModalSchema,
  component: Modal,
  containerClass: 'modal-wrapper',

  buildProps: (config, _data, context) => {
    // Get the original block to access raw content
    const block = (context as any).block

    // Parse content from the block
    // Content can be provided after a "---" separator in the YAML
    let content = ''

    if (block?.content) {
      // Check if there's a separator
      const parts = block.content.split('---')
      if (parts.length > 1) {
        // Content is after the separator
        content = parts.slice(1).join('---').trim()
      } else {
        content = block.content.trim()
      }
    }

    // Convert simple markdown-like formatting to HTML
    if (content) {
      content = content
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')

      content = `<p>${content}</p>`
    }

    return {
      data: {
        config,
        content
      }
    }
  }
})

export default modalRegistration
