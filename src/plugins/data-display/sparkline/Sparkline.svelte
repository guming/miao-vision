<script lang="ts">
  import type { SparklineData } from './types'

  interface Props {
    data: SparklineData
  }

  let { data }: Props = $props()

  // Extract config values reactively
  const config = $derived(data.config)
  const values = $derived(data.values)
  const height = $derived(config.height ?? 32)
  const width = $derived(config.width ?? 100)
  const color = $derived(config.color ?? '#667eea')
  const positiveColor = $derived(config.positiveColor ?? '#10B981')
  const negativeColor = $derived(config.negativeColor ?? '#EF4444')
  const type = $derived(config.type ?? 'line')
  const showDots = $derived(config.showDots ?? false)
  const showMinMax = $derived(config.showMinMax ?? false)
  const showLast = $derived(config.showLast ?? false)
  const referenceColor = $derived(config.referenceColor ?? '#6B7280')
  const bandColor = $derived(config.bandColor ?? 'rgba(107, 114, 128, 0.2)')

  const padding = 2
  const chartWidth = $derived(width - padding * 2)
  const chartHeight = $derived(height - padding * 2)

  // Calculate reference line value
  const referenceValue = $derived(() => {
    if (config.referenceLine === 'avg') return data.avg
    if (config.referenceLine === 'median') return data.median
    if (typeof config.referenceLine === 'number') return config.referenceLine
    return null
  })

  // Calculate SVG path for line/area
  let pathData = $derived(() => {
    if (values.length === 0 || (type !== 'line' && type !== 'area')) return ''

    const min = data.min
    const max = data.max
    const range = max - min || 1

    const points = values.map((v, i) => {
      const x = padding + (i / (values.length - 1 || 1)) * chartWidth
      const y = padding + chartHeight - ((v - min) / range) * chartHeight
      return { x, y }
    })

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')

    if (type === 'area') {
      const firstX = points[0]?.x ?? padding
      const lastX = points[points.length - 1]?.x ?? width - padding
      return `${linePath} L ${lastX.toFixed(1)} ${height - padding} L ${firstX.toFixed(1)} ${height - padding} Z`
    }

    return linePath
  })

  // Calculate bar positions
  let bars = $derived(() => {
    if (type !== 'bar' || values.length === 0) return []

    const min = data.min
    const max = data.max
    const range = max - min || 1

    const barWidth = Math.max(2, chartWidth / values.length - 1)

    return values.map((v, i) => {
      const barHeight = ((v - min) / range) * chartHeight
      return {
        x: padding + (i / values.length) * chartWidth,
        y: height - padding - barHeight,
        width: barWidth,
        height: barHeight,
        isMin: i === data.minIndex,
        isMax: i === data.maxIndex
      }
    })
  })

  // Calculate win/loss bars (positive/negative from zero or reference)
  let winlossBars = $derived(() => {
    if (type !== 'winloss' || values.length === 0) return []

    const baseline = referenceValue() ?? 0
    const maxAbs = Math.max(...values.map(v => Math.abs(v - baseline)))
    const barWidth = Math.max(2, chartWidth / values.length - 1)
    const midY = height / 2

    return values.map((v, i) => {
      const diff = v - baseline
      const barHeight = maxAbs > 0 ? (Math.abs(diff) / maxAbs) * (chartHeight / 2 - 2) : 0
      const isPositive = diff >= 0

      return {
        x: padding + (i / values.length) * chartWidth,
        y: isPositive ? midY - barHeight : midY,
        width: barWidth,
        height: barHeight,
        isPositive,
        value: v
      }
    })
  })

  // Calculate bullet chart elements
  let bulletData = $derived(() => {
    if (type !== 'bullet' || values.length === 0) return null

    const currentValue = values[values.length - 1]
    const target = config.targetValue ?? data.max
    const maxVal = Math.max(data.max, target)
    const minVal = Math.min(data.min, 0)
    const range = maxVal - minVal || 1

    const valueWidth = ((currentValue - minVal) / range) * chartWidth
    const targetX = padding + ((target - minVal) / range) * chartWidth

    return {
      valueWidth,
      targetX,
      currentValue
    }
  })

  // Calculate dot positions
  let dots = $derived(() => {
    if ((!showDots && !showMinMax) || type === 'winloss' || type === 'bullet') return []

    const min = data.min
    const max = data.max
    const range = max - min || 1

    return values.map((v, i) => ({
      x: padding + (i / (values.length - 1 || 1)) * chartWidth,
      y: padding + chartHeight - ((v - min) / range) * chartHeight,
      isMin: i === data.minIndex,
      isMax: i === data.maxIndex
    })).filter(d => showDots || d.isMin || d.isMax)
  })

  // Calculate reference line Y position
  let referenceY = $derived(() => {
    const refVal = referenceValue()
    if (refVal === null) return null

    const min = data.min
    const max = data.max
    const range = max - min || 1

    return padding + chartHeight - ((refVal - min) / range) * chartHeight
  })

  // Calculate band Y positions
  let bandY = $derived(() => {
    if (config.bandLow === undefined || config.bandHigh === undefined) return null

    const min = data.min
    const max = data.max
    const range = max - min || 1

    const yLow = padding + chartHeight - ((config.bandLow - min) / range) * chartHeight
    const yHigh = padding + chartHeight - ((config.bandHigh - min) / range) * chartHeight

    return { y: Math.min(yLow, yHigh), height: Math.abs(yLow - yHigh) }
  })
