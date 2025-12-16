<script lang="ts">
  import type { KPIGridData } from './types'

  interface Props {
    data: KPIGridData
  }

  let { data }: Props = $props()

  const columns = data.config.columns || 0
  const gap = data.config.gap || '1rem'

  function getTrendIcon(direction: 'up' | 'down' | 'neutral'): string {
    switch (direction) {
      case 'up': return '↑'
      case 'down': return '↓'
      default: return '→'
    }
  }

  function getTrendClass(direction: 'up' | 'down' | 'neutral'): string {
    switch (direction) {
      case 'up': return 'trend-up'
      case 'down': return 'trend-down'
      default: return 'trend-neutral'
    }
  }

  function getColorClass(color: string): string {
    return `color-${color}`
  }
</script>

<div
  class="kpigrid-container"
  style="--columns: {columns}; --gap: {gap};"
>
  {#each data.cards as card}
    <div class="kpi-card {getColorClass(card.color)}">
      <div class="kpi-header">
        {#if card.icon}
          <span class="kpi-icon">{card.icon}</span>
        {/if}
        <span class="kpi-label">{card.label}</span>
      </div>

      <div class="kpi-value">{card.formatted}</div>

      {#if card.trend}
        <div class="kpi-trend {getTrendClass(card.trend.direction)}">
          <span class="trend-icon">{getTrendIcon(card.trend.direction)}</span>
          <span class="trend-percent">{Math.abs(card.trend.percent).toFixed(1)}%</span>
          {#if card.trend.label}
            <span class="trend-label">{card.trend.label}</span>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .kpigrid-container {
    display: grid;
    grid-template-columns: repeat(
      var(--columns, auto-fit),
      minmax(200px, 1fr)
    );
    gap: var(--gap, 1rem);
    margin: 1.5rem 0;
  }

  /* Auto-fit when columns is 0 */
  .kpigrid-container[style*="--columns: 0"] {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .kpi-card {
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 12px;
    padding: 1.25rem;
    transition: transform 0.2s, box-shadow 0.2s;
    border-left: 4px solid #6B7280;
  }

  .kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  /* Color variants */
  .kpi-card.color-green {
    border-left-color: #10B981;
  }

  .kpi-card.color-red {
    border-left-color: #EF4444;
  }

  .kpi-card.color-blue {
    border-left-color: #3B82F6;
  }

  .kpi-card.color-purple {
    border-left-color: #8B5CF6;
  }

  .kpi-card.color-orange {
    border-left-color: #F59E0B;
  }

  .kpi-card.color-cyan {
    border-left-color: #06B6D4;
  }

  .kpi-card.color-pink {
    border-left-color: #EC4899;
  }

  .kpi-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .kpi-icon {
    font-size: 1.25rem;
  }

  .kpi-label {
    font-size: 0.875rem;
    color: #9CA3AF;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .kpi-value {
    font-size: 2rem;
    font-weight: 700;
    color: #F3F4F6;
    line-height: 1.2;
    margin-bottom: 0.5rem;
  }

  .kpi-trend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .trend-icon {
    font-weight: bold;
  }

  .trend-percent {
    font-weight: 600;
  }

  .trend-label {
    color: #9CA3AF;
    margin-left: 0.25rem;
  }

  .trend-up {
    color: #10B981;
  }

  .trend-down {
    color: #EF4444;
  }

  .trend-neutral {
    color: #6B7280;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .kpigrid-container {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .kpi-card {
      padding: 1rem;
    }

    .kpi-value {
      font-size: 1.5rem;
    }

    .kpi-label {
      font-size: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .kpigrid-container {
      grid-template-columns: 1fr;
    }
  }
</style>
