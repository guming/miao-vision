<script lang="ts">
  /**
   * QuickInsights Component
   *
   * Provides intelligent data insights based on query results.
   * Features:
   * - Auto-detect data patterns
   * - Summary statistics
   * - Suggested visualizations
   * - Data quality indicators
   */

  import type { QueryResult } from '@/types/database'
  import { calculateAllColumnStats } from './types'

  interface Props {
    result: QueryResult
    isOpen: boolean
    onClose: () => void
  }

  let { result, isOpen, onClose }: Props = $props()

  // Compute insights when result changes
  const insights = $derived(generateInsights(result))

  interface Insight {
    type: 'info' | 'warning' | 'suggestion' | 'trend'
    icon: string
    title: string
    description: string
    action?: {
      label: string
      sql?: string
    }
  }

  interface InsightReport {
    summary: {
      totalRows: number
      totalColumns: number
      numericColumns: number
      categoricalColumns: number
      dateColumns: number
    }
    dataQuality: {
      completeness: number
      uniqueness: number
      nullPercentage: number
    }
    insights: Insight[]
    suggestedCharts: Array<{
      type: 'bar' | 'line' | 'pie' | 'scatter'
      title: string
      description: string
      xColumn: string
      yColumn?: string
    }>
  }

  function generateInsights(result: QueryResult): InsightReport {
    const stats = calculateAllColumnStats(result)
    const insights: Insight[] = []
    const suggestedCharts: InsightReport['suggestedCharts'] = []

    // Categorize columns
    const numericCols = stats.filter(s => s.type === 'number')
    const categoricalCols = stats.filter(s => s.type === 'string')
    const dateCols = stats.filter(s => s.type === 'date')

    // Calculate data quality metrics
    const totalCells = result.rowCount * result.columns.length
    const nullCells = stats.reduce((sum, s) => sum + s.nulls, 0)
    const completeness = totalCells > 0 ? ((totalCells - nullCells) / totalCells) * 100 : 100
    const avgUniqueness = stats.length > 0
      ? stats.reduce((sum, s) => sum + (s.unique / s.total) * 100, 0) / stats.length
      : 100
    const nullPercentage = totalCells > 0 ? (nullCells / totalCells) * 100 : 0

    // Generate insights based on data patterns

    // 1. Row count insights
    if (result.rowCount === 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'No Data Returned',
        description: 'The query returned no results. Check your filters or data source.'
      })
    } else if (result.rowCount === 1) {
      insights.push({
        type: 'info',
        icon: 'ℹ️',
        title: 'Single Row Result',
        description: 'Query returned exactly one row - likely an aggregate or specific lookup.'
      })
    } else if (result.rowCount > 10000) {
      insights.push({
        type: 'warning',
        icon: '⚡',
        title: 'Large Dataset',
        description: `${result.rowCount.toLocaleString()} rows returned. Consider adding LIMIT or filters for better performance.`,
        action: {
          label: 'Add LIMIT 1000',
          sql: 'LIMIT 1000'
        }
      })
    }

    // 2. Data quality insights
    if (nullPercentage > 20) {
      insights.push({
        type: 'warning',
        icon: '🔍',
        title: 'High Null Rate',
        description: `${nullPercentage.toFixed(1)}% of data contains NULL values. This may affect analysis accuracy.`
      })
    }

    if (completeness === 100) {
      insights.push({
        type: 'info',
        icon: '✅',
        title: 'Complete Data',
        description: 'No NULL values detected - data is 100% complete.'
      })
    }

    // 3. Column-specific insights
    stats.forEach(col => {
      // Low cardinality categorical
      if (col.type === 'string' && col.unique <= 10 && col.total > 10) {
        insights.push({
          type: 'suggestion',
          icon: '📊',
          title: `Low Cardinality: ${col.name}`,
          description: `Only ${col.unique} unique values - ideal for grouping or pie charts.`
        })
        suggestedCharts.push({
          type: 'pie',
          title: `Distribution of ${col.name}`,
          description: 'Low cardinality makes this ideal for a pie chart',
          xColumn: col.name
        })
      }

      // High cardinality
      if (col.type === 'string' && col.unique === col.total && col.total > 10) {
        insights.push({
          type: 'info',
          icon: '🔑',
          title: `Potential Key: ${col.name}`,
          description: 'All values are unique - this column may be a primary key or identifier.'
        })
      }

      // Numeric range insights
      if (col.type === 'number' && col.min !== undefined && col.max !== undefined) {
        if (col.min < 0 && col.max > 0) {
          insights.push({
            type: 'info',
            icon: '±',
            title: `Mixed Signs: ${col.name}`,
            description: `Values range from ${col.min.toLocaleString()} to ${col.max.toLocaleString()}`
          })
        }
        if (col.stdDev !== undefined && col.avg !== undefined && col.avg !== 0) {
          const cv = (col.stdDev / Math.abs(col.avg)) * 100
          if (cv > 100) {
            insights.push({
              type: 'warning',
              icon: '📈',
              title: `High Variance: ${col.name}`,
              description: `Coefficient of variation is ${cv.toFixed(1)}% - data has high variability`
            })
          }
        }
      }
    })

    // 4. Suggest visualizations based on data types
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      suggestedCharts.push({
        type: 'bar',
        title: `${numericCols[0].name} by ${categoricalCols[0].name}`,
        description: 'Compare numeric values across categories',
        xColumn: categoricalCols[0].name,
        yColumn: numericCols[0].name
      })
    }

    if (dateCols.length > 0 && numericCols.length > 0) {
      suggestedCharts.push({
        type: 'line',
        title: `${numericCols[0].name} over Time`,
        description: 'Show trends over time',
        xColumn: dateCols[0].name,
        yColumn: numericCols[0].name
      })
    }

    if (numericCols.length >= 2) {
      suggestedCharts.push({
        type: 'scatter',
        title: `${numericCols[0].name} vs ${numericCols[1].name}`,
        description: 'Explore correlation between numeric columns',
        xColumn: numericCols[0].name,
        yColumn: numericCols[1].name
      })
    }

    return {
      summary: {
        totalRows: result.rowCount,
        totalColumns: result.columns.length,
        numericColumns: numericCols.length,
        categoricalColumns: categoricalCols.length,
        dateColumns: dateCols.length
      },
      dataQuality: {
        completeness,
        uniqueness: avgUniqueness,
        nullPercentage
      },
      insights,
      suggestedCharts
    }
  }

  function getInsightClass(type: Insight['type']): string {
    return `insight-${type}`
  }