</script>

<div class="sparkline-container" style="--width: {width}px; --height: {height}px;">
  {#if config.label}
    <span class="sparkline-label">{config.label}</span>
  {/if}

  <svg
    class="sparkline"
    width={width}
    height={height}
    viewBox="0 0 {width} {height}"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Band range -->
    {#if bandY()}
      {@const band = bandY()}
      {#if band}
        <rect
          x={padding}
          y={band.y}
          width={chartWidth}
          height={band.height}
          fill={bandColor}
          class="sparkline-band"
        />
      {/if}
    {/if}

    <!-- Reference line -->
    {#if referenceY() !== null}
      <line
        x1={padding}
        y1={referenceY()}
        x2={width - padding}
        y2={referenceY()}
        stroke={referenceColor}
        stroke-width="1"
        stroke-dasharray="3,2"
        class="sparkline-reference"
      />
    {/if}

    <!-- Line chart -->
    {#if type === 'line'}
      <path
        d={pathData()}
        fill="none"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="sparkline-line"
      />
    <!-- Area chart -->
    {:else if type === 'area'}
      <path
        d={pathData()}
        fill={color}
        fill-opacity="0.2"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="sparkline-area"
      />
    <!-- Bar chart -->
    {:else if type === 'bar'}
      {#each bars() as bar}
        <rect
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          fill={bar.isMax && showMinMax ? positiveColor : bar.isMin && showMinMax ? negativeColor : color}
          rx="1"
          class="sparkline-bar"
        />
      {/each}
    <!-- Win/Loss chart -->
    {:else if type === 'winloss'}
      <!-- Baseline -->
      <line
        x1={padding}
        y1={height / 2}
        x2={width - padding}
        y2={height / 2}
        stroke={referenceColor}
        stroke-width="1"
        class="sparkline-baseline"
      />
      {#each winlossBars() as bar}
        <rect
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={Math.max(1, bar.height)}
          fill={bar.isPositive ? positiveColor : negativeColor}
          rx="1"
          class="sparkline-bar"
        />
      {/each}
    <!-- Bullet chart -->
    {:else if type === 'bullet'}
      {@const bullet = bulletData()}
      {#if bullet}
        <!-- Background range bars -->
        <rect
          x={padding}
          y={padding + chartHeight * 0.25}
          width={chartWidth}
          height={chartHeight * 0.5}
          fill="#374151"
          rx="2"
        />
        <rect
          x={padding}
          y={padding + chartHeight * 0.25}
          width={chartWidth * 0.75}
          height={chartHeight * 0.5}
          fill="#4B5563"
          rx="2"
        />
        <rect
          x={padding}
          y={padding + chartHeight * 0.25}
          width={chartWidth * 0.5}
          height={chartHeight * 0.5}
          fill="#6B7280"
          rx="2"
        />
        <!-- Value bar -->
        <rect
          x={padding}
          y={padding + chartHeight * 0.35}
          width={bullet.valueWidth}
          height={chartHeight * 0.3}
          fill={color}
          rx="1"
          class="sparkline-bar"
        />
        <!-- Target marker -->
        <line
          x1={bullet.targetX}
          y1={padding + chartHeight * 0.15}
          x2={bullet.targetX}
          y2={height - padding - chartHeight * 0.15}
          stroke={negativeColor}
          stroke-width="2"
          class="sparkline-target"
        />
      {/if}
    {/if}

    <!-- Dots for min/max or all points -->
    {#each dots() as dot}
      <circle
        cx={dot.x}
        cy={dot.y}
        r={dot.isMin || dot.isMax ? 3 : 2}
        fill={dot.isMax ? positiveColor : dot.isMin ? negativeColor : color}
        class="sparkline-dot"
      />
    {/each}
  </svg>

  {#if showLast}
    <span class="sparkline-value">{data.lastFormatted}</span>
  {/if}
</div>

<style>
  .sparkline-container {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sparkline-label {
    font-size: 0.75rem;
    color: #9CA3AF;
    white-space: nowrap;
  }

  .sparkline {
    display: inline-block;
    vertical-align: middle;
  }

  .sparkline-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: #D1D5DB;
    white-space: nowrap;
  }

  .sparkline-line,
  .sparkline-area {
    animation: sparkline-draw 0.5s ease-out;
  }

  .sparkline-bar {
    animation: sparkline-grow 0.5s ease-out;
    transform-origin: bottom;
  }

  .sparkline-dot {
    animation: sparkline-pop 0.3s ease-out 0.5s both;
  }

  .sparkline-reference {
    opacity: 0.7;
  }

  .sparkline-band {
    opacity: 0.5;
  }

  @keyframes sparkline-draw {
    from {
      stroke-dasharray: 1000;
      stroke-dashoffset: 1000;
    }
    to {
      stroke-dashoffset: 0;
    }
  }

  @keyframes sparkline-grow {
    from {
      transform: scaleY(0);
    }
    to {
      transform: scaleY(1);
    }
  }

  @keyframes sparkline-pop {
    from {
      opacity: 0;
      transform: scale(0);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
