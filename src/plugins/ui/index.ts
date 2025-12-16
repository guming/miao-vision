/**
 * UI Plugin
 *
 * General UI components: Alert, Tabs, etc.
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { alertRegistration } from './alert'
import { tabsRegistration } from './tabs'
import { accordionRegistration } from './accordion'
import { tooltipRegistration } from './tooltip'

// Re-export registrations for direct import
export { alertRegistration, tabsRegistration, accordionRegistration, tooltipRegistration }

// Re-export components
export { default as Alert } from './alert/Alert.svelte'
export type { AlertConfig, AlertData } from './alert/types'
export { default as Tabs } from './tabs/Tabs.svelte'
export type { TabsConfig, TabsData, TabConfig } from './tabs/types'
export { default as Accordion } from './accordion/Accordion.svelte'
export type { AccordionConfig, AccordionData } from './accordion/types'
export { default as Tooltip } from './tooltip/Tooltip.svelte'
export type { TooltipConfig, TooltipData } from './tooltip/types'

/**
 * Register all UI plugins with the component registry
 */
export function registerUIPlugins(registry: ComponentRegistry): void {
  console.log('🎨 Registering UI plugins...')

  registry.register(alertRegistration)
  registry.register(tabsRegistration)
  registry.register(accordionRegistration)
  registry.register(tooltipRegistration)

  console.log('✅ UI plugins registered: alert, tabs, accordion, tooltip')
}

/**
 * All UI plugin registrations
 */
export const uiPlugins = [
  alertRegistration,
  tabsRegistration,
  accordionRegistration,
  tooltipRegistration
]
