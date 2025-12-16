/**
 * BigValue Component Module
 */

// Types
export type { BigValueConfig, BigValueData, ComparisonData } from './types'

// Metadata
export { BigValueMetadata } from './metadata'

// Component registration (adapter layer)
export { bigValueRegistration } from './definition'

// Formatter
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatValue,
  calculateComparison,
  getTrendIcon,
  getTrendColor
} from './formatter'

// Component
export { default as BigValue } from './BigValue.svelte'
