/**
 * Sankey Diagram Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 * Implements a simplified Sankey layout algorithm.
 */

import { defineComponent } from '@core/registry'
import { SankeyMetadata } from './metadata'
import { SankeySchema } from './schema'
import Sankey from './Sankey.svelte'
import type { SankeyConfig, SankeyData, SankeyNode, SankeyLink } from './types'

/**
 * Props passed to Sankey.svelte
 */
interface SankeyProps {
  data: SankeyData
}

/**
 * Raw link data from query
 */
interface RawLink {
  source: string
  target: string
  value: number
}

/**
 * Color schemes for nodes
 */
const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
  category: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'],
  blue: ['#1E40AF', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
  green: ['#166534', '#15803D', '#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7'],
  warm: ['#9A3412', '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5'],
  cool: ['#1E3A8A', '#1E40AF', '#3730A3', '#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE']
}

/**
 * Format a value based on format type
 */
export function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number',
  currencySymbol: string = '$'
): string {
  if (format === 'currency') {
    return `${currencySymbol}${value.toLocaleString()}`
  }
  if (format === 'percent') {
    return `${value.toFixed(1)}%`
  }
  return value.toLocaleString()
}

/**
 * Get color for a node based on scheme and index
 */
export function getNodeColor(index: number, colorScheme: string = 'default'): string {
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.default
  return colors[index % colors.length]
}

/**
 * Compute Sankey layout from raw links
 * Simplified algorithm that assigns nodes to layers and computes positions
 */
export function computeSankeyLayout(
  rawLinks: RawLink[],
  config: SankeyConfig,
  height: number
): { nodes: SankeyNode[]; links: SankeyLink[] } {
  const nodePadding = config.nodePadding || 10
  const colorScheme = config.colorScheme || 'default'
  const valueFormat = config.valueFormat || 'number'
  const currencySymbol = config.currencySymbol || '$'

  // Collect unique nodes and compute layers
  const nodeMap = new Map<string, { value: number; sources: Set<string>; targets: Set<string> }>()

  for (const link of rawLinks) {
    if (!nodeMap.has(link.source)) {
      nodeMap.set(link.source, { value: 0, sources: new Set(), targets: new Set() })
    }
    if (!nodeMap.has(link.target)) {
      nodeMap.set(link.target, { value: 0, sources: new Set(), targets: new Set() })
    }

    const sourceNode = nodeMap.get(link.source)!
    const targetNode = nodeMap.get(link.target)!

    sourceNode.value += link.value
    sourceNode.targets.add(link.target)
    targetNode.sources.add(link.source)
  }

  // Assign layers using topological order
  const layers = new Map<string, number>()
  const visited = new Set<string>()

  function assignLayer(nodeId: string): number {
    if (layers.has(nodeId)) return layers.get(nodeId)!
    if (visited.has(nodeId)) return 0 // Cycle detection

    visited.add(nodeId)
    const node = nodeMap.get(nodeId)!

    let maxSourceLayer = -1
    for (const source of node.sources) {
      maxSourceLayer = Math.max(maxSourceLayer, assignLayer(source))
    }

    const layer = maxSourceLayer + 1
    layers.set(nodeId, layer)
    return layer
  }

  // Assign layers to all nodes
  for (const nodeId of nodeMap.keys()) {
    assignLayer(nodeId)
  }

  // Find max layer
  const maxLayer = Math.max(...layers.values())

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>()
  for (const [nodeId, layer] of layers) {
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, [])
    }
    layerGroups.get(layer)!.push(nodeId)
  }

  // Compute node positions
  const nodes: SankeyNode[] = []
  const nodePositions = new Map<string, SankeyNode>()

  let colorIndex = 0
  for (let layer = 0; layer <= maxLayer; layer++) {
    const layerNodes = layerGroups.get(layer) || []

    // Sort by value (largest first)
    layerNodes.sort((a, b) => nodeMap.get(b)!.value - nodeMap.get(a)!.value)

    // Compute total value for this layer
    const totalValue = layerNodes.reduce((sum, id) => sum + nodeMap.get(id)!.value, 0)

    // Available height for nodes
    const availableHeight = height - (layerNodes.length - 1) * nodePadding

    // Position nodes
    let currentY = 0
    for (const nodeId of layerNodes) {
      const nodeData = nodeMap.get(nodeId)!
      const nodeHeight = Math.max(5, (nodeData.value / totalValue) * availableHeight)

      const node: SankeyNode = {
        id: nodeId,
        name: nodeId,
        color: getNodeColor(colorIndex++, colorScheme),
        value: nodeData.value,
        x: maxLayer > 0 ? layer / maxLayer : 0,
        y: currentY,
        height: nodeHeight,
        layer
      }

      nodes.push(node)
      nodePositions.set(nodeId, node)

      currentY += nodeHeight + nodePadding
    }
  }

  // Compute link positions
  const links: SankeyLink[] = []

  // Track cumulative Y offset for each node's outgoing/incoming links
  const sourceOffsets = new Map<string, number>()
  const targetOffsets = new Map<string, number>()

  for (const nodeId of nodeMap.keys()) {
    sourceOffsets.set(nodeId, 0)
    targetOffsets.set(nodeId, 0)
  }

  // Sort links by source then target for consistent ordering
  const sortedLinks = [...rawLinks].sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source)
    return a.target.localeCompare(b.target)
  })

  for (const rawLink of sortedLinks) {
    const sourceNode = nodePositions.get(rawLink.source)!
    const targetNode = nodePositions.get(rawLink.target)!

    if (!sourceNode || !targetNode) continue

    // Calculate proportional width
    const sourceTotal = nodeMap.get(rawLink.source)!.value || 1
    const targetTotal = nodeMap.get(rawLink.target)!.value || 1
    const minHeight = Math.min(sourceNode.height || 20, targetNode.height || 20)
    const ratio = rawLink.value / Math.max(sourceTotal, targetTotal)
    const width = Math.max(1, isNaN(ratio) ? 1 : ratio * minHeight)

    const sourceY = sourceNode.y + sourceOffsets.get(rawLink.source)!
    const targetY = targetNode.y + targetOffsets.get(rawLink.target)!

    // Update offsets
    sourceOffsets.set(rawLink.source, sourceOffsets.get(rawLink.source)! + width)
    targetOffsets.set(rawLink.target, targetOffsets.get(rawLink.target)! + width)

    links.push({
      source: rawLink.source,
      target: rawLink.target,
      value: rawLink.value,
      formattedValue: formatValue(rawLink.value, valueFormat, currencySymbol),
      color: sourceNode.color,
      sourceY,
      targetY,
      width
    })
  }

  return { nodes, links }
}

