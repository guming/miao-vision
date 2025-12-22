<script lang="ts">
/**
 * Sankey Diagram Component
 *
 * Displays flow relationships between nodes using a Sankey diagram.
 * Great for visualizing user flows, budget allocation, and conversion paths.
 *
 * @example
 * ```sankey
 * data: user_flow
 * sourceColumn: from_page
 * targetColumn: to_page
 * valueColumn: users
 * ```
 */

import type { SankeyData, SankeyNode, SankeyLink } from './types'

interface Props {
  data: SankeyData
}

let { data }: Props = $props()

const height = $derived(data.config.height || 400)
const nodeWidth = $derived(data.config.nodeWidth || 20)
const showLabels = $derived(data.config.showLabels !== false)
const showValues = $derived(data.config.showValues !== false)
const linkOpacity = $derived(data.config.linkOpacity ?? 0.5)

// Margins for labels
const margin = { top: 10, right: 120, bottom: 10, left: 120 }
const innerWidth = $derived(600 - margin.left - margin.right)

let hoveredLink: SankeyLink | null = $state(null)
let hoveredNode: SankeyNode | null = $state(null)

/**
 * Generate SVG path for a Sankey link (curved bezier)
 */
function getLinkPath(link: SankeyLink, nodes: SankeyNode[]): string {
  const sourceNode = nodes.find(n => n.id === link.source)
  const targetNode = nodes.find(n => n.id === link.target)

  if (!sourceNode || !targetNode) return ''

  const x0 = margin.left + sourceNode.x * innerWidth + nodeWidth
  const x1 = margin.left + targetNode.x * innerWidth
  const xi = (x0 + x1) / 2

  const y0 = margin.top + link.sourceY + link.width / 2
  const y1 = margin.top + link.targetY + link.width / 2

  return `M${x0},${y0} C${xi},${y0} ${xi},${y1} ${x1},${y1}`
}

function handleLinkEnter(link: SankeyLink) {
  hoveredLink = link
}

function handleLinkLeave() {
  hoveredLink = null
}

function handleNodeEnter(node: SankeyNode) {
  hoveredNode = node
}

function handleNodeLeave() {
  hoveredNode = null
}

function isLinkHighlighted(link: SankeyLink): boolean {
  if (hoveredLink) {
    return link === hoveredLink
  }
  if (hoveredNode) {
    return link.source === hoveredNode.id || link.target === hoveredNode.id
  }
  return false
}

function isLinkDimmed(link: SankeyLink): boolean {
  if (!hoveredLink && !hoveredNode) return false
  return !isLinkHighlighted(link)
}
</script>

<div class="sankey {data.config.class || ''}">
  {#if data.title}
    <div class="sankey-title">{data.title}</div>
  {/if}

  {#if data.subtitle}
    <div class="sankey-subtitle">{data.subtitle}</div>
  {/if}

  <svg
    width="100%"
    viewBox="0 0 600 {height}"
    class="sankey-svg"
    preserveAspectRatio="xMidYMid meet"
  >
    <!-- Links -->
    <g class="sankey-links">
      {#each data.links as link}
        <path
          d={getLinkPath(link, data.nodes)}
          fill="none"
          stroke={link.color}
          stroke-width={Math.max(1, link.width)}
          stroke-opacity={isLinkDimmed(link) ? 0.1 : (isLinkHighlighted(link) ? 0.8 : linkOpacity)}
          class="sankey-link"
          role="img"
          aria-label="{link.source} → {link.target}: {link.formattedValue}"
          onmouseenter={() => handleLinkEnter(link)}
          onmouseleave={handleLinkLeave}
        />
      {/each}
    </g>

    <!-- Nodes -->
    <g class="sankey-nodes">
      {#each data.nodes as node}
        <g
          class="sankey-node"
          transform="translate({margin.left + node.x * innerWidth}, {margin.top + node.y})"
          role="img"
          aria-label="{node.name}: {node.value.toLocaleString()}"
          onmouseenter={() => handleNodeEnter(node)}
          onmouseleave={handleNodeLeave}
        >
          <rect
            width={nodeWidth}
            height={node.height}
            fill={node.color}
            rx="2"
            class="node-rect"
          />

          {#if showLabels}
            <text
              x={node.x < 0.5 ? -6 : nodeWidth + 6}
              y={node.height / 2}
              dy="0.35em"
              text-anchor={node.x < 0.5 ? 'end' : 'start'}
              class="node-label"
            >
              {node.name}
            </text>
          {/if}

          {#if showValues}
            <text
              x={node.x < 0.5 ? -6 : nodeWidth + 6}
              y={node.height / 2 + 14}
              dy="0.35em"
              text-anchor={node.x < 0.5 ? 'end' : 'start'}
              class="node-value"
            >
              {node.value.toLocaleString()}
            </text>
          {/if}
        </g>
      {/each}
    </g>
  </svg>

  <!-- Tooltip -->
  {#if hoveredLink}
    <div class="sankey-tooltip">
      <strong>{hoveredLink.source}</strong> → <strong>{hoveredLink.target}</strong>
      <br />
      {hoveredLink.formattedValue}
    </div>
  {/if}

  <!-- Summary -->
  <div class="sankey-summary">
    <span class="summary-stat">
      <strong>{data.nodes.length}</strong> nodes
    </span>
    <span class="summary-stat">
      <strong>{data.links.length}</strong> flows
    </span>
    <span class="summary-stat">
      <strong>{data.totalValue.toLocaleString()}</strong> total
    </span>
  </div>
</div>

<style>
.sankey {
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  width: 100%;
  position: relative;
}

.sankey-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin-bottom: 0.25rem;
}

.sankey-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 0.75rem;
}

.sankey-svg {
  display: block;
  max-width: 100%;
  height: auto;
}

.sankey-link {
  cursor: pointer;
  transition: stroke-opacity 0.2s ease;
}

.sankey-node {
  cursor: pointer;
}

.node-rect {
  transition: opacity 0.2s ease;
}

.sankey-node:hover .node-rect {
  opacity: 0.8;
}

.node-label {
  font-size: 11px;
  fill: var(--text-primary, #1f2937);
  font-weight: 500;
}

.node-value {
  font-size: 10px;
  fill: var(--text-secondary, #6b7280);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}

.sankey-tooltip {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--bg-primary, #1f2937);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  pointer-events: none;
  z-index: 10;
  line-height: 1.4;
}

.sankey-summary {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
}

.summary-stat strong {
  color: var(--text-primary, #1f2937);
  font-weight: 600;
}

/* Responsive */
@media (max-width: 640px) {
  .sankey-summary {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .node-label {
    font-size: 9px;
  }

  .node-value {
    font-size: 8px;
  }
}
</style>
