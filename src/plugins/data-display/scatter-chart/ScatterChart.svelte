<script lang="ts">
  /**
   * Scatter Chart Component
   *
   * Displays scatter plot for correlation analysis.
   * Supports grouping, variable point sizes, and customization.
   */
  import type { ScatterChartData } from './types'

  interface Props {
    data: ScatterChartData
  }

  let { data }: Props = $props()

  // Derived values
  let config = $derived(data.config)
  let points = $derived(data.points)
  let groups = $derived(data.groups)
  let xMin = $derived(data.xMin)
  let xMax = $derived(data.xMax)
  let yMin = $derived(data.yMin)
  let yMax = $derived(data.yMax)

  // Configuration with defaults
  let width = $derived(config.width || 680)
  let height = $derived(config.height || 400)
  let title = $derived(config.title)
  let subtitle = $derived(config.subtitle)
  let xLabel = $derived(config.xLabel)
  let yLabel = $derived(config.yLabel)
  let showLabels = $derived(config.showLabels !== false)
  let showLegend = $derived(config.showLegend !== false && groups.length > 1)
  let showGrid = $derived(config.showGrid !== false)
  let pointOpacity = $derived(config.pointOpacity ?? 0.7)

  // SVG dimensions and margins
  const margin = { top: 20, right: 20, bottom: showLabels ? 60 : 40, left: 60 }
  let chartWidth = $derived(width - margin.left - margin.right)
  let chartHeight = $derived(height - margin.top - margin.bottom)

  // Calculate ticks
  function getAxisTicks(min: number, max: number): number[] {
    if (max === min) return [min]
    const range = max - min
    const tickCount = 5

    const magnitude = Math.pow(10, Math.floor(Math.log10(range)))
    const normalized = range / magnitude
    let step: number
    if (normalized <= 1) step = magnitude / tickCount
    else if (normalized <= 2) step = 2 * magnitude / tickCount
    else if (normalized <= 5) step = 5 * magnitude / tickCount
    else step = 10 * magnitude / tickCount

    const ticks: number[] = []
    const start = Math.floor(min / step) * step
    for (let i = 0; i <= tickCount + 1; i++) {
      const tick = start + i * step
      if (tick >= min && tick <= max) {
        ticks.push(tick)
      }
    }
    return ticks
  }

  let xTicks = $derived(getAxisTicks(xMin, xMax))
  let yTicks = $derived(getAxisTicks(yMin, yMax))

  // Format value
  function formatValue(value: number): string {
    const format = config.valueFormat || 'number'
    const currency = config.currencySymbol || '$'

    if (format === 'currency') {
      return `${currency}${value.toLocaleString()}`
    }
    if (format === 'percent') {
      return `${value.toFixed(1)}%`
    }
    return value.toLocaleString()
  }

  // Get unique colors for legend
  let uniqueColors = $derived(
    groups.length > 1
      ? groups.map(g => points.find(p => p.group === g)?.color || '#3B82F6')
      : []
  )
</script>

<div class="scatter-chart-container {config.class || ''}">
  {#if title}
    <h3 class="chart-title">{title}</h3>
  {/if}
  {#if subtitle}
    <p class="chart-subtitle">{subtitle}</p>
  {/if}

  {#if showLegend && groups.length > 1}
    <div class="chart-legend">
      {#each groups as group, i}
        <div class="legend-item">
          <span class="legend-dot" style="background-color: {uniqueColors[i]}"></span>
          <span class="legend-label">{group}</span>
        </div>
      {/each}
    </div>
  {/if}

  <svg
    viewBox="0 0 {width} {height}"
    class="scatter-svg"
    role="img"
    aria-label={title || 'Scatter chart'}
  >
    <g transform="translate({margin.left}, {margin.top})">
      <!-- Grid lines -->
      {#if showGrid}
        <!-- Vertical grid -->
        {#each xTicks as tick}
          {@const x = ((tick - xMin) / (xMax - xMin)) * chartWidth}
          <line
            x1={x}
            y1="0"
            x2={x}
            y2={chartHeight}
            class="grid-line"
            stroke="var(--border-color, #374151)"
            stroke-width="1"
            stroke-opacity="0.3"
          />
        {/each}
        <!-- Horizontal grid -->
        {#each yTicks as tick}
          {@const y = chartHeight - ((tick - yMin) / (yMax - yMin)) * chartHeight}
          <line
            x1="0"
            y1={y}
            x2={chartWidth}
            y2={y}
            class="grid-line"
            stroke="var(--border-color, #374151)"
            stroke-width="1"
            stroke-opacity="0.3"
          />
        {/each}
      {/if}

      <!-- X-axis labels -->
      {#if showLabels}
        {#each xTicks as tick}
          {@const x = ((tick - xMin) / (xMax - xMin)) * chartWidth}
          <text
            x={x}
            y={chartHeight + 20}
            class="axis-label"
            text-anchor="middle"
            fill="var(--text-secondary, #9CA3AF)"
            font-size="12"
          >
            {formatValue(tick)}
          </text>
        {/each}
      {/if}

      <!-- Y-axis labels -->
      {#each yTicks as tick}
        {@const y = chartHeight - ((tick - yMin) / (yMax - yMin)) * chartHeight}
        <text
          x="-10"
          y={y}
          class="axis-label"
          text-anchor="end"
          dominant-baseline="middle"
          fill="var(--text-secondary, #9CA3AF)"
          font-size="12"
        >
          {formatValue(tick)}
        </text>
      {/each}

      <!-- Axis labels -->
      {#if yLabel}
        <text
          x="-{chartHeight / 2}"
          y="-45"
          class="axis-title"
          text-anchor="middle"
          transform="rotate(-90)"
          fill="var(--text-primary, #D1D5DB)"
          font-size="13"
          font-weight="500"
        >
          {yLabel}
        </text>
      {/if}
      {#if xLabel}
        <text
          x={chartWidth / 2}
          y={chartHeight + 50}
          class="axis-title"
          text-anchor="middle"
          fill="var(--text-primary, #D1D5DB)"
          font-size="13"
          font-weight="500"
        >
          {xLabel}
        </text>
      {/if}

      <!-- Scatter points -->
      {#each points as point}
        {@const x = ((point.x - xMin) / (xMax - xMin)) * chartWidth}
        {@const y = chartHeight - ((point.y - yMin) / (yMax - yMin)) * chartHeight}
        <circle
          cx={x}
          cy={y}
          r={point.size}
          fill={point.color}
          opacity={pointOpacity}
          class="scatter-point"
        >
          <title>{point.formatted}</title>
        </circle>
      {/each}
    </g>
  </svg>
</div>

<style>
  .scatter-chart-container {
    width: 100%;
    background: var(--bg-card, #1F2937);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .chart-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #F3F4F6);
  }

  .chart-subtitle {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #9CA3AF);
  }

  .chart-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--bg-primary, #111827);
    border-radius: 6px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .legend-label {
    font-size: 0.875rem;
    color: var(--text-primary, #D1D5DB);
  }

  .scatter-svg {
    width: 100%;
    height: auto;
  }

  .scatter-point {
    transition: r 0.2s, opacity 0.2s;
  }

  .scatter-point:hover {
    r: 8;
    opacity: 1;
  }
</style>
