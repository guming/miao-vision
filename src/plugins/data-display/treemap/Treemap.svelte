<script lang="ts">
/**
 * Treemap Component
 *
 * Displays hierarchical data as nested rectangles sized by value.
 * Great for visualizing proportions and category breakdown.
 *
 * @example
 * ```treemap
 * data: budget_breakdown
 * labelColumn: category
 * valueColumn: amount
 * colorScheme: blue
 * ```
 */

import type { TreemapData, TreemapTile } from './types'

interface Props {
  data: TreemapData
}

let { data }: Props = $props()

const height = $derived(data.config.height || 400)
const showLabels = $derived(data.config.showLabels !== false)
const showValues = $derived(data.config.showValues !== false)
const minLabelSize = $derived(data.config.minLabelSize || 40)
const borderRadius = $derived(data.config.borderRadius ?? 4)

let hoveredTile: TreemapTile | null = $state(null)

function canShowLabel(tile: TreemapTile): boolean {
  return tile.width >= minLabelSize && tile.height >= minLabelSize
}

function canShowValue(tile: TreemapTile): boolean {
  return tile.width >= minLabelSize && tile.height >= (minLabelSize + 16)
}

function getTextColor(bgColor: string): string {
  // Simple luminance check for text contrast
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1f2937' : '#ffffff'
}

function handleTileEnter(tile: TreemapTile) {
  hoveredTile = tile
}

function handleTileLeave() {
  hoveredTile = null
}
</script>

<div class="treemap {data.config.class || ''}">
  {#if data.title}
    <div class="treemap-title">{data.title}</div>
  {/if}

  {#if data.subtitle}
    <div class="treemap-subtitle">{data.subtitle}</div>
  {/if}

  <div class="treemap-container" style="height: {height}px;">
    {#each data.tiles as tile}
      <div
        class="treemap-tile"
        class:hovered={hoveredTile === tile}
        style="
          left: {tile.x}px;
          top: {tile.y}px;
          width: {tile.width}px;
          height: {tile.height}px;
          background-color: {tile.color};
          border-radius: {borderRadius}px;
        "
        role="img"
        aria-label="{tile.label}: {tile.formattedValue} ({tile.percent.toFixed(1)}%)"
        onmouseenter={() => handleTileEnter(tile)}
        onmouseleave={handleTileLeave}
      >
        {#if showLabels && canShowLabel(tile)}
          <span
            class="tile-label"
            style="color: {getTextColor(tile.color)}"
          >
            {tile.label}
          </span>
        {/if}

        {#if showValues && canShowValue(tile)}
          <span
            class="tile-value"
            style="color: {getTextColor(tile.color)}"
          >
            {tile.formattedValue}
          </span>
        {/if}
      </div>
    {/each}

    <!-- Tooltip -->
    {#if hoveredTile}
      <div class="treemap-tooltip">
        <strong>{hoveredTile.label}</strong>
        {#if hoveredTile.group}
          <span class="tooltip-group">({hoveredTile.group})</span>
        {/if}
        <div class="tooltip-value">
          {hoveredTile.formattedValue}
          <span class="tooltip-percent">({hoveredTile.percent.toFixed(1)}%)</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Legend / Summary -->
  <div class="treemap-summary">
    <span class="summary-stat">
      <strong>{data.tiles.length}</strong> items
    </span>
    <span class="summary-stat">
      <strong>{data.totalValue.toLocaleString()}</strong> total
    </span>
  </div>
</div>

<style>
.treemap {
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  width: 100%;
}

.treemap-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin-bottom: 0.25rem;
}

.treemap-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 0.75rem;
}

.treemap-container {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.treemap-tile {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  box-sizing: border-box;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.treemap-tile:hover {
  opacity: 0.9;
  transform: scale(1.02);
  z-index: 10;
}

.treemap-tile.hovered {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tile-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.tile-value {
  font-size: 0.7rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  opacity: 0.9;
  margin-top: 2px;
}

.treemap-tooltip {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--bg-primary, #1f2937);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  pointer-events: none;
  z-index: 20;
  line-height: 1.4;
}

.tooltip-group {
  opacity: 0.7;
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

.tooltip-value {
  margin-top: 0.25rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}

.tooltip-percent {
  opacity: 0.7;
  font-size: 0.75rem;
}

.treemap-summary {
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
  .tile-label {
    font-size: 0.65rem;
  }

  .tile-value {
    font-size: 0.6rem;
  }
}
</style>