/**
 * Sankey diagram component registration
 */
export const sankeyRegistration = defineComponent<SankeyConfig, SankeyProps>({
  metadata: SankeyMetadata,
  configSchema: SankeySchema,
  component: Sankey,
  containerClass: 'sankey-wrapper',

  // Data binding: extract source-target-value triples
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[Sankey] No data available')
        return null
      }

      const sourceCol = config.sourceColumn
      const targetCol = config.targetColumn
      const valueCol = config.valueColumn

      if (!sourceCol || !targetCol || !valueCol) {
        console.warn('[Sankey] sourceColumn, targetColumn, and valueColumn are required')
        return null
      }

      // Extract links from query result
      const rawLinks: RawLink[] = []

      for (const row of queryResult.data) {
        const source = String(row[sourceCol] || '')
        const target = String(row[targetCol] || '')
        const value = parseFloat(String(row[valueCol] || 0))

        if (source && target && !isNaN(value) && value > 0) {
          rawLinks.push({ source, target, value })
        }
      }

      if (rawLinks.length === 0) {
        console.warn('[Sankey] No valid links found')
        return null
      }

      return rawLinks
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): SankeyProps => {
    const rawLinks = rawData as RawLink[] | null

    if (!rawLinks || rawLinks.length === 0) {
      return {
        data: {
          nodes: [],
          links: [],
          title: config.title,
          subtitle: config.subtitle,
          totalValue: 0,
          config
        }
      }
    }

    const height = config.height || 400
    const { nodes, links } = computeSankeyLayout(rawLinks, config, height - 20)

    const totalValue = rawLinks.reduce((sum, link) => sum + link.value, 0)

    return {
      data: {
        nodes,
        links,
        title: config.title,
        subtitle: config.subtitle,
        totalValue,
        config
      }
    }
  }
})

export default sankeyRegistration
