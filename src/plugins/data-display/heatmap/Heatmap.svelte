<script lang="ts">
/**
 * Heatmap Component
 *
 * Display matrix data as colored cells.
 */

import type { HeatmapData, HeatmapCell } from './types'

interface Props {
  data: HeatmapData
}

let { data }: Props = $props()

// Extract config with defaults
let config = $derived(data.config)
let cellWidth = $derived(config.cellWidth || 40)
let cellHeight = $derived(config.cellHeight || 40)
let cellGap = $derived(config.cellGap || 2)
let showValues = $derived(config.showValues !== false)
let showXLabels = $derived(config.showXLabels !== false)
let showYLabels = $derived(config.showYLabels !== false)
let showLegend = $derived(config.showLegend !== false)
let roundedCorners = $derived(config.roundedCorners !== false)

// Calculate dimensions
let yLabelWidth = $derived(showYLabels ? 100 : 0)
let xLabelHeight = $derived(showXLabels ? 30 : 0)
let legendHeight = $derived(showLegend ? 40 : 0)

let gridWidth = $derived(data.xLabels.length * (cellWidth + cellGap) - cellGap)
let gridHeight = $derived(data.yLabels.length * (cellHeight + cellGap) - cellGap)

let totalWidth = $derived(yLabelWidth + gridWidth + 20)
let totalHeight = $derived(xLabelHeight + gridHeight + legendHeight + 20)

// Tooltip state
let hoveredCell = $state<HeatmapCell | null>(null)
let tooltipX = $state(0)
let tooltipY = $state(0)

function handleCellEnter(cell: HeatmapCell, event: MouseEvent) {
  hoveredCell = cell
  tooltipX = event.clientX
  tooltipY = event.clientY
}

function handleCellLeave() {
  hoveredCell = null
}

// Get cell position
function getCellX(col: number): number {
  return yLabelWidth + col * (cellWidth + cellGap)
}

function getCellY(row: number): number {
  return xLabelHeight + row * (cellHeight + cellGap)
}
</script>

<div class="heatmap-chart {config.class || ''}">
  {#if data.title}
    <div class="heatmap-header">
      <h3 class="heatmap-title">{data.title}</h3>
      {#if data.subtitle}
        <p class="heatmap-subtitle">{data.subtitle}</p>
      {/if}
    </div>
  {/if}

  <svg
    class="heatmap-svg"
    viewBox="0 0 {totalWidth} {totalHeight}"
    style="width: {totalWidth}px; height: {totalHeight}px;"
    role="img"
    aria-label={data.title || 'Heatmap'}
  >
    <!-- X-axis labels (column headers) -->
    {#if showXLabels}
      <g class="heatmap-x-labels">
        {#each data.xLabels as label, i}
          <text
            x={getCellX(i) + cellWidth / 2}
            y={xLabelHeight - 8}
            text-anchor="middle"
            font-size="11"
            fill="#6b7280"
            class="heatmap-label"
          >
            {label}
          </text>
        {/each}
      </g>
    {/if}

    <!-- Y-axis labels (row headers) -->
    {#if showYLabels}
      <g class="heatmap-y-labels">
        {#each data.yLabels as label, i}
          <text
            x={yLabelWidth - 8}
            y={getCellY(i) + cellHeight / 2}
            text-anchor="end"
            dominant-baseline="middle"
            font-size="11"
            fill="#6b7280"
            class="heatmap-label"
          >
            {label}
          </text>
        {/each}
      </g>
    {/if}

    <!-- Cells -->
    <g class="heatmap-cells">
      {#each data.cells as cell (cell.id)}
        <g class="heatmap-cell-group">
          <rect
            x={getCellX(cell.col)}
            y={getCellY(cell.row)}
            width={cellWidth}
            height={cellHeight}
            fill={cell.color}
            rx={roundedCorners ? 4 : 0}
            ry={roundedCorners ? 4 : 0}
            class="heatmap-cell"
            role="button"
            tabindex="0"
            onmouseenter={(e) => handleCellEnter(cell, e)}
            onmouseleave={handleCellLeave}
            onfocus={(e) => handleCellEnter(cell, e as unknown as MouseEvent)}
            onblur={handleCellLeave}
          />
          {#if showValues}
            <text
              x={getCellX(cell.col) + cellWidth / 2}
              y={getCellY(cell.row) + cellHeight / 2}
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="10"
              fill={cell.normalizedValue > 0.5 ? 'white' : '#1f2937'}
              class="heatmap-cell-value"
              pointer-events="none"
            >
              {cell.formattedValue}
            </text>
          {/if}
        </g>
      {/each}
    </g>

    <!-- Color legend -->
    {#if showLegend}
      <g class="heatmap-legend" transform="translate({yLabelWidth}, {xLabelHeight + gridHeight + 15})">
        <defs>
          <linearGradient id="heatmap-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color={config.minColor || '#f0f9ff'} />
            {#if config.midColor}
              <stop offset="50%" stop-color={config.midColor} />
            {/if}
            <stop offset="100%" stop-color={config.maxColor || '#1e40af'} />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width={gridWidth}
          height="12"
          fill="url(#heatmap-gradient)"
          rx="2"
        />
        <text
          x="0"
          y="24"
          font-size="10"
          fill="#6b7280"
        >
          {data.minValue.toLocaleString()}
        </text>
        <text
          x={gridWidth}
          y="24"
          text-anchor="end"
          font-size="10"
          fill="#6b7280"
        >
          {data.maxValue.toLocaleString()}
        </text>
      </g>
    {/if}
  </svg>

  <!-- Tooltip -->
  {#if hoveredCell}
    <div
      class="heatmap-tooltip"
      style="left: {tooltipX + 10}px; top: {tooltipY - 10}px;"
    >
      <div class="heatmap-tooltip-labels">
        {hoveredCell.yLabel} × {hoveredCell.xLabel}
      </div>
      <div class="heatmap-tooltip-value">{hoveredCell.formattedValue}</div>
    </div>
  {/if}
</div>

<style>
.heatmap-chart {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  position: relative;
}

.heatmap-header {
  text-align: left;
}

.heatmap-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.heatmap-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.heatmap-svg {
  overflow: visible;
}

.heatmap-cell {
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.heatmap-cell:hover,
.heatmap-cell:focus {
  opacity: 0.85;
  outline: none;
}

.heatmap-label {
  font-family: inherit;
  pointer-events: none;
}

.heatmap-cell-value {
  font-family: inherit;
  font-weight: 500;
}

.heatmap-tooltip {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.heatmap-tooltip-labels {
  color: #6b7280;
  font-size: 0.75rem;
}

.heatmap-tooltip-value {
  font-weight: 600;
  color: #1f2937;
  margin-top: 0.125rem;
}
</style>
