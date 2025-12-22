<script lang="ts">
  /**
   * BulletChart Component
   *
   * Displays values against targets and qualitative ranges.
   */
  import type { BulletChartData } from './types'

  interface Props {
    data: BulletChartData
  }

  let { data }: Props = $props()

  // Derived values
  let items = $derived(data.items)
  let title = $derived(data.title)
  let subtitle = $derived(data.subtitle)
  let ranges = $derived(data.ranges)
  let rangeColors = $derived(data.rangeColors)
  let config = $derived(data.config)

  // Configuration with defaults
  let height = $derived(config.height || 300)
  let orientation = $derived(config.orientation || 'horizontal')
  let isHorizontal = $derived(orientation === 'horizontal')
  let showValues = $derived(config.showValues !== false)
  let showTarget = $derived(config.showTarget !== false)
  let color = $derived(config.color || '#1f2937')

  // Calculate dimensions
  let barHeight = $derived(isHorizontal ? 24 : undefined)
  let itemSpacing = $derived(isHorizontal ? 60 : 80)
</script>

<div class="bullet-chart-container {config.class || ''}">
  {#if title}
    <h3 class="bullet-title">{title}</h3>
  {/if}
  {#if subtitle}
    <p class="bullet-subtitle">{subtitle}</p>
  {/if}

  <div
    class="bullet-chart"
    class:horizontal={isHorizontal}
    class:vertical={!isHorizontal}
    style="height: {height}px"
  >
    {#each items as item (item.id)}
      <div class="bullet-item" style={isHorizontal ? `height: ${itemSpacing}px` : `width: ${100 / items.length}%`}>
        <!-- Label -->
        <div class="bullet-label">
          <span class="label-text">{item.label}</span>
          {#if showValues}
            <span class="label-value">{item.formattedValue}</span>
          {/if}
        </div>

        <!-- Chart area -->
        <div class="bullet-bar-container">
          <!-- Qualitative ranges (background) -->
          <div class="bullet-ranges">
            {#each ranges as range, ri}
              <div
                class="bullet-range"
                style={isHorizontal
                  ? `width: ${ri === 0 ? range : range - ranges[ri - 1]}%; left: ${ri === 0 ? 0 : ranges[ri - 1]}%`
                  : `height: ${ri === 0 ? range : range - ranges[ri - 1]}%; bottom: ${ri === 0 ? 0 : ranges[ri - 1]}%`
                }
                style:background-color={rangeColors[ri]}
              ></div>
            {/each}
          </div>

          <!-- Value bar (primary measure) -->
          <div
            class="bullet-value-bar"
            style={isHorizontal
              ? `width: ${Math.min(100, Math.max(0, item.valuePercent))}%; height: ${barHeight}px`
              : `height: ${Math.min(100, Math.max(0, item.valuePercent))}%; width: 60%`
            }
            style:background-color={color}
          ></div>

          <!-- Target marker -->
          {#if showTarget && item.targetPercent !== undefined}
            <div
              class="bullet-target"
              style={isHorizontal
                ? `left: ${item.targetPercent}%`
                : `bottom: ${item.targetPercent}%`
              }
              title="Target: {item.formattedTarget}"
            ></div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Legend -->
  <div class="bullet-legend">
    <div class="legend-item">
      <span class="legend-bar" style:background-color={color}></span>
      <span class="legend-text">Actual</span>
    </div>
    {#if showTarget}
      <div class="legend-item">
        <span class="legend-target"></span>
        <span class="legend-text">Target</span>
      </div>
    {/if}
    <div class="legend-ranges">
      {#each rangeColors as rangeColor, ri}
        <div class="legend-item">
          <span class="legend-range" style:background-color={rangeColor}></span>
          <span class="legend-text">
            {ri === 0 ? 'Poor' : ri === 1 ? 'Satisfactory' : 'Good'}
          </span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .bullet-chart-container {
    font-family: var(--font-sans, system-ui, sans-serif);
    padding: 1rem;
    background: var(--bg-card, white);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .bullet-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary, #111827);
  }

  .bullet-subtitle {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .bullet-chart {
    display: flex;
    gap: 0.5rem;
  }

  .bullet-chart.horizontal {
    flex-direction: column;
  }

  .bullet-chart.vertical {
    flex-direction: row;
    align-items: flex-end;
  }

  .bullet-item {
    display: flex;
    gap: 0.75rem;
  }

  .horizontal .bullet-item {
    flex-direction: row;
    align-items: center;
  }

  .vertical .bullet-item {
    flex-direction: column-reverse;
    align-items: center;
    height: 100%;
  }

  .bullet-label {
    display: flex;
    flex-direction: column;
    min-width: 100px;
  }

  .horizontal .bullet-label {
    text-align: right;
  }

  .vertical .bullet-label {
    text-align: center;
    min-width: auto;
    padding-top: 0.5rem;
  }

  .label-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary, #111827);
  }

  .label-value {
    font-size: 0.75rem;
    color: var(--text-secondary, #6b7280);
  }

  .bullet-bar-container {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  .vertical .bullet-bar-container {
    flex: none;
    height: 100%;
    width: 100%;
    flex-direction: column;
    justify-content: flex-end;
  }

  .bullet-ranges {
    position: absolute;
    inset: 0;
    display: flex;
  }

  .horizontal .bullet-ranges {
    flex-direction: row;
  }

  .vertical .bullet-ranges {
    flex-direction: column-reverse;
  }

  .bullet-range {
    position: absolute;
  }

  .horizontal .bullet-range {
    height: 100%;
  }

  .vertical .bullet-range {
    width: 100%;
  }

  .bullet-value-bar {
    position: relative;
    z-index: 1;
    border-radius: 2px;
  }

  .horizontal .bullet-value-bar {
    margin: auto 0;
  }

  .vertical .bullet-value-bar {
    margin: 0 auto;
  }

  .bullet-target {
    position: absolute;
    z-index: 2;
    background-color: #111827;
  }

  .horizontal .bullet-target {
    width: 3px;
    height: 32px;
    top: 50%;
    transform: translateY(-50%);
  }

  .vertical .bullet-target {
    width: 80%;
    height: 3px;
    left: 10%;
  }

  .bullet-legend {
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

  .legend-bar {
    width: 16px;
    height: 8px;
    border-radius: 1px;
  }

  .legend-target {
    width: 3px;
    height: 12px;
    background-color: #111827;
  }

  .legend-range {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-ranges {
    display: flex;
    gap: 0.75rem;
    margin-left: auto;
  }

  .legend-text {
    color: var(--text-secondary, #6b7280);
  }
</style>
