/**
 * Scatter Chart Component Module
 */

// Types
export type { ScatterChartConfig, ScatterChartData, ScatterPoint } from './types'

// Metadata
export { ScatterChartMetadata } from './metadata'

// Component registration (adapter layer)
export { scatterChartRegistration } from './definition'

// Component
export { default as ScatterChart } from './ScatterChart.svelte'
