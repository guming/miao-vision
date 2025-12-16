/**
 * Data Display Plugin
 *
 * Components for displaying data: BigValue, DataTable, Value, Sparkline
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { bigValueRegistration } from './bigvalue'
import { dataTableRegistration } from './datatable'
import { valueRegistration } from './value'
import { sparklineRegistration } from './sparkline'

// Re-export registrations for direct import
export { bigValueRegistration, dataTableRegistration, valueRegistration, sparklineRegistration }

// Re-export components
export { default as BigValue } from './bigvalue/BigValue.svelte'
export { default as DataTable } from './datatable/DataTable.svelte'
export { default as Value } from './value/Value.svelte'
export { default as Sparkline } from './sparkline/Sparkline.svelte'

// Re-export types
export type { BigValueConfig, BigValueData } from './bigvalue/types'
export type { DataTableConfig, DataTableData, ColumnConfig } from './datatable/types'
export type { ValueConfig, ValueData } from './value/types'
export type { SparklineConfig, SparklineData } from './sparkline/types'

// Re-export shared utilities
export { formatValue, formatNumber, formatCurrency, formatPercent } from './shared/formatter'

/**
 * Register all data display plugins with the component registry
 */
export function registerDataDisplayPlugins(registry: ComponentRegistry): void {
  console.log('📊 Registering data display plugins...')

  registry.register(bigValueRegistration)
  registry.register(dataTableRegistration)
  registry.register(valueRegistration)
  registry.register(sparklineRegistration)

  console.log('✅ Data display plugins registered: bigvalue, datatable, value, sparkline')
}

/**
 * All data display plugin registrations
 */
export const dataDisplayPlugins = [
  bigValueRegistration,
  dataTableRegistration,
  valueRegistration,
  sparklineRegistration
]
