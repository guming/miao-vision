<script lang="ts">
  /**
   * Pie Chart Component
   *
   * Displays proportions as pie or donut slices with SVG.
   */
  import type { PieChartData } from './types'

  interface Props {
    data: PieChartData
  }

  let { data }: Props = $props()

  // Derived values
  let config = $derived(data.config)
  let slices = $derived(data.slices)
  let total = $derived(data.total)
  let center = $derived(data.center)
  let innerRadius = $derived(data.innerRadius)

  // Configuration with defaults
  let width = $derived(config.width || 400)
  let height = $derived(config.height || 300)
  let title = $derived(config.title)
  let subtitle = $derived(config.subtitle)
  let showLabels = $derived(config.showLabels !== false)
  let showPercentages = $derived(config.showPercentages !== false)
  let showLegend = $derived(config.showLegend !== false)
  let legendPosition = $derived(config.legendPosition || 'right')

  // Format value for display
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

  // Calculate SVG viewBox
  let viewBox = $derived(`0 0 ${width} ${height}`)
</script>

<div class="pie-chart-container {config.class || ''}" class:legend-bottom={legendPosition === 'bottom'}>
  {#if title}
    <h3 class="chart-title">{title}</h3>
  {/if}
  {#if subtitle}
    <p class="chart-subtitle">{subtitle}</p>
  {/if}

  <div class="chart-content">
    <div class="chart-svg-wrapper">
      <svg
        viewBox={viewBox}
        class="pie-svg"
        role="img"
        aria-label={title || 'Pie chart'}
      >
        <g transform="translate({center.x}, {center.y})">
          <!-- Slices -->
          {#each slices as slice (slice.id)}
            <g class="slice-group">
              <path
                d={slice.path}
                fill={slice.color}
                class="slice"
                role="listitem"
                aria-label="{slice.label}: {slice.formatted} ({slice.percent.toFixed(1)}%)"
              >
                <title>{slice.label}: {slice.formatted} ({slice.percent.toFixed(1)}%)</title>
              </path>
            </g>
          {/each}

          <!-- Center hole for donut -->
          {#if innerRadius > 0}
            <circle
              cx="0"
              cy="0"
              r={innerRadius}
              fill="var(--bg-card, #1F2937)"
              class="donut-hole"
            />
            <!-- Center text for donut -->
            <text class="center-total" text-anchor="middle" dy="-0.2em">
              {formatValue(total)}
            </text>
            <text class="center-label" text-anchor="middle" dy="1.2em">
              Total
            </text>
          {/if}

          <!-- Labels -->
          {#if showLabels}
            {#each slices as slice (slice.id)}
              {#if slice.percent >= 5}
                <g class="label-group" transform="translate({slice.labelPosition.x}, {slice.labelPosition.y})">
                  <text
                    class="slice-label"
                    text-anchor={slice.isRightSide ? 'start' : 'end'}
                    dy="0.35em"
                  >
                    {slice.label}
                  </text>
                  {#if showPercentages}
                    <text
                      class="slice-percent"
                      text-anchor={slice.isRightSide ? 'start' : 'end'}
                      dy="1.5em"
                    >
                      {slice.percent.toFixed(1)}%
                    </text>
                  {/if}
                </g>
              {/if}
            {/each}
          {/if}
        </g>
      </svg>
    </div>

    {#if showLegend}
      <div class="chart-legend">
        {#each slices as slice (slice.id)}
          <div class="legend-item" title="{slice.label}: {slice.formatted}">
            <span class="legend-color" style="background-color: {slice.color}"></span>
            <span class="legend-label">{slice.label}</span>
            <span class="legend-value">{slice.percent.toFixed(1)}%</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .pie-chart-container {
    font-family: var(--font-sans, system-ui, sans-serif);
    padding: 1rem;
    background: var(--bg-card, #1F2937);
    border-radius: 8px;
    border: 1px solid var(--border-color, #374151);
  }

  .chart-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary, #F3F4F6);
  }

  .chart-subtitle {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #9CA3AF);
  }

  .chart-content {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .legend-bottom .chart-content {
    flex-direction: column;
  }

  .chart-svg-wrapper {
    flex: 1;
    min-width: 0;
  }

  .pie-svg {
    width: 100%;
    height: auto;
    max-height: 300px;
    overflow: visible;
  }

  .slice {
    transition: opacity 0.2s, transform 0.2s;
    transform-origin: center;
  }

  .slice-group:hover .slice {
    opacity: 0.85;
    transform: scale(1.02);
  }

  .donut-hole {
    pointer-events: none;
  }

  .center-total {
    font-size: 1.25rem;
    font-weight: 600;
    fill: var(--text-primary, #F3F4F6);
  }

  .center-label {
    font-size: 0.75rem;
    fill: var(--text-secondary, #9CA3AF);
  }

  .slice-label {
    font-size: 0.75rem;
    font-weight: 500;
    fill: var(--text-primary, #F3F4F6);
  }

  .slice-percent {
    font-size: 0.6875rem;
    fill: var(--text-secondary, #9CA3AF);
  }

  .chart-legend {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 140px;
    max-width: 180px;
  }

  .legend-bottom .chart-legend {
    flex-direction: row;
    flex-wrap: wrap;
    max-width: none;
    justify-content: center;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .legend-label {
    flex: 1;
    color: var(--text-secondary, #9CA3AF);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .legend-value {
    color: var(--text-primary, #F3F4F6);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
</style>
