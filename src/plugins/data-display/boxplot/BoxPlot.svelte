<script lang="ts">
  /**
   * BoxPlot Component
   *
   * Displays statistical distribution with quartiles, median, and outliers.
   */
  import type { BoxPlotData } from './types'

  interface Props {
    data: BoxPlotData
  }

  let { data }: Props = $props()

  // Derived values
  let boxes = $derived(data.boxes)
  let config = $derived(data.config)
  let title = $derived(data.title)
  let subtitle = $derived(data.subtitle)
  let globalMin = $derived(data.globalMin)
  let globalMax = $derived(data.globalMax)

  // Configuration with defaults
  let height = $derived(config.height || 300)
  let color = $derived(config.color || '#3B82F6')
  let showOutliers = $derived(config.showOutliers !== false)
  let showMean = $derived(config.showMean !== false)
  let showLabels = $derived(config.showLabels !== false)
  let orientation = $derived(config.orientation || 'vertical')
  let isVertical = $derived(orientation === 'vertical')

  // SVG dimensions
  let svgWidth = $derived(600)
  let svgHeight = $derived(height)
  let margin = $derived({ top: 20, right: 40, bottom: 40, left: 60 })
  let chartWidth = $derived(svgWidth - margin.left - margin.right)
  let chartHeight = $derived(svgHeight - margin.top - margin.bottom)

  // Scale calculations
  let valueRange = $derived(globalMax - globalMin)
  let padding = $derived(valueRange * 0.1)
  let scaleMin = $derived(globalMin - padding)
  let scaleMax = $derived(globalMax + padding)
  let scaleRange = $derived(scaleMax - scaleMin)

  // Calculate position on value axis
  function getValuePosition(value: number): number {
    const normalized = (value - scaleMin) / scaleRange
    if (isVertical) {
      return chartHeight - normalized * chartHeight
    }
    return normalized * chartWidth
  }

  // Calculate box position on category axis
  function getBoxPosition(index: number): number {
    const boxCount = boxes.length
    const spacing = isVertical ? chartWidth / boxCount : chartHeight / boxCount
    return spacing / 2 + index * spacing
  }

  // Box dimensions
  let boxWidth = $derived(
    Math.min(
      60,
      (isVertical ? chartWidth : chartHeight) / boxes.length * 0.6
    )
  )

  // Format value for display
  function formatValue(value: number): string {
    const format = config.valueFormat || 'number'
    const symbol = config.currencySymbol || '$'
    if (format === 'currency') return `${symbol}${value.toLocaleString()}`
    if (format === 'percent') return `${value.toFixed(1)}%`
    return value.toLocaleString()
  }

  // Generate axis ticks
  function getAxisTicks(): number[] {
    const tickCount = 5
    const step = scaleRange / tickCount
    const ticks: number[] = []
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(scaleMin + i * step)
    }
    return ticks
  }

  let axisTicks = $derived(getAxisTicks())
</script>

