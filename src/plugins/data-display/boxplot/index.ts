/**
 * BoxPlot Plugin
 *
 * Display statistical distribution with quartiles, median, and outliers.
 */

export { boxPlotRegistration, default } from './definition'
export { BoxPlotMetadata } from './metadata'
export { BoxPlotSchema } from './schema'
export { default as BoxPlot } from './BoxPlot.svelte'
export type { BoxPlotConfig, BoxPlotData, BoxPlotStats } from './types'
