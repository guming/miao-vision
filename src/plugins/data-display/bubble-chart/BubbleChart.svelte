<script lang="ts">
  /**
   * Bubble Chart Component
   *
   * Displays three-dimensional data using bubbles.
   * X and Y position with size encoding the third dimension.
   */
  import type { BubbleChartData } from './types'

  interface Props {
    data: BubbleChartData
  }

  let { data }: Props = $props()

  // Derived values
  let config = $derived(data.config)
  let bubbles = $derived(data.bubbles)
  let groups = $derived(data.groups)
  let xRange = $derived(data.xRange)
  let yRange = $derived(data.yRange)

  // Configuration with defaults
  let height = $derived(config.height || 400)
  let width = $derived(config.width || 600)
  let showLabels = $derived(config.showLabels !== false)
  let showLegend = $derived(config.showLegend !== false && groups.length > 1)
  let showGrid = $derived(config.showGrid !== false)
  let opacity = $derived(config.opacity ?? 0.7)
  let title = $derived(config.title)
  let subtitle = $derived(config.subtitle)
  let xLabel = $derived(config.xLabel)
  let yLabel = $derived(config.yLabel)

  // Chart margins
  const margin = { top: 40, right: 40, bottom: 60, left: 80 }
  let chartWidth = $derived(width - margin.left - margin.right)
  let chartHeight = $derived(height - margin.top - margin.bottom)

  // Color palette for groups
  const defaultColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]
  let colors = $derived(config.colors || defaultColors)

  // Scale functions
  function scaleX(value: number): number {
    const [min, max] = xRange
    const range = max - min || 1
    return ((value - min) / range) * chartWidth
  }

  function scaleY(value: number): number {
    const [min, max] = yRange
    const range = max - min || 1
    return chartHeight - ((value - min) / range) * chartHeight
  }

  // Calculate X-axis ticks
  function getAxisTicks(min: number, max: number, count: number = 5): number[] {
    if (min === max) return [min]
    const range = max - min
    const step = range / count
    const ticks: number[] = []
    for (let i = 0; i <= count; i++) {
      ticks.push(min + i * step)
    }
    return ticks
  }

  let xTicks = $derived(getAxisTicks(xRange[0], xRange[1]))
  let yTicks = $derived(getAxisTicks(yRange[0], yRange[1]))

  // Format number
  function formatNumber(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M'
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K'
    }
    return value.toFixed(0)
  }

  // Tooltip state
  let hoveredBubble = $state<typeof bubbles[0] | null>(null)
</script>

