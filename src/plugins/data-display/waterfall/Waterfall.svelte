<script lang="ts">
  /**
   * Waterfall Chart Component
   *
   * Displays incremental changes in values.
   */
  import type { WaterfallData } from './types'

  interface Props {
    data: WaterfallData
  }

  let { data }: Props = $props()

  // Derived values
  let bars = $derived(data.bars)
  let title = $derived(data.title)
  let subtitle = $derived(data.subtitle)
  let minValue = $derived(data.minValue)
  let maxValue = $derived(data.maxValue)
  let config = $derived(data.config)

  // Configuration with defaults
  let height = $derived(config.height || 400)
  let showLabels = $derived(config.showLabels !== false)
  let showConnectors = $derived(config.showConnectors !== false)
  let orientation = $derived(config.orientation || 'vertical')
  let isVertical = $derived(orientation === 'vertical')

  // SVG dimensions
  let svgWidth = $derived(600)
  let svgHeight = $derived(height)
  let margin = $derived({ top: 40, right: 40, bottom: 80, left: 80 })
  let chartWidth = $derived(svgWidth - margin.left - margin.right)
  let chartHeight = $derived(svgHeight - margin.top - margin.bottom)

  // Scale calculations
  let valueRange = $derived(maxValue - minValue)
  let padding = $derived(valueRange * 0.1)
  let scaleMin = $derived(Math.min(0, minValue - padding))
  let scaleMax = $derived(maxValue + padding)
  let scaleRange = $derived(scaleMax - scaleMin)

  // Calculate position on value axis
  function getValuePosition(value: number): number {
    const normalized = (value - scaleMin) / scaleRange
    if (isVertical) {
      return chartHeight - normalized * chartHeight
    }
    return normalized * chartWidth
  }

  // Calculate bar position on category axis
  function getBarPosition(index: number): number {
    const barCount = bars.length
    const spacing = isVertical ? chartWidth / barCount : chartHeight / barCount
    return spacing * index + spacing / 2
  }

  // Bar dimensions
  let barWidth = $derived(
    Math.min(50, (isVertical ? chartWidth : chartHeight) / bars.length * 0.6)
  )

  // Generate axis ticks
  function getAxisTicks(): number[] {
    const tickCount = 5
    const step = scaleRange / tickCount
    const ticks: number[] = []
    for (let i = 0; i <= tickCount; i++) {
      const value = scaleMin + i * step
      ticks.push(Math.round(value))
    }
    return ticks
  }

  let axisTicks = $derived(getAxisTicks())

  // Format value for display
  function formatAxisValue(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString()
  }
</script>

