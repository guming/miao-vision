<script lang="ts">
/**
 * Radar Chart Component
 *
 * Display multi-dimensional data on radial axes (spider chart).
 */

import type { RadarData, RadarSeries, RadarPoint } from './types'

interface Props {
  data: RadarData
}

let { data }: Props = $props()

// Extract config with defaults
let config = $derived(data.config)
let height = $derived(config.height || 400)
let showGrid = $derived(config.showGrid !== false)
let showLabels = $derived(config.showLabels !== false)
let showDots = $derived(config.showDots !== false)
let fill = $derived(config.fill !== false)
let fillOpacity = $derived(config.fillOpacity ?? 0.2)
let strokeWidth = $derived(config.strokeWidth ?? 2)
let dotRadius = $derived(config.dotRadius ?? 4)
let gridColor = $derived(config.gridColor || '#e5e7eb')
let axisColor = $derived(config.axisColor || '#9ca3af')
let labelColor = $derived(config.labelColor || '#374151')

// Tooltip state
let hoveredSeries = $state<RadarSeries | null>(null)
let hoveredPoint = $state<RadarPoint | null>(null)
let tooltipX = $state(0)
let tooltipY = $state(0)

function handlePointEnter(series: RadarSeries, point: RadarPoint, event: MouseEvent) {
  hoveredSeries = series
  hoveredPoint = point
  tooltipX = event.clientX
  tooltipY = event.clientY
}

function handlePointLeave() {
  hoveredSeries = null
  hoveredPoint = null
}
</script>

<div class="radar-chart {config.class || ''}">
  {#if data.title}
    <div class="radar-header">
      <h3 class="radar-title">{data.title}</h3>
      {#if data.subtitle}
        <p class="radar-subtitle">{data.subtitle}</p>
      {/if}
    </div>
  {/if}

  <svg
    class="radar-svg"
    viewBox="0 0 {height} {height}"
    style="height: {height}px; width: {height}px;"
    role="img"
    aria-label={data.title || 'Radar chart'}
  >
    <g class="radar-container" transform="translate({data.centerX}, {data.centerY})">
      <!-- Grid levels (concentric polygons) -->
      {#if showGrid}
        <g class="radar-grid">
          {#each data.gridLevels as level}
            <path
              d={level.path}
              fill="none"
              stroke={gridColor}
              stroke-width="1"
              opacity="0.5"
            />
          {/each}
        </g>
      {/if}

      <!-- Axis lines (spokes) -->
      <g class="radar-axes">
        {#each data.axes as axis}
          <line
            x1="0"
            y1="0"
            x2={axis.labelX * 0.9}
            y2={axis.labelY * 0.9}
            stroke={axisColor}
            stroke-width="1"
            opacity="0.5"
          />
        {/each}
      </g>

      <!-- Data series -->
      <g class="radar-series">
        {#each data.series as series}
          <!-- Area fill -->
          {#if fill}
            <path
              d={series.path}
              fill={series.color}
              fill-opacity={fillOpacity}
              stroke="none"
              class="radar-area"
            />
          {/if}

          <!-- Stroke line -->
          <path
            d={series.path}
            fill="none"
            stroke={series.color}
            stroke-width={strokeWidth}
            stroke-linejoin="round"
            class="radar-line"
          />

          <!-- Data points -->
          {#if showDots}
            {#each series.points as point}
              <circle
                cx={point.x}
                cy={point.y}
                r={dotRadius}
                fill={series.color}
                stroke="white"
                stroke-width="2"
                class="radar-dot"
                role="button"
                tabindex="0"
                onmouseenter={(e) => handlePointEnter(series, point, e)}
                onmouseleave={handlePointLeave}
                onfocus={(e) => handlePointEnter(series, point, e as unknown as MouseEvent)}
                onblur={handlePointLeave}
              />
            {/each}
          {/if}
        {/each}
      </g>
    </g>

    <!-- Axis labels (outside transform group for proper positioning) -->
    {#if showLabels}
      <g class="radar-labels">
        {#each data.axes as axis}
          <text
            x={data.centerX + axis.labelX}
            y={data.centerY + axis.labelY}
            text-anchor={axis.anchor}
            dominant-baseline="middle"
            fill={labelColor}
            font-size="12"
            class="radar-label"
          >
            {axis.label}
          </text>
        {/each}
      </g>
    {/if}
  </svg>

  <!-- Legend -->
  {#if data.series.length > 1}
    <div class="radar-legend">
      {#each data.series as series}
        <div class="radar-legend-item">
          <span
            class="radar-legend-color"
            style="background-color: {series.color}"
          ></span>
          <span class="radar-legend-label">{series.name}</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Tooltip -->
  {#if hoveredSeries && hoveredPoint}
    <div
      class="radar-tooltip"
      style="left: {tooltipX + 10}px; top: {tooltipY - 10}px;"
    >
      <div class="radar-tooltip-series">{hoveredSeries.name}</div>
      <div class="radar-tooltip-axis">
        {data.axes.find(a => a.id === hoveredPoint?.axisId)?.label || ''}
      </div>
      <div class="radar-tooltip-value">{hoveredPoint?.formattedValue}</div>
    </div>
  {/if}
</div>

<style>
.radar-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  position: relative;
}

.radar-header {
  text-align: center;
}

.radar-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.radar-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.radar-svg {
  max-width: 100%;
  overflow: visible;
}

.radar-dot {
  cursor: pointer;
  transition: r 0.15s ease;
}

.radar-dot:hover,
.radar-dot:focus {
  r: 6;
  outline: none;
}

.radar-area {
  transition: fill-opacity 0.15s ease;
}

.radar-line {
  transition: stroke-width 0.15s ease;
}

.radar-label {
  font-family: inherit;
  pointer-events: none;
}

.radar-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.radar-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.radar-legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.radar-legend-label {
  font-size: 0.8125rem;
}

.radar-tooltip {
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

.radar-tooltip-series {
  font-weight: 600;
  color: #1f2937;
}

.radar-tooltip-axis {
  color: #6b7280;
  font-size: 0.75rem;
}

.radar-tooltip-value {
  font-weight: 500;
  color: #111827;
  margin-top: 0.125rem;
}
</style>
