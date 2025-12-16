<script lang="ts">
  import type { SparklineData } from './types'

  interface Props {
    data: SparklineData
  }

  let { data }: Props = $props()

  const config = data.config
  const values = data.values
  const height = config.height ?? 32
  const width = config.width ?? 100
  const color = config.color ?? '#667eea'
  const type = config.type ?? 'line'
  const showDots = config.showDots ?? false
  const showMinMax = config.showMinMax ?? false

  // Calculate SVG path
  let pathData = $derived(() => {
    if (values.length === 0) return ''

    const min = data.min
    const max = data.max
    const range = max - min || 1

    const padding = 2
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const points = values.map((v, i) => {
      const x = padding + (i / (values.length - 1 || 1)) * chartWidth
      const y = padding + chartHeight - ((v - min) / range) * chartHeight
      return { x, y }
    })

    if (type === 'line' || type === 'area') {
      const linePath = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ')

      if (type === 'area') {
        // Close the path for area fill
        const firstX = points[0]?.x ?? padding
        const lastX = points[points.length - 1]?.x ?? width - padding
        return `${linePath} L ${lastX.toFixed(1)} ${height - padding} L ${firstX.toFixed(1)} ${height - padding} Z`
      }

      return linePath
    }

    return ''
  })

  // Calculate bar positions
  let bars = $derived(() => {
    if (type !== 'bar' || values.length === 0) return []

    const min = data.min
    const max = data.max
    const range = max - min || 1

    const padding = 2
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2
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

  // Calculate dot positions
  let dots = $derived(() => {
    if (!showDots && !showMinMax) return []

    const min = data.min
    const max = data.max
    const range = max - min || 1

    const padding = 2
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    return values.map((v, i) => ({
      x: padding + (i / (values.length - 1 || 1)) * chartWidth,
      y: padding + chartHeight - ((v - min) / range) * chartHeight,
      isMin: i === data.minIndex,
      isMax: i === data.maxIndex
    })).filter(d => showDots || d.isMin || d.isMax)
  })
</script>

<svg
  class="sparkline"
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  xmlns="http://www.w3.org/2000/svg"
>
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
  {:else if type === 'bar'}
    {#each bars() as bar}
      <rect
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        fill={bar.isMax && showMinMax ? '#10B981' : bar.isMin && showMinMax ? '#EF4444' : color}
        rx="1"
        class="sparkline-bar"
      />
    {/each}
  {/if}

  <!-- Dots for min/max or all points -->
  {#each dots() as dot}
    <circle
      cx={dot.x}
      cy={dot.y}
      r={dot.isMin || dot.isMax ? 3 : 2}
      fill={dot.isMax ? '#10B981' : dot.isMin ? '#EF4444' : color}
      class="sparkline-dot"
    />
  {/each}
</svg>

<style>
  .sparkline {
    display: inline-block;
    vertical-align: middle;
  }

  .sparkline-line,
  .sparkline-area {
    animation: sparkline-draw 0.5s ease-out;
  }

  .sparkline-bar {
    animation: sparkline-grow 0.5s ease-out;
  }

  .sparkline-dot {
    animation: sparkline-pop 0.3s ease-out 0.5s both;
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
      transform-origin: bottom;
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
