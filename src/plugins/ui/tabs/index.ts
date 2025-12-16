/**
 * Tabs Component Module
 */

// Types
export type { TabsConfig, TabConfig, TabsData } from './types'

// Metadata
export { TabsMetadata } from './metadata'

// Component registration (adapter layer)
export { tabsRegistration } from './definition'

// Component
export { default as Tabs } from './Tabs.svelte'