</script>

{#if isOpen}
  <div class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-container">
      <div class="modal-header">
        <div class="header-title">
          <h2>Quick Insights</h2>
          <span class="subtitle">AI-powered data analysis</span>
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="modal-content">
        <!-- Summary Section -->
        <section class="section">
          <h3>Data Summary</h3>
          <div class="summary-grid">
            <div class="summary-card">
              <span class="summary-value">{insights.summary.totalRows.toLocaleString()}</span>
              <span class="summary-label">Rows</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">{insights.summary.totalColumns}</span>
              <span class="summary-label">Columns</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">{insights.summary.numericColumns}</span>
              <span class="summary-label">Numeric</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">{insights.summary.categoricalColumns}</span>
              <span class="summary-label">Categorical</span>
            </div>
          </div>
        </section>

        <!-- Data Quality Section -->
        <section class="section">
          <h3>Data Quality</h3>
          <div class="quality-metrics">
            <div class="quality-item">
              <div class="quality-header">
                <span class="quality-label">Completeness</span>
                <span class="quality-value">{insights.dataQuality.completeness.toFixed(1)}%</span>
              </div>
              <div class="quality-bar">
                <div
                  class="quality-fill completeness"
                  style="width: {insights.dataQuality.completeness}%"
                ></div>
              </div>
            </div>
            <div class="quality-item">
              <div class="quality-header">
                <span class="quality-label">Null Rate</span>
                <span class="quality-value">{insights.dataQuality.nullPercentage.toFixed(1)}%</span>
              </div>
              <div class="quality-bar">
                <div
                  class="quality-fill null-rate"
                  style="width: {insights.dataQuality.nullPercentage}%"
                ></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Insights Section -->
        {#if insights.insights.length > 0}
          <section class="section">
            <h3>Insights ({insights.insights.length})</h3>
            <div class="insights-list">
              {#each insights.insights as insight}
                <div class="insight-card {getInsightClass(insight.type)}">
                  <span class="insight-icon">{insight.icon}</span>
                  <div class="insight-content">
                    <h4 class="insight-title">{insight.title}</h4>
                    <p class="insight-description">{insight.description}</p>
                    {#if insight.action}
                      <button class="insight-action">
                        {insight.action.label}
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Suggested Charts Section -->
        {#if insights.suggestedCharts.length > 0}
          <section class="section">
            <h3>Suggested Visualizations</h3>
            <div class="charts-grid">
              {#each insights.suggestedCharts as chart}
                <div class="chart-suggestion">
                  <div class="chart-icon">
                    {#if chart.type === 'bar'}📊
                    {:else if chart.type === 'line'}📈
                    {:else if chart.type === 'pie'}🥧
                    {:else}📉
                    {/if}
                  </div>
                  <div class="chart-info">
                    <h4 class="chart-title">{chart.title}</h4>
                    <p class="chart-description">{chart.description}</p>
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/if}
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
    max-width: 48rem;
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

  .section {
    margin-bottom: 1.5rem;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #E5E7EB;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  .summary-card {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }

  .summary-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #F3F4F6;
    font-family: 'JetBrains Mono', monospace;
  }

  .summary-label {
    display: block;
    font-size: 0.6875rem;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
  }

  .quality-metrics {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .quality-item {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 0.75rem 1rem;
  }

  .quality-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .quality-label {
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .quality-value {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #F3F4F6;
    font-family: 'JetBrains Mono', monospace;
  }

  .quality-bar {
    height: 6px;
    background: #374151;
    border-radius: 3px;
    overflow: hidden;
  }

  .quality-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .quality-fill.completeness {
    background: linear-gradient(90deg, #22C55E, #4ADE80);
  }

  .quality-fill.null-rate {
    background: linear-gradient(90deg, #F59E0B, #FBBF24);
  }

  .insights-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .insight-card {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
  }

  .insight-card.insight-warning {
    border-left: 3px solid #F59E0B;
  }

  .insight-card.insight-info {
    border-left: 3px solid #4285F4;
  }

  .insight-card.insight-suggestion {
    border-left: 3px solid #22C55E;
  }

  .insight-card.insight-trend {
    border-left: 3px solid #8B5CF6;
  }

  .insight-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .insight-content {
    flex: 1;
    min-width: 0;
  }

  .insight-title {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .insight-description {
    margin: 0.25rem 0 0 0;
    font-size: 0.75rem;
    color: #9CA3AF;
    line-height: 1.4;
  }

  .insight-action {
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: #374151;
    border: none;
    border-radius: 4px;
    color: #E5E7EB;
    font-size: 0.6875rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .insight-action:hover {
    background: #4B5563;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.75rem;
  }

  .chart-suggestion {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .chart-suggestion:hover {
    border-color: #4285F4;
    background: rgba(66, 133, 244, 0.1);
  }

  .chart-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .chart-info {
    flex: 1;
    min-width: 0;
  }

  .chart-title {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #F3F4F6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chart-description {
    margin: 0.25rem 0 0 0;
    font-size: 0.6875rem;
    color: #6B7280;
    line-height: 1.4;
  }
</style>
