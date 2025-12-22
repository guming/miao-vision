/**
 * Heatmap Plugin
 *
 * Display matrix data as colored cells (correlation matrices, pivot tables).
 */

export { heatmapRegistration, default } from './definition'
export { HeatmapMetadata } from './metadata'
export { HeatmapSchema } from './schema'
export { default as Heatmap } from './Heatmap.svelte'
export type { HeatmapConfig, HeatmapData, HeatmapCell } from './types'