<div class="waterfall-container {config.class || ''}">
  {#if title}
    <h3 class="waterfall-title">{title}</h3>
  {/if}
  {#if subtitle}
    <p class="waterfall-subtitle">{subtitle}</p>
  {/if}

  <svg
    class="waterfall-svg"
    viewBox="0 0 {svgWidth} {svgHeight}"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Waterfall chart"
  >
    <g transform="translate({margin.left}, {margin.top})">
      <!-- Value axis -->
      {#if isVertical}
        <!-- Y-axis -->
        <g class="axis y-axis">
          <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#e5e7eb" />
          {#each axisTicks as tick}
            <g transform="translate(0, {getValuePosition(tick)})">
              <line x1="-5" y1="0" x2={chartWidth} y2="0" stroke="#f3f4f6" />
              <text x="-10" y="4" text-anchor="end" font-size="11" fill="#6b7280">
                {formatAxisValue(tick)}
              </text>
            </g>
          {/each}
        </g>
        <!-- Zero line -->
        {#if scaleMin < 0}
          <line
            x1="0"
            y1={getValuePosition(0)}
            x2={chartWidth}
            y2={getValuePosition(0)}
            stroke="#9ca3af"
            stroke-width="1"
          />
        {/if}
        <!-- X-axis labels -->
        <g class="axis x-axis" transform="translate(0, {chartHeight})">
          {#each bars as bar, i (bar.id)}
            <text
              x={getBarPosition(i)}
              y="20"
              text-anchor="middle"
              font-size="10"
              fill="#374151"
              transform="rotate(-45, {getBarPosition(i)}, 20)"
            >
              {bar.label.length > 12 ? bar.label.slice(0, 12) + '...' : bar.label}
            </text>
          {/each}
        </g>
      {:else}
        <!-- X-axis for horizontal -->
        <g class="axis x-axis" transform="translate(0, {chartHeight})">
          {#each axisTicks as tick}
            <g transform="translate({getValuePosition(tick)}, 0)">
              <line x1="0" y1="-{chartHeight}" x2="0" y2="0" stroke="#f3f4f6" />
              <text x="0" y="20" text-anchor="middle" font-size="11" fill="#6b7280">
                {formatAxisValue(tick)}
              </text>
            </g>
          {/each}
        </g>
        <!-- Y-axis labels -->
        <g class="axis y-axis">
          {#each bars as bar, i (bar.id)}
            <text
              x="-10"
              y={getBarPosition(i) + 4}
              text-anchor="end"
              font-size="11"
              fill="#374151"
            >
              {bar.label.length > 10 ? bar.label.slice(0, 10) + '...' : bar.label}
            </text>
          {/each}
        </g>
      {/if}

      <!-- Connectors -->
      {#if showConnectors}
        {#each bars as bar, i (bar.id)}
          {#if i < bars.length - 1 && bar.type !== 'total'}
            <line
              class="connector"
              x1={isVertical ? getBarPosition(i) + barWidth / 2 : getValuePosition(bar.end)}
              y1={isVertical ? getValuePosition(bar.end) : getBarPosition(i)}
              x2={isVertical ? getBarPosition(i + 1) - barWidth / 2 : getValuePosition(bar.end)}
              y2={isVertical ? getValuePosition(bar.end) : getBarPosition(i + 1)}
              stroke="#9ca3af"
              stroke-width="1"
              stroke-dasharray="3,3"
            />
          {/if}
        {/each}
      {/if}

      <!-- Bars -->
      {#each bars as bar, i (bar.id)}
        {#if isVertical}
          <rect
            class="waterfall-bar"
            x={getBarPosition(i) - barWidth / 2}
            y={Math.min(getValuePosition(bar.start), getValuePosition(bar.end))}
            width={barWidth}
            height={Math.abs(getValuePosition(bar.start) - getValuePosition(bar.end))}
            fill={bar.color}
            rx="2"
          />
          {#if showLabels}
            <text
              x={getBarPosition(i)}
              y={bar.value >= 0
                ? Math.min(getValuePosition(bar.start), getValuePosition(bar.end)) - 5
                : Math.max(getValuePosition(bar.start), getValuePosition(bar.end)) + 15
              }
              text-anchor="middle"
              font-size="10"
              font-weight="500"
              fill={bar.color}
            >
              {bar.formattedValue}
            </text>
          {/if}
        {:else}
          <rect
            class="waterfall-bar"
            x={Math.min(getValuePosition(bar.start), getValuePosition(bar.end))}
            y={getBarPosition(i) - barWidth / 2}
            width={Math.abs(getValuePosition(bar.end) - getValuePosition(bar.start))}
            height={barWidth}
            fill={bar.color}
            rx="2"
          />
          {#if showLabels}
            <text
              x={Math.max(getValuePosition(bar.start), getValuePosition(bar.end)) + 5}
              y={getBarPosition(i) + 4}
              text-anchor="start"
              font-size="10"
              font-weight="500"
              fill={bar.color}
            >
              {bar.formattedValue}
            </text>
          {/if}
        {/if}
      {/each}
    </g>
  </svg>

  <!-- Legend -->
  <div class="waterfall-legend">
    <div class="legend-item">
      <span class="legend-color" style="background-color: {config.positiveColor || '#22c55e'}"></span>
      <span class="legend-text">Increase</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style="background-color: {config.negativeColor || '#ef4444'}"></span>
      <span class="legend-text">Decrease</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style="background-color: {config.totalColor || '#3b82f6'}"></span>
      <span class="legend-text">Total</span>
    </div>
  </div>
</div>

<style>
  .waterfall-container {
    font-family: var(--font-sans, system-ui, sans-serif);
    padding: 1rem;
    background: var(--bg-card, white);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .waterfall-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary, #111827);
  }

  .waterfall-subtitle {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .waterfall-svg {
    width: 100%;
    max-width: 100%;
    height: auto;
  }

  .waterfall-bar {
    transition: opacity 0.2s;
  }

  .waterfall-bar:hover {
    opacity: 0.8;
  }

  .connector {
    pointer-events: none;
  }

  .waterfall-legend {
    display: flex;
    gap: 1.5rem;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color, #e5e7eb);
    font-size: 0.75rem;
    justify-content: center;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-text {
    color: var(--text-secondary, #6b7280);
  }
</style>
