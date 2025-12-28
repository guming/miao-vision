<script lang="ts">
  /**
   * Line Chart Component
   *
   * Displays time-series or sequential data with connected lines.
   * Supports multiple series, grouping, and customization.
   */
  import type { LineChartData } from './types'

  interface Props {
    data: LineChartData
  }

  let { data }: Props = $props()

  // Derived values
  let config = $derived(data.config)
  let series = $derived(data.series)
  let xValues = $derived(data.xValues)
  let xMin = $derived(data.xMin)
  let xMax = $derived(data.xMax)
  let yMin = $derived(data.yMin)
  let yMax = $derived(data.yMax)
  let xIsNumeric = $derived(data.xIsNumeric)

  // Configuration with defaults
  let width = $derived(config.width || 680)
  let height = $derived(config.height || 400)
  let title = $derived(config.title)
  let subtitle = $derived(config.subtitle)
  let xLabel = $derived(config.xLabel)
  let yLabel = $derived(config.yLabel)
  let showLabels = $derived(config.showLabels !== false)
  let showLegend = $derived(config.showLegend !== false && series.length > 1)
  let showGrid = $derived(config.showGrid !== false)
  let showPoints = $derived(config.showPoints !== false)
  let strokeWidth = $derived(config.strokeWidth || 2)
  let pointRadius = $derived(config.pointRadius || 4)

  // SVG dimensions and margins
  const margin = { top: 20, right: 20, bottom: showLabels ? 60 : 40, left: 60 }
  let chartWidth = $derived(width - margin.left - margin.right)
  let chartHeight = $derived(height - margin.top - margin.bottom)

  // Calculate Y-axis ticks
  function getYAxisTicks(min: number, max: number): number[] {
    if (max === min) return [min]
    const range = max - min
    const tickCount = 5

    // Round to nice numbers
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

  let yTicks = $derived(getYAxisTicks(yMin, yMax))

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

  // Format X-axis label (handle dates/strings)
  function formatXValue(value: number | string): string {
    if (typeof value === 'string') {
      // For string values (dates, categories), show as-is or truncate if too long
      return value.length > 12 ? value.substring(0, 10) + '...' : value
    }
    return String(value)
  }
</script>

<div class="line-chart-container {config.class || ''}">
  {#if title}
    <h3 class="chart-title">{title}</h3>
  {/if}
  {#if subtitle}
    <p class="chart-subtitle">{subtitle}</p>
  {/if}

  {#if showLegend && series.length > 1}
    <div class="chart-legend">
      {#each series as s}
        <div class="legend-item">
          <span class="legend-line" style="background-color: {s.color}"></span>
          <span class="legend-label">{s.label}</span>
        </div>
      {/each}
    </div>
  {/if}

  <svg
    viewBox="0 0 {width} {height}"
    class="line-svg"
    role="img"
    aria-label={title || 'Line chart'}
  >
    <g transform="translate({margin.left}, {margin.top})">
      <!-- Y-axis grid lines -->
      {#if showGrid}
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

      <!-- X-axis labels -->
      {#if showLabels}
        {#each xValues as xValue, i}
          {@const x = xIsNumeric
            ? ((Number(xValue) - xMin) / (xMax - xMin)) * chartWidth
            : (i / Math.max(xValues.length - 1, 1)) * chartWidth}
          <text
            x={x}
            y={chartHeight + 20}
            class="axis-label"
            text-anchor="middle"
            fill="var(--text-secondary, #9CA3AF)"
            font-size="12"
          >
            {formatXValue(xValue)}
          </text>
        {/each}
      {/if}

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

      <!-- Line series -->
      {#each series as s}
        <!-- Line path -->
        <path
          d={s.path}
          fill="none"
          stroke={s.color}
          stroke-width={strokeWidth}
          class="line-path"
        />

        <!-- Data points -->
        {#if showPoints}
          {#each s.points as point}
            {@const x = xIsNumeric
              ? ((Number(point.xValue) - xMin) / (xMax - xMin)) * chartWidth
              : (xValues.indexOf(point.xValue) / Math.max(xValues.length - 1, 1)) * chartWidth}
            {@const y = chartHeight - ((point.y - yMin) / (yMax - yMin)) * chartHeight}
            <circle
              cx={x}
              cy={y}
              r={pointRadius}
              fill={s.color}
              class="data-point"
            >
              <title>{s.label}: {point.formatted}</title>
            </circle>
          {/each}
        {/if}
      {/each}
    </g>
  </svg>
</div>

<style>
  .line-chart-container {
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

  .legend-line {
    width: 24px;
    height: 3px;
    border-radius: 2px;
  }

  .legend-label {
    font-size: 0.875rem;
    color: var(--text-primary, #D1D5DB);
  }

  .line-svg {
    width: 100%;
    height: auto;
  }

  .line-path {
    transition: stroke-width 0.2s;
  }

  .line-path:hover {
    stroke-width: 3;
  }

  .data-point {
    transition: r 0.2s;
  }

  .data-point:hover {
    r: 6;
  }
</style>
