/**
 * Line Chart Component Module
 */

// Types
export type { LineChartConfig, LineChartData, LineSeries, LinePoint } from './types'

// Metadata
export { LineChartMetadata } from './metadata'

// Component registration (adapter layer)
export { lineChartRegistration } from './definition'

// Component
export { default as LineChart } from './LineChart.svelte'
