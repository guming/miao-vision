<script lang="ts">
  /**
   * ColumnStats Component
   *
   * Modal displaying detailed statistics for each column in the query results.
   * Enhanced with: type icons, fill rate progress bar, percentiles, sum, stdDev
   */

  import type { ColumnStatistics } from './types'

  interface Props {
    stats: ColumnStatistics[]
    totalRows: number
    isOpen: boolean
    onClose: () => void
  }

  let { stats, totalRows, isOpen, onClose }: Props = $props()

  function formatNumber(num: number | undefined, decimals = 2): string {
    if (num === undefined || num === null) return '-'
    if (Number.isInteger(num) && Math.abs(num) < 1000000) {
      return num.toLocaleString()
    }
    // For large numbers or decimals
    if (Math.abs(num) >= 1000000) {
      return num.toExponential(2)
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals })
  }

  function formatCompact(num: number | undefined): string {
    if (num === undefined || num === null) return '-'
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B'
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M'
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K'
    return formatNumber(num)
  }

  function getTypeIcon(type: ColumnStatistics['type']): string {
    const icons: Record<string, string> = {
      number: '#',
      string: 'T',
      date: '📅',
      boolean: '⊘',
      unknown: '?'
    }
    return icons[type] || '?'
  }

  function getTypeColor(type: ColumnStatistics['type']): string {
    const colors: Record<string, string> = {
      number: '#4285F4',
      string: '#22C55E',
      date: '#F59E0B',
      boolean: '#8B5CF6',
      unknown: '#6B7280'
    }
    return colors[type] || '#6B7280'
  }

  function getFillRateColor(rate: number): string {
    if (rate >= 95) return '#22C55E'
    if (rate >= 80) return '#4ADE80'
    if (rate >= 50) return '#F59E0B'
    return '#EF4444'
  }

  function getMaxBarWidth(distribution: ColumnStatistics['distribution']): number {
    if (!distribution || distribution.length === 0) return 0
    return Math.max(...distribution.map(d => d.percentage))
  }

  function getCardinalityLabel(stat: ColumnStatistics): string | null {
    if (stat.type === 'number') return null
    const ratio = stat.unique / stat.total
    if (ratio === 1 && stat.total > 10) return 'Unique Key'
    if (ratio < 0.05 && stat.total > 20) return 'Low Cardinality'
    if (ratio > 0.9 && stat.total > 20) return 'High Cardinality'
    return null
  }
</script>