<div class="bubble-chart-container {config.class || ''}">
  {#if title}
    <div class="chart-header">
      <h3 class="chart-title">{title}</h3>
      {#if subtitle}
        <p class="chart-subtitle">{subtitle}</p>
      {/if}
    </div>
  {/if}

  <div class="chart-wrapper" style="height: {height}px;">
    <svg {width} {height} class="bubble-chart">
      <g transform="translate({margin.left},{margin.top})">
        <!-- Grid lines -->
        {#if showGrid}
          <g class="grid">
            {#each xTicks as tick}
              <line
                x1={scaleX(tick)}
                y1={0}
                x2={scaleX(tick)}
                y2={chartHeight}
                stroke="#374151"
                stroke-width="0.5"
                opacity="0.2"
              />
            {/each}
            {#each yTicks as tick}
              <line
                x1={0}
                y1={scaleY(tick)}
                x2={chartWidth}
                y2={scaleY(tick)}
                stroke="#374151"
                stroke-width="0.5"
                opacity="0.2"
              />
            {/each}
          </g>
        {/if}

        <!-- X-axis -->
        <g class="x-axis" transform="translate(0,{chartHeight})">
          <line x1={0} y1={0} x2={chartWidth} y2={0} stroke="#9CA3AF" stroke-width="1" />
          {#each xTicks as tick}
            <g transform="translate({scaleX(tick)},0)">
              <line y1={0} y2={6} stroke="#9CA3AF" />
              <text
                y={20}
                text-anchor="middle"
                class="axis-label"
              >
                {formatNumber(tick)}
              </text>
            </g>
          {/each}
          {#if xLabel}
            <text
              x={chartWidth / 2}
              y={45}
              text-anchor="middle"
              class="axis-title"
            >
              {xLabel}
            </text>
          {/if}
        </g>

        <!-- Y-axis -->
        <g class="y-axis">
          <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#9CA3AF" stroke-width="1" />
          {#each yTicks as tick}
            <g transform="translate(0,{scaleY(tick)})">
              <line x1={-6} y1={0} x2={0} y2={0} stroke="#9CA3AF" />
              <text
                x={-10}
                y={4}
                text-anchor="end"
                class="axis-label"
              >
                {formatNumber(tick)}
              </text>
            </g>
          {/each}
          {#if yLabel}
            <text
              x={-chartHeight / 2}
              y={-50}
              text-anchor="middle"
              transform="rotate(-90)"
              class="axis-title"
            >
              {yLabel}
            </text>
          {/if}
        </g>

        <!-- Bubbles -->
        <g class="bubbles">
          {#each bubbles as bubble (bubble.id)}
            <g
              class="bubble-group"
              onmouseenter={() => hoveredBubble = bubble}
              onmouseleave={() => hoveredBubble = null}
            >
              <circle
                cx={scaleX(bubble.x)}
                cy={scaleY(bubble.y)}
                r={bubble.radius}
                fill={bubble.color}
                opacity={hoveredBubble === bubble ? 1 : opacity}
                stroke={hoveredBubble === bubble ? '#FFFFFF' : bubble.color}
                stroke-width={hoveredBubble === bubble ? 2 : 0}
                class="bubble"
              />
              {#if showLabels && bubble.label}
                <text
                  x={scaleX(bubble.x)}
                  y={scaleY(bubble.y)}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="bubble-label"
                  fill="#FFFFFF"
                  font-size="11"
                  font-weight="500"
                  pointer-events="none"
                >
                  {bubble.label}
                </text>
              {/if}
            </g>
          {/each}
        </g>
      </g>
    </svg>

    <!-- Tooltip -->
    {#if hoveredBubble && config.showTooltips !== false}
      <div class="bubble-tooltip">
        {#if hoveredBubble.label}
          <div class="tooltip-title">{hoveredBubble.label}</div>
        {/if}
        <div class="tooltip-row">
          <span class="tooltip-label">{xLabel || 'X'}:</span>
          <span class="tooltip-value">{hoveredBubble.formatted.x}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">{yLabel || 'Y'}:</span>
          <span class="tooltip-value">{hoveredBubble.formatted.y}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Size:</span>
          <span class="tooltip-value">{hoveredBubble.formatted.size}</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Legend -->
  {#if showLegend && groups.length > 1}
    <div class="chart-legend">
      {#each groups as group, i}
        <div class="legend-item">
          <div class="legend-color" style="background: {colors[i % colors.length]}"></div>
          <span class="legend-label">{group}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .bubble-chart-container {
    background: #1F2937;
    border-radius: 8px;
    padding: 1.5rem;
    color: #F3F4F6;
  }

  .chart-header {
    margin-bottom: 1rem;
  }

  .chart-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #F9FAFB;
    margin: 0 0 0.25rem 0;
  }

  .chart-subtitle {
    font-size: 0.875rem;
    color: #9CA3AF;
    margin: 0;
  }

  .chart-wrapper {
    position: relative;
    overflow: visible;
  }

  .bubble-chart {
    overflow: visible;
  }

  .axis-label {
    fill: #9CA3AF;
    font-size: 12px;
  }

  .axis-title {
    fill: #D1D5DB;
    font-size: 13px;
    font-weight: 500;
  }

  .bubble {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .bubble-label {
    pointer-events: none;
    user-select: none;
  }

  .bubble-tooltip {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(31, 41, 55, 0.95);
    border: 1px solid #374151;
    border-radius: 6px;
    padding: 0.75rem;
    pointer-events: none;
    z-index: 10;
    min-width: 150px;
  }

  .tooltip-title {
    font-weight: 600;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    color: #F9FAFB;
    border-bottom: 1px solid #374151;
    padding-bottom: 0.5rem;
  }

  .tooltip-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.8125rem;
    margin-bottom: 0.25rem;
  }

  .tooltip-label {
    color: #9CA3AF;
  }

  .tooltip-value {
    color: #F3F4F6;
    font-weight: 500;
  }

  .chart-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #374151;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .legend-label {
    font-size: 0.875rem;
    color: #D1D5DB;
  }
</style>
