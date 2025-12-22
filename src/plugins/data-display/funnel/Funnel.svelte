<script lang="ts">
/**
 * Funnel Component
 *
 * Displays a funnel chart for conversion analysis and pipeline visualization.
 * Shows stages with proportional widths and conversion metrics.
 *
 * @example
 * ```funnel
 * data: sales_pipeline
 * nameColumn: stage
 * valueColumn: count
 * showPercent: true
 * ```
 */

import type { FunnelData } from './types'

interface Props {
  data: FunnelData
}

let { data }: Props = $props()

const height = $derived(data.config.height || 300)
const align = $derived(data.config.align || 'center')
const showConnectors = $derived(data.config.showConnectors !== false)
const showValues = $derived(data.config.showValues !== false)
const showPercent = $derived(data.config.showPercent !== false)
const percentBase = $derived(data.config.percentBase || 'first')

const stageHeight = $derived(
  data.stages.length > 0 ? Math.floor((height - 40) / data.stages.length) : 40
)

function getAlignStyle(): string {
  if (align === 'left') {
    return 'margin-left: 0; margin-right: auto;'
  }
  if (align === 'right') {
    return 'margin-left: auto; margin-right: 0;'
  }
  return 'margin-left: auto; margin-right: auto;'
}

function getPercentDisplay(stage: typeof data.stages[0]): string {
  if (percentBase === 'previous') {
    return `${stage.percentOfPrevious.toFixed(1)}%`
  }
  return `${stage.percentOfFirst.toFixed(1)}%`
}
</script>

<div class="funnel {data.config.class || ''}" style="--funnel-height: {height}px;">
  {#if data.title}
    <div class="funnel-title">{data.title}</div>
  {/if}

  {#if data.subtitle}
    <div class="funnel-subtitle">{data.subtitle}</div>
  {/if}

  <div class="funnel-chart">
    {#each data.stages as stage, index}
      <div class="funnel-stage" style="height: {stageHeight}px;">
        <div class="funnel-stage-content">
          <div
            class="funnel-bar"
            style="
              width: {stage.widthPercent}%;
              background-color: {stage.color};
              {getAlignStyle()}
            "
          >
            <span class="funnel-bar-label">{stage.name}</span>
          </div>

          <div class="funnel-metrics">
            {#if showValues}
              <span class="funnel-value">{stage.formattedValue}</span>
            {/if}
            {#if showPercent && index > 0}
              <span class="funnel-percent">{getPercentDisplay(stage)}</span>
            {/if}
          </div>
        </div>

        {#if showConnectors && index < data.stages.length - 1}
          <div class="funnel-connector"></div>
        {/if}
      </div>
    {/each}
  </div>

  {#if data.stages.length > 1}
    <div class="funnel-summary">
      <span class="funnel-summary-label">Overall Conversion:</span>
      <span class="funnel-summary-value">{data.totalConversion.toFixed(1)}%</span>
    </div>
  {/if}
</div>

<style>
.funnel {
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  width: 100%;
}

.funnel-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin-bottom: 0.25rem;
}

.funnel-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 1rem;
}

.funnel-chart {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.funnel-stage {
  position: relative;
  display: flex;
  flex-direction: column;
}

.funnel-stage-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.funnel-bar {
  height: 100%;
  min-height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s ease, background-color 0.3s ease;
  position: relative;
}

.funnel-bar-label {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  padding: 0 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.funnel-metrics {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 80px;
  flex-shrink: 0;
}

.funnel-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}

.funnel-percent {
  font-size: 0.75rem;
  color: var(--text-secondary, #6b7280);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}

.funnel-connector {
  position: absolute;
  left: 50%;
  bottom: -4px;
  width: 2px;
  height: 8px;
  background: var(--border-color, #e5e7eb);
  transform: translateX(-50%);
}

.funnel-summary {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.funnel-summary-label {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
}

.funnel-summary-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary, #1f2937);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .funnel-stage-content {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }

  .funnel-metrics {
    flex-direction: row;
    gap: 0.5rem;
    min-width: auto;
  }

  .funnel-bar {
    width: 100% !important;
    margin: 0 !important;
  }
}
</style>
