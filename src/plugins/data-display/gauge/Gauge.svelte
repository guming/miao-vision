<script lang="ts">
  /**
   * Gauge Component
   *
   * Displays a value on a circular scale.
   */
  import type { GaugeData } from './types'

  interface Props {
    data: GaugeData
  }

  let { data }: Props = $props()

  // Derived values
  let formattedValue = $derived(data.formattedValue)
  let percent = $derived(data.percent)
  let min = $derived(data.min)
  let max = $derived(data.max)
  let title = $derived(data.title)
  let subtitle = $derived(data.subtitle)
  let color = $derived(data.color)
  let config = $derived(data.config)

  // Configuration with defaults
  let size = $derived(config.size || 200)
  let gaugeType = $derived(config.type || 'half')
  let showValue = $derived(config.showValue !== false)
  let showLimits = $derived(config.showLimits !== false)
  let backgroundColor = $derived(config.backgroundColor || '#e5e7eb')
  let thickness = $derived(config.thickness || 20)

  // Calculate arc parameters based on gauge type
  let arcConfig = $derived(() => {
    switch (gaugeType) {
      case 'full':
        return { startAngle: 0, endAngle: 360, rotation: -90 }
      case 'quarter':
        return { startAngle: 0, endAngle: 90, rotation: -90 }
      case 'half':
      default:
        return { startAngle: 0, endAngle: 180, rotation: -90 }
    }
  })

  // SVG dimensions
  let svgSize = $derived(size)
  let center = $derived(svgSize / 2)
  let radius = $derived((svgSize - thickness) / 2 - 10)

  // Convert angle to radians
  function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180
  }

  // Calculate point on arc
  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const radians = toRadians(angle)
    return {
      x: cx + r * Math.cos(radians),
      y: cy + r * Math.sin(radians)
    }
  }

  // Generate arc path
  function describeArc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ): string {
    const start = polarToCartesian(cx, cy, r, endAngle)
    const end = polarToCartesian(cx, cy, r, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

    return [
      'M', start.x, start.y,
      'A', r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ')
  }

  // Background arc path
  let backgroundPath = $derived(() => {
    const { startAngle, endAngle, rotation } = arcConfig()
    return describeArc(
      center,
      center,
      radius,
      startAngle + rotation,
      endAngle + rotation
    )
  })

  // Value arc path (filled portion)
  let valuePath = $derived(() => {
    const { startAngle, endAngle, rotation } = arcConfig()
    const totalAngle = endAngle - startAngle
    const valueAngle = (percent / 100) * totalAngle

    if (valueAngle <= 0) return ''

    return describeArc(
      center,
      center,
      radius,
      startAngle + rotation,
      startAngle + valueAngle + rotation
    )
  })

  // Label positions
  let minLabelPos = $derived(() => {
    const { startAngle, rotation } = arcConfig()
    const pos = polarToCartesian(center, center, radius + 25, startAngle + rotation)
    return pos
  })

  let maxLabelPos = $derived(() => {
    const { endAngle, rotation } = arcConfig()
    const pos = polarToCartesian(center, center, radius + 25, endAngle + rotation)
    return pos
  })

  // Adjust center position for half gauge
  let centerY = $derived(
    gaugeType === 'half' ? center + 10 : center
  )
</script>

<div class="gauge-container {config.class || ''}">
  {#if title}
    <h3 class="gauge-title">{title}</h3>
  {/if}
  {#if subtitle}
    <p class="gauge-subtitle">{subtitle}</p>
  {/if}

  <svg
    class="gauge-svg"
    width={svgSize}
    height={gaugeType === 'half' ? svgSize / 2 + 40 : svgSize}
    viewBox="0 0 {svgSize} {gaugeType === 'half' ? svgSize / 2 + 40 : svgSize}"
    role="img"
    aria-label="Gauge showing {formattedValue}"
  >
    <!-- Background arc -->
    <path
      d={backgroundPath()}
      fill="none"
      stroke={backgroundColor}
      stroke-width={thickness}
      stroke-linecap="round"
    />

    <!-- Value arc -->
    {#if valuePath()}
      <path
        d={valuePath()}
        fill="none"
        stroke={color}
        stroke-width={thickness}
        stroke-linecap="round"
        class="value-arc"
      />
    {/if}

    <!-- Center value display -->
    {#if showValue}
      <text
        x={center}
        y={centerY}
        text-anchor="middle"
        dominant-baseline="middle"
        class="value-text"
        font-size={size / 6}
        fill="#111827"
      >
        {formattedValue}
      </text>
    {/if}

    <!-- Min/Max labels -->
    {#if showLimits}
      <text
        x={minLabelPos().x}
        y={minLabelPos().y}
        text-anchor="middle"
        class="limit-text"
        font-size="12"
        fill="#6b7280"
      >
        {min}
      </text>
      <text
        x={maxLabelPos().x}
        y={maxLabelPos().y}
        text-anchor="middle"
        class="limit-text"
        font-size="12"
        fill="#6b7280"
      >
        {max}
      </text>
    {/if}
  </svg>
</div>

<style>
  .gauge-container {
    font-family: var(--font-sans, system-ui, sans-serif);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    background: var(--bg-card, white);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .gauge-title {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #111827);
    text-align: center;
  }

  .gauge-subtitle {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    text-align: center;
  }

  .gauge-svg {
    display: block;
  }

  .value-arc {
    transition: stroke-dashoffset 0.5s ease-out;
  }

  .value-text {
    font-weight: 700;
  }

  .limit-text {
    font-weight: 500;
  }
</style>
