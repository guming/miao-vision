/**
 * Accordion Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { AccordionMetadata } from './metadata'
import Accordion from './Accordion.svelte'
import type { AccordionConfig, AccordionData, AccordionItem } from './types'

// Schema for Accordion config
const AccordionSchema = {
  fields: [
    { name: 'multiple', type: 'boolean' as const, default: false },
    { name: 'defaultExpanded', type: 'number' as const },
    { name: 'bordered', type: 'boolean' as const, default: true },
    { name: 'compact', type: 'boolean' as const, default: false }
  ]
}

interface AccordionProps {
  data: AccordionData
}

/**
 * Parse accordion items from markdown list format
 */
function parseAccordionItems(content: string): { title: string; icon?: string }[] {
  const lines = content.trim().split('\n')
  const items: { title: string; icon?: string }[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match list items: "- Title" or "* Title"
    const match = trimmed.match(/^[-*]\s+(.+)$/)
    if (match) {
      const titlePart = match[1].trim()
      // Check for icon: "📊 Title" or just "Title"
      const iconMatch = titlePart.match(/^(\p{Emoji})\s+(.+)$/u)
      if (iconMatch) {
        items.push({
          title: iconMatch[2],
          icon: iconMatch[1]
        })
      } else {
        items.push({ title: titlePart })
      }
    }
  }

  return items
}

/**
 * Accordion component registration
 */
export const accordionRegistration = defineComponent<AccordionConfig, AccordionProps>({
  metadata: AccordionMetadata,
  configSchema: AccordionSchema,
  component: Accordion,
  containerClass: 'accordion-wrapper',

  buildProps: (config, _data, context) => {
    // Get the original block to access raw content
    const block = (context as any).block

    // Parse items from content
    let items: AccordionItem[] = []

    if (block?.content) {
      const parsedItems = parseAccordionItems(block.content)
      items = parsedItems.map((item, idx) => ({
        title: item.title,
        icon: item.icon,
        content: '<p class="text-gray-400">Content for this section</p>',
        expanded: config.defaultExpanded === idx
      }))
    }

    return {
      data: {
        config,
        items
      }
    }
  }
})

export default accordionRegistration