{#if isOpen}
  <div class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-container">
      <div class="modal-header">
        <div class="header-title">
          <h2>Column Statistics</h2>
          <span class="subtitle">{stats.length} columns • {totalRows.toLocaleString()} rows</span>
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="modal-content">
        <div class="stats-grid">
          {#each stats as stat}
            {@const cardinalityLabel = getCardinalityLabel(stat)}
            <div class="stat-card">
              <!-- Header with type icon -->
              <div class="stat-header">
                <div class="column-info">
                  <span
                    class="type-icon"
                    style="background: {getTypeColor(stat.type)}20; color: {getTypeColor(stat.type)}"
                  >
                    {getTypeIcon(stat.type)}
                  </span>
                  <h3 class="column-name" title={stat.name}>{stat.name}</h3>
                </div>
                <div class="badges">
                  {#if cardinalityLabel}
                    <span class="cardinality-badge">{cardinalityLabel}</span>
                  {/if}
                  <span class="type-badge" style="border-color: {getTypeColor(stat.type)}40">
                    {stat.type}
                  </span>
                </div>
              </div>

              <!-- Fill Rate Progress Bar -->
              <div class="fill-rate-section">
                <div class="fill-rate-header">
                  <span class="fill-label">Fill Rate</span>
                  <span class="fill-value" style="color: {getFillRateColor(stat.fillRate)}">
                    {stat.fillRate.toFixed(1)}%
                  </span>
                </div>
                <div class="fill-bar">
                  <div
                    class="fill-progress"
                    style="width: {stat.fillRate}%; background: {getFillRateColor(stat.fillRate)}"
                  ></div>
                </div>
              </div>

              <!-- Basic Metrics -->
              <div class="stat-metrics">
                <div class="metric">
                  <span class="metric-label">Total</span>
                  <span class="metric-value">{formatCompact(stat.total)}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Unique</span>
                  <span class="metric-value">{formatCompact(stat.unique)}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Nulls</span>
                  <span class="metric-value">{formatCompact(stat.nulls)}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Unique %</span>
                  <span class="metric-value">
                    {stat.total > 0 ? ((stat.unique / stat.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              <!-- Numeric Statistics (enhanced) -->
              {#if stat.type === 'number' && stat.min !== undefined}
                <div class="numeric-stats">
                  <div class="numeric-section">
                    <div class="section-title">Range & Sum</div>
                    <div class="numeric-grid">
                      <div class="numeric-item">
                        <span class="label">Min</span>
                        <span class="value">{formatNumber(stat.min)}</span>
                      </div>
                      <div class="numeric-item">
                        <span class="label">Max</span>
                        <span class="value">{formatNumber(stat.max)}</span>
                      </div>
                      <div class="numeric-item highlight">
                        <span class="label">Sum</span>
                        <span class="value">{formatCompact(stat.sum)}</span>
                      </div>
                      <div class="numeric-item highlight">
                        <span class="label">Avg</span>
                        <span class="value">{formatNumber(stat.avg)}</span>
                      </div>
                    </div>
                  </div>

                  <div class="numeric-section">
                    <div class="section-title">Percentiles</div>
                    <div class="percentile-bar">
                      <div class="percentile-track">
                        <div class="percentile-range"
                          style="left: 25%; width: 50%"
                        ></div>
                        <div class="percentile-marker p25" style="left: 25%">
                          <span class="marker-label">P25</span>
                          <span class="marker-value">{formatNumber(stat.p25)}</span>
                        </div>
                        <div class="percentile-marker median" style="left: 50%">
                          <span class="marker-label">Median</span>
                          <span class="marker-value">{formatNumber(stat.median)}</span>
                        </div>
                        <div class="percentile-marker p75" style="left: 75%">
                          <span class="marker-label">P75</span>
                          <span class="marker-value">{formatNumber(stat.p75)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="numeric-section">
                    <div class="section-title">Variability</div>
                    <div class="numeric-grid cols-2">
                      <div class="numeric-item">
                        <span class="label">Std Dev</span>
                        <span class="value">{formatNumber(stat.stdDev)}</span>
                      </div>
                      <div class="numeric-item">
                        <span class="label">IQR</span>
                        <span class="value">
                          {stat.p75 !== undefined && stat.p25 !== undefined
                            ? formatNumber(stat.p75 - stat.p25)
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              {/if}

              <!-- Date Statistics -->
              {#if stat.type === 'date' && stat.minDate}
                <div class="date-stats">
                  <div class="date-range">
                    <div class="date-item">
                      <span class="label">Earliest</span>
                      <span class="value">{stat.minDate}</span>
                    </div>
                    <span class="date-arrow">→</span>
                    <div class="date-item">
                      <span class="label">Latest</span>
                      <span class="value">{stat.maxDate}</span>
                    </div>
                  </div>
                </div>
              {/if}

              <!-- Distribution for categorical -->
              {#if stat.distribution && stat.distribution.length > 0}
                <div class="distribution">
                  <div class="section-title">Top Values</div>
                  {#each stat.distribution.slice(0, 5) as item}
                    {@const maxWidth = getMaxBarWidth(stat.distribution)}
                    <div class="dist-row">
                      <span class="dist-label" title={item.value}>
                        {item.value.length > 15 ? item.value.slice(0, 15) + '...' : item.value}
                      </span>
                      <div class="dist-bar-container">
                        <div
                          class="dist-bar"
                          style="width: {maxWidth > 0 ? (item.percentage / maxWidth) * 100 : 0}%"
                        ></div>
                      </div>
                      <span class="dist-count">{item.count}</span>
                      <span class="dist-percent">{item.percentage.toFixed(1)}%</span>
                    </div>
                  {/each}
                  {#if stat.distribution.length > 5}
                    <div class="more-values">+{stat.distribution.length - 5} more values</div>
                  {/if}
                </div>
              {:else if stat.type !== 'number' && stat.type !== 'date'}
                <div class="no-chart">No distribution data available</div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    <div
      class="backdrop"
      role="button"
      tabindex="-1"
      aria-label="Close modal"
      onclick={onClose}
      onkeydown={(e) => e.key === 'Escape' && onClose()}
    ></div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: -1;
  }

  .modal-container {
    width: 90vw;
    max-width: 80rem;
    max-height: 85vh;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #374151;
    background: #0F172A;
  }

  .header-title h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .subtitle {
    font-size: 0.75rem;
    color: #6B7280;
    margin-top: 0.25rem;
    display: block;
  }

  .close-btn {
    padding: 0.5rem;
    background: none;
    border: none;
    color: #6B7280;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: #374151;
    color: #F3F4F6;
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 10px;
    padding: 1rem;
  }

  .stat-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    gap: 0.5rem;
  }

  .column-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  }

  .type-icon {
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .column-name {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #F3F4F6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badges {
    display: flex;
    gap: 0.375rem;
    flex-shrink: 0;
  }

  .type-badge {
    padding: 0.125rem 0.5rem;
    background: #374151;
    border: 1px solid;
    border-radius: 4px;
    font-size: 0.625rem;
    color: #9CA3AF;
    text-transform: uppercase;
    font-weight: 500;
  }

  .cardinality-badge {
    padding: 0.125rem 0.5rem;
    background: rgba(139, 92, 246, 0.15);
    border-radius: 4px;
    font-size: 0.625rem;
    color: #A78BFA;
    font-weight: 500;
  }

  /* Fill Rate Section */
  .fill-rate-section {
    margin-bottom: 0.75rem;
  }

  .fill-rate-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.375rem;
  }

  .fill-label {
    font-size: 0.6875rem;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .fill-value {
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }

  .fill-bar {
    height: 6px;
    background: #374151;
    border-radius: 3px;
    overflow: hidden;
  }

  .fill-progress {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  /* Basic Metrics */
  .stat-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding: 0.625rem;
    background: #111827;
    border-radius: 6px;
  }

  .metric {
    text-align: center;
  }

  .metric-label {
    display: block;
    font-size: 0.5625rem;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-value {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #E5E7EB;
    margin-top: 0.125rem;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Numeric Stats */
  .numeric-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .numeric-section {
    background: #111827;
    border-radius: 6px;
    padding: 0.625rem;
  }

  .section-title {
    font-size: 0.625rem;
    font-weight: 600;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .numeric-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .numeric-grid.cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }

  .numeric-item {
    text-align: center;
    padding: 0.375rem;
    border-radius: 4px;
  }

  .numeric-item.highlight {
    background: rgba(66, 133, 244, 0.1);
  }

  .numeric-item .label {
    display: block;
    font-size: 0.5625rem;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .numeric-item .value {
    display: block;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #E5E7EB;
    margin-top: 0.125rem;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Percentile Bar */
  .percentile-bar {
    padding: 0.75rem 0.5rem;
  }

  .percentile-track {
    position: relative;
    height: 8px;
    background: #374151;
    border-radius: 4px;
  }

  .percentile-range {
    position: absolute;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, #4285F4, #8B5CF6);
    border-radius: 4px;
    opacity: 0.4;
  }

  .percentile-marker {
    position: absolute;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .percentile-marker::before {
    content: '';
    width: 3px;
    height: 16px;
    background: #F3F4F6;
    border-radius: 2px;
    margin-top: -4px;
  }

  .percentile-marker.median::before {
    background: #4285F4;
    width: 4px;
  }

  .marker-label {
    font-size: 0.5625rem;
    color: #6B7280;
    margin-top: 0.25rem;
    text-transform: uppercase;
  }

  .marker-value {
    font-size: 0.6875rem;
    color: #E5E7EB;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
  }

  /* Date Stats */
  .date-stats {
    padding: 0.625rem;
    background: #111827;
    border-radius: 6px;
  }

  .date-range {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .date-item {
    text-align: center;
    flex: 1;
  }

  .date-item .label {
    display: block;
    font-size: 0.5625rem;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .date-item .value {
    display: block;
    font-size: 0.75rem;
    color: #E5E7EB;
    font-family: 'JetBrains Mono', monospace;
    margin-top: 0.125rem;
  }

  .date-arrow {
    color: #6B7280;
    font-size: 1rem;
  }

  /* Distribution */
  .distribution {
    margin-top: 0.5rem;
  }

  .dist-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .dist-label {
    width: 6rem;
    font-size: 0.6875rem;
    color: #9CA3AF;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .dist-bar-container {
    flex: 1;
    height: 1rem;
    background: #374151;
    border-radius: 4px;
    overflow: hidden;
  }

  .dist-bar {
    height: 100%;
    background: linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%);
    border-radius: 4px;
    min-width: 2px;
    transition: width 0.3s ease;
  }

  .dist-count {
    width: 2.5rem;
    text-align: right;
    font-size: 0.6875rem;
    color: #9CA3AF;
    font-family: 'JetBrains Mono', monospace;
    flex-shrink: 0;
  }

  .dist-percent {
    width: 2.5rem;
    text-align: right;
    font-size: 0.625rem;
    color: #6B7280;
    font-family: 'JetBrains Mono', monospace;
    flex-shrink: 0;
  }

  .more-values {
    font-size: 0.6875rem;
    color: #6B7280;
    text-align: center;
    padding-top: 0.375rem;
  }

  .no-chart {
    font-size: 0.75rem;
    color: #6B7280;
    font-style: italic;
    padding: 0.5rem 0;
    text-align: center;
  }
</style>
