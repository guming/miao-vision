/**
 * Sankey Diagram Plugin
 *
 * Display flow relationships between nodes using a Sankey diagram.
 */

export { sankeyRegistration, default } from './definition'
export { SankeyMetadata } from './metadata'
export { SankeySchema } from './schema'
export { default as Sankey } from './Sankey.svelte'
export type { SankeyConfig, SankeyData, SankeyNode, SankeyLink } from './types'
