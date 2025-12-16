/**
 * KPI Grid Component Module
 */

// Types
export type { KPIGridConfig, KPIGridData, KPICardConfig, KPICardData, TrendType } from './types'

// Metadata
export { KPIGridMetadata } from './metadata'

// Component registration (adapter layer)
export { kpiGridRegistration } from './definition'

// Component
export { default as KPIGrid } from './KPIGrid.svelte'
