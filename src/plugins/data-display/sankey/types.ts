/**
 * Sankey Diagram Component Types
 *
 * Configuration and data types for the Sankey visualization.
 */

/**
 * Sankey diagram configuration from markdown
 */
export interface SankeyConfig {
  /** Query name providing the data */
  data: string

  /** Column containing source node names */
  sourceColumn: string

  /** Column containing target node names */
  targetColumn: string

  /** Column containing flow values */
  valueColumn: string

  /** Chart title */
  title?: string

  /** Chart subtitle */
  subtitle?: string

  /** Height in pixels */
  height?: number

  /** Node width in pixels */
  nodeWidth?: number

  /** Padding between nodes in pixels */
  nodePadding?: number

  /** Node alignment: 'left', 'right', 'center', 'justify' */
  nodeAlign?: 'left' | 'right' | 'center' | 'justify'

  /** Color scheme for nodes */
  colorScheme?: 'default' | 'category' | 'blue' | 'green' | 'warm' | 'cool'

  /** Show node labels */
  showLabels?: boolean

  /** Show values on links */
  showValues?: boolean

  /** Value format */
  valueFormat?: 'number' | 'currency' | 'percent'

  /** Currency symbol */
  currencySymbol?: string

  /** Link opacity (0-1) */
  linkOpacity?: number

  /** Additional CSS class */
  class?: string
}

/**
 * A node in the Sankey diagram
 */
export interface SankeyNode {
  /** Unique node ID */
  id: string

  /** Display name */
  name: string

  /** Node color */
  color: string

  /** Total value flowing through this node */
  value: number

  /** X position (0-1, computed) */
  x: number

  /** Y position (pixels, computed) */
  y: number

  /** Height (pixels, computed) */
  height: number

  /** Column/layer index */
  layer: number
}

/**
 * A link/flow between two nodes
 */
export interface SankeyLink {
  /** Source node ID */
  source: string

  /** Target node ID */
  target: string

  /** Flow value */
  value: number

  /** Formatted value string */
  formattedValue: string

  /** Link color (gradient or solid) */
  color: string

  /** Source Y position */
  sourceY: number

  /** Target Y position */
  targetY: number

  /** Link width/thickness */
  width: number
}

/**
 * Processed Sankey data passed to component
 */
export interface SankeyData {
  /** Array of nodes */
  nodes: SankeyNode[]

  /** Array of links */
  links: SankeyLink[]

  /** Title */
  title?: string

  /** Subtitle */
  subtitle?: string

  /** Total flow value */
  totalValue: number

  /** Component configuration */
  config: SankeyConfig
}
