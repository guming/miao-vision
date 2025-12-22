/**
 * Plugin Initialization (Bootstrap Layer)
 *
 * Registers all plugin components with the ComponentRegistry.
 * This file lives in bootstrap/ to keep core/ free of plugin dependencies.
 */

import { componentRegistry } from '@core/registry'
import { registerAllPlugins } from '@plugins/index'

/**
 * Register all plugin components
 *
 * Plugins include:
 * - inputs: dropdown, buttongroup, textinput, slider, daterange, etc.
 * - data-display: bigvalue, datatable, sparkline, bar, pie, histogram, etc.
 * - ui: alert, tabs, accordion, tooltip, etc.
 * - layout: grid
 */
export function registerPlugins(): void {
  console.log('🔌 Registering plugin components...')
  registerAllPlugins(componentRegistry)
  console.log('✅ Plugin components registered')
}
