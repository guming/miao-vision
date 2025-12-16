/**
 * Note Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { NoteMetadata } from './metadata'
import Note from './Note.svelte'
import type { NoteConfig, NoteData } from './types'

// Schema for Note config
const NoteSchema = {
  fields: [
    { name: 'type', type: 'string' as const, default: 'note' },
    { name: 'title', type: 'string' as const },
    { name: 'collapsible', type: 'boolean' as const, default: false },
    { name: 'defaultOpen', type: 'boolean' as const, default: true }
  ]
}

interface NoteProps {
  data: NoteData
}

/**
 * Note component registration
 */
export const noteRegistration = defineComponent<NoteConfig, NoteProps>({
  metadata: NoteMetadata,
  configSchema: NoteSchema,
  component: Note,
  containerClass: 'note-wrapper',

  buildProps: (config, _data, context) => {
    const block = (context as any).block

    let content = ''

    if (block?.content) {
      const parts = block.content.split('---')
      if (parts.length > 1) {
        content = parts.slice(1).join('---').trim()
      } else {
        content = block.content.trim()
      }
    }

    // Convert markdown-like formatting to HTML
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

export default noteRegistration
