/**
 * Histogram Plugin
 *
 * Display data distribution as binned bars.
 */

export { histogramRegistration, default } from './definition'
export { HistogramMetadata } from './metadata'
export { HistogramSchema } from './schema'
export { default as Histogram } from './Histogram.svelte'
export type { HistogramConfig, HistogramData, HistogramBin } from './types'
