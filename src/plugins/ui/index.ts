/**
 * UI Plugin
 *
 * General UI components: Alert, Tabs, etc.
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { alertRegistration } from './alert'
import { tabsRegistration } from './tabs'

// Re-export registrations for direct import
export { alertRegistration, tabsRegistration }

// Re-export components
export { default as Alert } from './alert/Alert.svelte'
export type { AlertConfig, AlertData } from './alert/types'
export { default as Tabs } from './tabs/Tabs.svelte'
export type { TabsConfig, TabsData, TabConfig } from './tabs/types'

/**
 * Register all UI plugins with the component registry
 */
export function registerUIPlugins(registry: ComponentRegistry): void {
  console.log('🎨 Registering UI plugins...')

  registry.register(alertRegistration)
  registry.register(tabsRegistration)

  console.log('✅ UI plugins registered: alert, tabs')
}

/**
 * All UI plugin registrations
 */
export const uiPlugins = [
  alertRegistration,
  tabsRegistration
]
