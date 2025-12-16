/**
 * Accordion Component Module
 */

// Types
export type { AccordionConfig, AccordionData, AccordionItem, AccordionItemConfig } from './types'

// Metadata
export { AccordionMetadata } from './metadata'

// Component registration (adapter layer)
export { accordionRegistration } from './definition'

// Component
export { default as Accordion } from './Accordion.svelte'
