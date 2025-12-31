<script lang="ts">
  /**
   * Column Stats Popover
   *
   * Displays column statistics in a popover on hover.
   * Shows: type, null %, distinct count, min/max values
   */
  import type { ColumnStats } from '@/types/schema'
  import { formatRowCount } from '@/types/schema'

  interface Props {
    stats: ColumnStats | undefined
    columnType: string
    typeCategory: 'numeric' | 'string' | 'date' | 'boolean' | 'binary' | 'other'
  }

  let { stats, columnType, typeCategory }: Props = $props()

  function formatPercent(value: number): string {
    if (value === 0) return '0%'
    if (value < 0.1) return '<0.1%'
    return `${value.toFixed(1)}%`
  }

  function formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return value.toLocaleString()
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
</script>

<div class="stats-popover">
  <div class="stats-header">
    <span class="type-badge">{columnType}</span>
  </div>

  {#if stats}
    <div class="stats-grid">
      <!-- Common stats -->
      <div class="stat-row">
        <span class="stat-label">Rows</span>
        <span class="stat-value">{formatRowCount(stats.totalRows)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Nulls</span>
        <span class="stat-value" class:warning={stats.nullPercent > 10}>
          {formatPercent(stats.nullPercent)}
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Distinct</span>
        <span class="stat-value">
          {formatRowCount(stats.distinctCount)}
          {#if stats.isUnique}
            <span class="unique-badge">unique</span>
          {/if}
        </span>
      </div>

      <!-- Numeric-specific stats -->
      {#if typeCategory === 'numeric' && stats.numeric}
        <div class="stat-divider"></div>
        <div class="stat-row">
          <span class="stat-label">Min</span>
          <span class="stat-value mono">{formatNumber(stats.numeric.min)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Max</span>
          <span class="stat-value mono">{formatNumber(stats.numeric.max)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Avg</span>
          <span class="stat-value mono">{formatNumber(stats.numeric.avg)}</span>
        </div>
      {/if}

      <!-- String-specific stats -->
      {#if typeCategory === 'string' && stats.string}
        <div class="stat-divider"></div>
        <div class="stat-row">
          <span class="stat-label">Length</span>
          <span class="stat-value mono">
            {stats.string.minLength}–{stats.string.maxLength}
          </span>
        </div>
        {#if stats.string.topValues && stats.string.topValues.length > 0}
          <div class="stat-row column">
            <span class="stat-label">Top Values</span>
            <div class="top-values">
              {#each stats.string.topValues.slice(0, 3) as tv}
                <div class="top-value">
                  <span class="value-text">{tv.value.length > 20 ? tv.value.slice(0, 20) + '...' : tv.value}</span>
                  <span class="value-count">({formatRowCount(tv.count)})</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      <!-- Date-specific stats -->
      {#if typeCategory === 'date' && stats.date}
        <div class="stat-divider"></div>
        <div class="stat-row">
          <span class="stat-label">From</span>
          <span class="stat-value mono">{stats.date.min}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">To</span>
          <span class="stat-value mono">{stats.date.max}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Range</span>
          <span class="stat-value">{stats.date.rangeDays} days</span>
        </div>
      {/if}
    </div>
  {:else}
    <div class="stats-loading">
      Loading stats...
    </div>
  {/if}
</div>

<style>
  .stats-popover {
    min-width: 180px;
    max-width: 280px;
    padding: 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .stats-header {
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #374151;
  }

  .type-badge {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6875rem;
    color: #93C5FD;
  }

  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-row.column {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.6875rem;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .stat-value {
    font-size: 0.75rem;
    color: #E5E7EB;
    font-weight: 500;
  }

  .stat-value.mono {
    font-family: 'JetBrains Mono', monospace;
  }

  .stat-value.warning {
    color: #FBBF24;
  }

  .unique-badge {
    margin-left: 0.25rem;
    padding: 0.0625rem 0.25rem;
    background: rgba(16, 185, 129, 0.2);
    border-radius: 3px;
    font-size: 0.5625rem;
    color: #6EE7B7;
    text-transform: uppercase;
  }

  .stat-divider {
    height: 1px;
    margin: 0.25rem 0;
    background: #374151;
  }

  .top-values {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .top-value {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.125rem 0.25rem;
    background: rgba(55, 65, 81, 0.5);
    border-radius: 3px;
    font-size: 0.6875rem;
  }

  .value-text {
    color: #D1D5DB;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value-count {
    color: #6B7280;
    font-family: 'JetBrains Mono', monospace;
    flex-shrink: 0;
  }

  .stats-loading {
    padding: 0.5rem;
    text-align: center;
    color: #6B7280;
    font-size: 0.75rem;
  }
</style>
