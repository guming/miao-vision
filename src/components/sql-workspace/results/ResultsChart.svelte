<script lang="ts">
  /**
   * ResultsChart Component
   *
   * Visualizes query results as charts.
   * Features:
   * - Auto-detect best chart type based on data
   * - Configure X/Y columns
   * - Support for bar, line, pie charts
   */

  import type { QueryResult } from '@/types/database'
  import type { ResultsChartConfig, ColumnStatistics } from './types'
  import { inferColumnType } from './types'

  interface Props {
    result: QueryResult
    config: ResultsChartConfig
    onConfigChange: (config: ResultsChartConfig) => void
  }

  let { result, config, onConfigChange }: Props = $props()

  let chartContainer: HTMLDivElement

  // Infer column types
  const columnTypes = $derived(
    result.columns.reduce((acc, col) => {
      const values = result.data.map(row => row[col])
      acc[col] = inferColumnType(values)
      return acc
    }, {} as Record<string, ColumnStatistics['type']>)
  )

  // Numeric columns for Y-axis
  const numericColumns = $derived(
    result.columns.filter(col => columnTypes[col] === 'number')
  )

  // Categorical columns for X-axis
  const categoricalColumns = $derived(
    result.columns.filter(col => columnTypes[col] === 'string' || columnTypes[col] === 'date')
  )

  // Auto-suggest chart config if not set
  $effect(() => {
    if (!config.xColumn && categoricalColumns.length > 0) {
      onConfigChange({
        ...config,
        xColumn: categoricalColumns[0],
        yColumns: numericColumns.length > 0 ? [numericColumns[0]] : []
      })
    }
  })

  // Prepare chart data
  const chartData = $derived(() => {
    if (!config.xColumn || config.yColumns.length === 0) return null

    // Group and aggregate data
    const grouped = new Map<string, number[]>()

    result.data.forEach(row => {
      const xVal = String(row[config.xColumn!] ?? 'null')
      if (!grouped.has(xVal)) {
        grouped.set(xVal, config.yColumns.map(() => 0))
      }
      const values = grouped.get(xVal)!
      config.yColumns.forEach((yCol, i) => {
        const yVal = Number(row[yCol]) || 0
        if (config.aggregation === 'sum' || config.aggregation === undefined) {
          values[i] += yVal
        } else if (config.aggregation === 'count') {
          values[i] += 1
        } else if (config.aggregation === 'max') {
          values[i] = Math.max(values[i], yVal)
        } else if (config.aggregation === 'min') {
          values[i] = Math.min(values[i], yVal)
        }
      })
    })

    return {
      labels: Array.from(grouped.keys()),
      datasets: config.yColumns.map((col, i) => ({
        label: col,
        values: Array.from(grouped.values()).map(v => v[i])
      }))
    }
  })

  // Simple SVG bar chart renderer
  function renderBarChart(data: { labels: string[], datasets: { label: string, values: number[] }[] }) {
    const width = chartContainer?.clientWidth || 600
    const height = 300
    const padding = { top: 20, right: 20, bottom: 60, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    const maxValue = Math.max(...data.datasets.flatMap(d => d.values))
    const barWidth = chartWidth / data.labels.length * 0.8
    const barGap = chartWidth / data.labels.length * 0.2

    const colors = ['#8B5CF6', '#4285F4', '#22C55E', '#F59E0B', '#EF4444']

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`

    // Y-axis grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i
      const value = maxValue - (maxValue / 5) * i
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#374151" stroke-dasharray="4"/>`
      svg += `<text x="${padding.left - 10}" y="${y + 4}" fill="#6B7280" font-size="10" text-anchor="end">${value.toFixed(0)}</text>`
    }

    // Bars
    data.labels.forEach((label, i) => {
      const x = padding.left + i * (barWidth + barGap) + barGap / 2

      data.datasets.forEach((dataset, j) => {
        const value = dataset.values[i]
        const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0
        const y = padding.top + chartHeight - barHeight
        const color = colors[j % colors.length]

        svg += `<rect x="${x}" y="${y}" width="${barWidth / data.datasets.length}" height="${barHeight}" fill="${color}" rx="2"/>`
      })

      // X-axis label
      const labelText = label.length > 10 ? label.slice(0, 10) + '...' : label
      svg += `<text x="${x + barWidth / 2}" y="${height - padding.bottom + 20}" fill="#6B7280" font-size="10" text-anchor="middle" transform="rotate(-45, ${x + barWidth / 2}, ${height - padding.bottom + 20})">${labelText}</text>`
    })

    // Legend
    let legendX = padding.left
    data.datasets.forEach((dataset, i) => {
      const color = colors[i % colors.length]
      svg += `<rect x="${legendX}" y="5" width="12" height="12" fill="${color}" rx="2"/>`
      svg += `<text x="${legendX + 16}" y="14" fill="#9CA3AF" font-size="10">${dataset.label}</text>`
      legendX += 80
    })

    svg += '</svg>'
    return svg
  }
