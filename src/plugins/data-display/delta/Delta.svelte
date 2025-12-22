<script lang="ts">
/**
 * Delta Component
 *
 * Displays inline comparison indicators showing value changes.
 * Shows positive/negative changes with appropriate colors and optional arrows.
 *
 * @example
 * ```delta
 * data: revenue_comparison
 * column: current_revenue
 * comparison: previous_revenue
 * format: percent
 * ```
 */

import type { DeltaData, DeltaDirection } from './types'

interface Props {
  data: DeltaData
}

let { data }: Props = $props()

const direction: DeltaDirection = $derived(
  data.isNeutral ? 'neutral' : data.isPositive ? 'up' : 'down'
)

const isGood = $derived(
  data.isNeutral
    ? null
    : data.config.positiveIsGood !== false
      ? data.isPositive
      : !data.isPositive
)

const arrowSymbol = $derived(
  direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
)

const signSymbol = $derived(
  data.isNeutral ? '' : data.isPositive ? '+' : ''  // Negative already has minus
)

const displayText = $derived(() => {
  if (data.value === null) return data.config.neutralText || '—'

  let text = ''

  // Add prefix
  if (data.config.prefix) {
    text += data.config.prefix + ' '
  }

  // Add sign symbol
  if (data.config.showSymbol !== false && !data.isNeutral) {
    text += signSymbol
  }

  // Add formatted value
  text += data.formatted

  // Add suffix
  if (data.config.suffix) {
    text += ' ' + data.config.suffix
  }

  return text
})
</script>

<span
  class="delta {data.config.class || ''}"
  class:delta-positive={isGood === true}
  class:delta-negative={isGood === false}
  class:delta-neutral={data.isNeutral}
  class:delta-chip={data.config.chip}
  title={data.currentValue !== null && data.comparisonValue !== null
    ? `${data.currentValue} vs ${data.comparisonValue}`
    : undefined}
>
  {#if data.config.showArrow !== false && !data.isNeutral}
    <span class="delta-arrow">{arrowSymbol}</span>
  {/if}
  <span class="delta-value">{displayText()}</span>
</span>

<style>
.delta {
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.9em;
  font-weight: 600;
  white-space: nowrap;
}

.delta-positive {
  color: #22C55E;
}

.delta-negative {
  color: #EF4444;
}

.delta-neutral {
  color: #9CA3AF;
}

.delta-arrow {
  font-size: 0.85em;
  line-height: 1;
}

.delta-value {
  line-height: 1;
}

/* Chip/badge style */
.delta-chip {
  padding: 0.15em 0.5em;
  border-radius: 9999px;
  font-size: 0.8em;
}

.delta-chip.delta-positive {
  background: rgba(34, 197, 94, 0.15);
  color: #22C55E;
}

.delta-chip.delta-negative {
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
}

.delta-chip.delta-neutral {
  background: rgba(156, 163, 175, 0.15);
  color: #9CA3AF;
}

/* Inline context */
:global(.inline-delta) .delta {
  font-weight: inherit;
}
</style>