<div class="boxplot-container {config.class || ''}">
  {#if title}
    <h3 class="boxplot-title">{title}</h3>
  {/if}
  {#if subtitle}
    <p class="boxplot-subtitle">{subtitle}</p>
  {/if}

  <svg
    class="boxplot-svg"
    viewBox="0 0 {svgWidth} {svgHeight}"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Box plot chart"
  >
    <g transform="translate({margin.left}, {margin.top})">
      <!-- Value axis -->
      {#if isVertical}
        <!-- Y-axis for vertical orientation -->
        <g class="axis y-axis">
          <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#e5e7eb" />
          {#each axisTicks as tick}
            <g transform="translate(0, {getValuePosition(tick)})">
              <line x1="-5" y1="0" x2="0" y2="0" stroke="#9ca3af" />
              <text x="-10" y="4" text-anchor="end" font-size="10" fill="#6b7280">
                {formatValue(tick)}
              </text>
            </g>
          {/each}
        </g>
        <!-- X-axis for vertical orientation -->
        <g class="axis x-axis" transform="translate(0, {chartHeight})">
          <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#e5e7eb" />
          {#each boxes as box, i}
            <text
              x={getBoxPosition(i)}
              y="20"
              text-anchor="middle"
              font-size="11"
              fill="#374151"
            >
              {box.group}
            </text>
          {/each}
        </g>
      {:else}
        <!-- X-axis for horizontal orientation -->
        <g class="axis x-axis" transform="translate(0, {chartHeight})">
          <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#e5e7eb" />
          {#each axisTicks as tick}
            <g transform="translate({getValuePosition(tick)}, 0)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="#9ca3af" />
              <text x="0" y="18" text-anchor="middle" font-size="10" fill="#6b7280">
                {formatValue(tick)}
              </text>
            </g>
          {/each}
        </g>
        <!-- Y-axis for horizontal orientation -->
        <g class="axis y-axis">
          <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#e5e7eb" />
          {#each boxes as box, i}
            <text
              x="-10"
              y={getBoxPosition(i) + 4}
              text-anchor="end"
              font-size="11"
              fill="#374151"
            >
              {box.group}
            </text>
          {/each}
        </g>
      {/if}

      <!-- Box plots -->
      {#each boxes as box, i (box.group)}
        <g class="box-group">
          {#if isVertical}
            <!-- Vertical box plot -->
            <!-- Whiskers -->
            <line
              x1={getBoxPosition(i)}
              y1={getValuePosition(box.max)}
              x2={getBoxPosition(i)}
              y2={getValuePosition(box.min)}
              stroke={color}
              stroke-width="1"
            />
            <!-- Whisker caps -->
            <line
              x1={getBoxPosition(i) - boxWidth / 4}
              y1={getValuePosition(box.max)}
              x2={getBoxPosition(i) + boxWidth / 4}
              y2={getValuePosition(box.max)}
              stroke={color}
              stroke-width="2"
            />
            <line
              x1={getBoxPosition(i) - boxWidth / 4}
              y1={getValuePosition(box.min)}
              x2={getBoxPosition(i) + boxWidth / 4}
              y2={getValuePosition(box.min)}
              stroke={color}
              stroke-width="2"
            />
            <!-- Box (IQR) -->
            <rect
              x={getBoxPosition(i) - boxWidth / 2}
              y={getValuePosition(box.q3)}
              width={boxWidth}
              height={getValuePosition(box.q1) - getValuePosition(box.q3)}
              fill={color}
              fill-opacity="0.3"
              stroke={color}
              stroke-width="2"
            />
            <!-- Median line -->
            <line
              x1={getBoxPosition(i) - boxWidth / 2}
              y1={getValuePosition(box.median)}
              x2={getBoxPosition(i) + boxWidth / 2}
              y2={getValuePosition(box.median)}
              stroke={color}
              stroke-width="3"
            />
            <!-- Mean marker -->
            {#if showMean}
              <circle
                cx={getBoxPosition(i)}
                cy={getValuePosition(box.mean)}
                r="4"
                fill="white"
                stroke={color}
                stroke-width="2"
              />
            {/if}
            <!-- Outliers -->
            {#if showOutliers}
              {#each box.lowerOutliers as outlier}
                <circle
                  cx={getBoxPosition(i)}
                  cy={getValuePosition(outlier)}
                  r="3"
                  fill="none"
                  stroke={color}
                  stroke-width="1.5"
                />
              {/each}
              {#each box.upperOutliers as outlier}
                <circle
                  cx={getBoxPosition(i)}
                  cy={getValuePosition(outlier)}
                  r="3"
                  fill="none"
                  stroke={color}
                  stroke-width="1.5"
                />
              {/each}
            {/if}
          {:else}
            <!-- Horizontal box plot -->
            <!-- Whiskers -->
            <line
              x1={getValuePosition(box.min)}
              y1={getBoxPosition(i)}
              x2={getValuePosition(box.max)}
              y2={getBoxPosition(i)}
              stroke={color}
              stroke-width="1"
            />
            <!-- Whisker caps -->
            <line
              x1={getValuePosition(box.min)}
              y1={getBoxPosition(i) - boxWidth / 4}
              x2={getValuePosition(box.min)}
              y2={getBoxPosition(i) + boxWidth / 4}
              stroke={color}
              stroke-width="2"
            />
            <line
              x1={getValuePosition(box.max)}
              y1={getBoxPosition(i) - boxWidth / 4}
              x2={getValuePosition(box.max)}
              y2={getBoxPosition(i) + boxWidth / 4}
              stroke={color}
              stroke-width="2"
            />
            <!-- Box (IQR) -->
            <rect
              x={getValuePosition(box.q1)}
              y={getBoxPosition(i) - boxWidth / 2}
              width={getValuePosition(box.q3) - getValuePosition(box.q1)}
              height={boxWidth}
              fill={color}
              fill-opacity="0.3"
              stroke={color}
              stroke-width="2"
            />
            <!-- Median line -->
            <line
              x1={getValuePosition(box.median)}
              y1={getBoxPosition(i) - boxWidth / 2}
              x2={getValuePosition(box.median)}
              y2={getBoxPosition(i) + boxWidth / 2}
              stroke={color}
              stroke-width="3"
            />
            <!-- Mean marker -->
            {#if showMean}
              <circle
                cx={getValuePosition(box.mean)}
                cy={getBoxPosition(i)}
                r="4"
                fill="white"
                stroke={color}
                stroke-width="2"
              />
            {/if}
            <!-- Outliers -->
            {#if showOutliers}
              {#each box.lowerOutliers as outlier}
                <circle
                  cx={getValuePosition(outlier)}
                  cy={getBoxPosition(i)}
                  r="3"
                  fill="none"
                  stroke={color}
                  stroke-width="1.5"
                />
              {/each}
              {#each box.upperOutliers as outlier}
                <circle
                  cx={getValuePosition(outlier)}
                  cy={getBoxPosition(i)}
                  r="3"
                  fill="none"
                  stroke={color}
                  stroke-width="1.5"
                />
              {/each}
            {/if}
          {/if}
        </g>
      {/each}
    </g>
  </svg>

  {#if showLabels && boxes.length > 0}
    <div class="boxplot-legend">
      <div class="legend-item">
        <span class="legend-color" style="background-color: {color}"></span>
        <span class="legend-label">Box: IQR (Q1-Q3)</span>
      </div>
      <div class="legend-item">
        <span class="legend-line" style="background-color: {color}"></span>
        <span class="legend-label">Median</span>
      </div>
      {#if showMean}
        <div class="legend-item">
          <span class="legend-circle" style="border-color: {color}"></span>
          <span class="legend-label">Mean</span>
        </div>
      {/if}
      {#if showOutliers}
        <div class="legend-item">
          <span class="legend-outlier" style="border-color: {color}"></span>
          <span class="legend-label">Outliers</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .boxplot-container {
    font-family: var(--font-sans, system-ui, sans-serif);
    padding: 1rem;
    background: var(--bg-card, white);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .boxplot-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary, #111827);
  }

  .boxplot-subtitle {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .boxplot-svg {
    width: 100%;
    max-width: 100%;
    height: auto;
  }

  .boxplot-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color, #e5e7eb);
    font-size: 0.75rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .legend-color {
    width: 16px;
    height: 10px;
    opacity: 0.3;
    border: 2px solid currentColor;
    border-radius: 2px;
  }

  .legend-line {
    width: 16px;
    height: 3px;
  }

  .legend-circle {
    width: 8px;
    height: 8px;
    border: 2px solid;
    border-radius: 50%;
    background: white;
  }

  .legend-outlier {
    width: 6px;
    height: 6px;
    border: 1.5px solid;
    border-radius: 50%;
  }

  .legend-label {
    color: var(--text-secondary, #6b7280);
  }
</style>
