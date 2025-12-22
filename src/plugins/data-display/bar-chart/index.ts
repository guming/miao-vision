/**
 * Bar Chart Plugin
 *
 * Compare values across categories with vertical or horizontal bars.
 */

// Registration
export { barChartRegistration } from './definition'
export { barChartRegistration as default } from './definition'

// Component
export { default as BarChart } from './BarChart.svelte'

// Metadata
export { BarChartMetadata } from './metadata'

// Types
export type { BarChartConfig, BarChartData, BarItem } from './types'
