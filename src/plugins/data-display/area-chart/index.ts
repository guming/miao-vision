/**
 * Area Chart Component Module
 */

// Types
export type { AreaChartConfig, AreaChartData, AreaSeries, AreaPoint } from './types'

// Metadata
export { AreaChartMetadata } from './metadata'

// Component registration (adapter layer)
export { areaChartRegistration } from './definition'

// Component
export { default as AreaChart } from './AreaChart.svelte'
