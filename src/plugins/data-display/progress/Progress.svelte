<script lang="ts">
  import type { ProgressData } from './types'

  interface Props {
    data: ProgressData
  }

  let { data }: Props = $props()

  const config = data.config
  const color = config.color || 'blue'
  const size = config.size || 'md'
  const showValue = config.showValue !== false
  const showPercent = config.showPercent !== false
  const animated = config.animated !== false

  // Clamp percent between 0 and 100
  const displayPercent = Math.min(100, Math.max(0, data.percent))
</script>

<div class="progress-container size-{size}">
  {#if data.label || showValue}
    <div class="progress-header">
      {#if data.label}
        <span class="progress-label">{data.label}</span>
      {/if}
      {#if showValue}
        <span class="progress-value">
          {data.formatted}
          {#if showPercent}
            <span class="progress-percent">({displayPercent.toFixed(0)}%)</span>
          {/if}
        </span>
      {/if}
    </div>
  {/if}

  <div class="progress-track">
    <div
      class="progress-bar color-{color}"
      class:animated
      style="width: {displayPercent}%"
    >
      {#if displayPercent > 15 && size !== 'sm'}
        <span class="bar-text">{displayPercent.toFixed(0)}%</span>
      {/if}
    </div>
  </div>

  {#if data.max && showValue}
    <div class="progress-footer">
      <span class="progress-min">0</span>
      <span class="progress-max">{data.max.toLocaleString()}</span>
    </div>
  {/if}
</div>

<style>
  .progress-container {
    margin: 1rem 0;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .progress-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #F3F4F6;
  }

  .progress-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #D1D5DB;
  }

  .progress-percent {
    color: #9CA3AF;
    margin-left: 0.25rem;
  }

  .progress-track {
    background: #374151;
    border-radius: 9999px;
    overflow: hidden;
    position: relative;
  }

  /* Size variants */
  .size-sm .progress-track {
    height: 8px;
  }

  .size-md .progress-track {
    height: 16px;
  }

  .size-lg .progress-track {
    height: 24px;
  }

  .progress-bar {
    height: 100%;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.5rem;
    transition: width 0.5s ease-out;
    min-width: 0;
  }

  .progress-bar.animated {
    animation: progressGrow 0.8s ease-out;
  }

  @keyframes progressGrow {
    from {
      width: 0%;
    }
  }

  .bar-text {
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  /* Color variants */
  .color-blue {
    background: linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%);
  }

  .color-green {
    background: linear-gradient(90deg, #10B981 0%, #34D399 100%);
  }

  .color-red {
    background: linear-gradient(90deg, #EF4444 0%, #F87171 100%);
  }

  .color-purple {
    background: linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%);
  }

  .color-orange {
    background: linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%);
  }

  .color-cyan {
    background: linear-gradient(90deg, #06B6D4 0%, #22D3EE 100%);
  }

  .color-pink {
    background: linear-gradient(90deg, #EC4899 0%, #F472B6 100%);
  }

  .progress-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #6B7280;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .progress-label,
    .progress-value {
      font-size: 0.75rem;
    }

    .size-lg .progress-track {
      height: 16px;
    }
  }
</style>
