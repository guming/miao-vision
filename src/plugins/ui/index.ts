/**
 * UI Plugin
 *
 * General UI components: Alert, Tabs, etc.
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { alertRegistration } from './alert'

// Re-export registrations for direct import
export { alertRegistration }

// Re-export components
export { default as Alert } from './alert/Alert.svelte'
export type { AlertConfig, AlertData } from './alert/types'

/**
 * Register all UI plugins with the component registry
 */
export function registerUIPlugins(registry: ComponentRegistry): void {
  console.log('🎨 Registering UI plugins...')

  registry.register(alertRegistration)

  console.log('✅ UI plugins registered: alert')
}

/**
 * All UI plugin registrations
 */
export const uiPlugins = [
  alertRegistration
]
