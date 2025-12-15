<script lang="ts">
/**
 * Value Component
 *
 * Displays a single value from a query result with formatting support
 */

import type { ValueData } from './types'

interface Props {
  data: ValueData
}

let { data }: Props = $props()

function formatValue(value: any, format: string, precision: number): string {
  if (value === null || value === undefined) {
    return data.config.placeholder || '-'
  }

  const numValue = typeof value === 'number' ? value : parseFloat(value)

  switch (format) {
    case 'number':
      if (isNaN(numValue)) return String(value)
      return numValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision
      })

    case 'currency':
      if (isNaN(numValue)) return String(value)
      return numValue.toLocaleString('en-US', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      })

    case 'percent':
      if (isNaN(numValue)) return String(value)
      return numValue.toLocaleString('en-US', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      })

    case 'date':
      try {
        const date = new Date(value)
        return date.toLocaleDateString('en-US')
      } catch {
        return String(value)
      }

    case 'text':
      return String(value)

    case 'auto':
    default:
      if (typeof value === 'number' || !isNaN(numValue)) {
        return numValue.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: precision
        })
      }
      return String(value)
  }
}

const formattedValue = $derived(
  formatValue(data.value, data.config.format || 'auto', data.config.precision || 2)
)

const displayValue = $derived(
  `${data.config.prefix || ''}${formattedValue}${data.config.suffix || ''}`
)
</script>

<span
  class="value-display {data.config.class || ''}"
  class:value-null={data.value === null || data.value === undefined}
>
  {displayValue}
</span>

<style>
.value-display {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-weight: 600;
  color: var(--color-text-primary, #F3F4F6);
}

.value-null {
  color: var(--color-text-muted, #9ca3af);
  font-style: italic;
}

:global(.value-inline) .value-display {
  font-weight: inherit;
  font-family: inherit;
}
</style>
