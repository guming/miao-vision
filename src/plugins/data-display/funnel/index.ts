/**
 * Funnel Plugin
 *
 * Display funnel charts for conversion analysis and pipeline visualization.
 */

export { funnelRegistration, default } from './definition'
export { FunnelMetadata } from './metadata'
export { FunnelSchema } from './schema'
export { default as Funnel } from './Funnel.svelte'
export type { FunnelConfig, FunnelData, FunnelStage } from './types'
