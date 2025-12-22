/**
 * Pie Chart Plugin
 *
 * Display proportions as pie or donut slices.
 */

// Registration
export { pieChartRegistration } from './definition'
export { pieChartRegistration as default } from './definition'

// Component
export { default as PieChart } from './PieChart.svelte'

// Metadata
export { PieChartMetadata } from './metadata'

// Types
export type { PieChartConfig, PieChartData, PieSlice } from './types'