</script>

<div class="results-chart">
  <div class="chart-config">
    <div class="config-group">
      <label>
        <span class="label-text">Chart Type</span>
        <select
          value={config.type}
          onchange={(e) => onConfigChange({ ...config, type: e.currentTarget.value as ResultsChartConfig['type'] })}
        >
          <option value="bar">Bar Chart</option>
          <option value="line">Line Chart</option>
          <option value="pie">Pie Chart</option>
        </select>
      </label>
    </div>

    <div class="config-group">
      <label>
        <span class="label-text">X Axis</span>
        <select
          value={config.xColumn || ''}
          onchange={(e) => onConfigChange({ ...config, xColumn: e.currentTarget.value || null })}
        >
          <option value="">Select column...</option>
          {#each result.columns as col}
            <option value={col}>{col}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="config-group">
      <label>
        <span class="label-text">Y Axis</span>
        <select
          value={config.yColumns[0] || ''}
          onchange={(e) => onConfigChange({ ...config, yColumns: e.currentTarget.value ? [e.currentTarget.value] : [] })}
        >
          <option value="">Select column...</option>
          {#each numericColumns as col}
            <option value={col}>{col}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="config-group">
      <label>
        <span class="label-text">Aggregation</span>
        <select
          value={config.aggregation || 'sum'}
          onchange={(e) => onConfigChange({ ...config, aggregation: e.currentTarget.value as ResultsChartConfig['aggregation'] })}
        >
          <option value="sum">Sum</option>
          <option value="avg">Average</option>
          <option value="count">Count</option>
          <option value="min">Min</option>
          <option value="max">Max</option>
        </select>
      </label>
    </div>
  </div>

  <div class="chart-container" bind:this={chartContainer}>
    {#if chartData()}
      {#if config.type === 'bar'}
        {@html renderBarChart(chartData()!)}
      {:else}
        <div class="chart-placeholder">
          <span class="icon">📊</span>
          <span class="text">{config.type} chart coming soon</span>
        </div>
      {/if}
    {:else}
      <div class="chart-placeholder">
        <span class="icon">📊</span>
        <span class="text">Select X and Y columns to generate chart</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .results-chart {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #111827;
  }

  .chart-config {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #1F2937;
    background: #0F172A;
  }

  .config-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label-text {
    font-size: 0.6875rem;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  select {
    padding: 0.375rem 0.5rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #E5E7EB;
    font-size: 0.75rem;
    min-width: 8rem;
  }

  select:focus {
    outline: none;
    border-color: #4285F4;
  }

  .chart-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow: hidden;
  }

  .chart-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #6B7280;
  }

  .chart-placeholder .icon {
    font-size: 2rem;
    opacity: 0.5;
  }

  .chart-placeholder .text {
    font-size: 0.8125rem;
  }

  :global(.chart-container svg) {
    max-width: 100%;
    height: auto;
  }
</style>
