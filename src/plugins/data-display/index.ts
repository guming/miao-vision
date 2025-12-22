/**
 * Data Display Plugin
 *
 * Components for displaying data: BigValue, DataTable, Value, Delta, Sparkline, KPIGrid, Funnel
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { bigValueRegistration } from './bigvalue'
import { dataTableRegistration } from './datatable'
import { valueRegistration } from './value'
import { deltaRegistration } from './delta'
import { sparklineRegistration } from './sparkline'
import { kpiGridRegistration } from './kpigrid'
import { progressRegistration } from './progress'
import { funnelRegistration } from './funnel'

// Re-export registrations for direct import
export { bigValueRegistration, dataTableRegistration, valueRegistration, deltaRegistration, sparklineRegistration, kpiGridRegistration, progressRegistration, funnelRegistration }

// Re-export components
export { default as BigValue } from './bigvalue/BigValue.svelte'
export { default as DataTable } from './datatable/DataTable.svelte'
export { default as Value } from './value/Value.svelte'
export { default as Delta } from './delta/Delta.svelte'
export { default as Sparkline } from './sparkline/Sparkline.svelte'
export { default as KPIGrid } from './kpigrid/KPIGrid.svelte'
export { default as Progress } from './progress/Progress.svelte'
export { default as Funnel } from './funnel/Funnel.svelte'

// Re-export types
export type { BigValueConfig, BigValueData } from './bigvalue/types'
export type { DataTableConfig, DataTableData, ColumnConfig } from './datatable/types'
export type { ValueConfig, ValueData } from './value/types'
export type { DeltaConfig, DeltaData, DeltaDirection } from './delta/types'
export type { SparklineConfig, SparklineData } from './sparkline/types'
export type { KPIGridConfig, KPIGridData, KPICardConfig } from './kpigrid/types'
export type { ProgressConfig, ProgressData } from './progress/types'
export type { FunnelConfig, FunnelData, FunnelStage } from './funnel/types'

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
  registry.register(deltaRegistration)
  registry.register(sparklineRegistration)
  registry.register(kpiGridRegistration)
  registry.register(progressRegistration)
  registry.register(funnelRegistration)

  console.log('✅ Data display plugins registered: bigvalue, datatable, value, delta, sparkline, kpigrid, progress, funnel')
}

/**
 * All data display plugin registrations
 */
export const dataDisplayPlugins = [
  bigValueRegistration,
  dataTableRegistration,
  valueRegistration,
  deltaRegistration,
  sparklineRegistration,
  kpiGridRegistration,
  progressRegistration,
  funnelRegistration
]
