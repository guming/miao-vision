/**
 * Details Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { DetailsMetadata } from './metadata'
import Details from './Details.svelte'
import type { DetailsConfig, DetailsData } from './types'

// Schema for Details config
const DetailsSchema = {
  fields: [
    { name: 'title', type: 'string' as const, required: true },
    { name: 'icon', type: 'string' as const },
    { name: 'defaultOpen', type: 'boolean' as const, default: false },
    { name: 'bordered', type: 'boolean' as const, default: true }
  ]
}

interface DetailsProps {
  data: DetailsData
}

/**
 * Details component registration
 */
export const detailsRegistration = defineComponent<DetailsConfig, DetailsProps>({
  metadata: DetailsMetadata,
  configSchema: DetailsSchema,
  component: Details,
  containerClass: 'details-wrapper',

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

export default detailsRegistration
