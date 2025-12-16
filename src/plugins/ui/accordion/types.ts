/**
 * Accordion Component Types
 */

export interface AccordionItemConfig {
  title: string           // Section title
  icon?: string           // Optional icon
  expanded?: boolean      // Default expanded state
}

export interface AccordionConfig {
  multiple?: boolean      // Allow multiple open sections (default: false)
  defaultExpanded?: number  // Default expanded item index (0-based)
  bordered?: boolean      // Show borders (default: true)
  compact?: boolean       // Compact mode (default: false)
}

export interface AccordionItem {
  title: string
  icon?: string
  content: string         // HTML content
  expanded: boolean
}

export interface AccordionData {
  config: AccordionConfig
  items: AccordionItem[]
}
