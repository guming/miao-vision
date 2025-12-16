/**
 * DateRange Component Module
 */

// Types
export type { DateRangeConfig, DateRangeData, DateRangePreset, DateRangeValue } from './types'
export { DEFAULT_PRESETS } from './types'

// Metadata
export { DateRangeMetadata } from './metadata'

// Component registration (adapter layer)
export { dateRangeRegistration } from './definition'

// Component
export { default as DateRange } from './DateRange.svelte'
