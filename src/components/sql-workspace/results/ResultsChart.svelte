<script lang="ts">
  /**
   * ResultsChart Component (Enhanced)
   *
   * Full-featured chart visualization for query results.
   * Integrates ChartConfigPanel functionality.
   *
   * Features:
   * - Multiple chart types: bar, line, pie, scatter, histogram
   * - Auto-detect column types
   * - Configure X/Y columns, aggregation, grouping
   * - Advanced options: dimensions, title, labels
   * - Real-time preview
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

  // Chart dimensions
  let chartWidth = $state(600)
  let chartHeight = $state(350)
  let chartTitle = $state('')
  let xLabel = $state('')
  let yLabel = $state('')
  let showAdvanced = $state(false)

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

  // All columns for flexible selection
  const allColumns = $derived(result.columns)

  // Chart type options
  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: '📊' },
    { value: 'line', label: 'Line Chart', icon: '📈' },
    { value: 'pie', label: 'Pie Chart', icon: '🥧' },
    { value: 'scatter', label: 'Scatter Plot', icon: '⚬' },
    { value: 'histogram', label: 'Histogram', icon: '📶' }
  ] as const

  // Aggregation options
  const aggregations = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' }
  ] as const

  // Colors for charts
  const colors = ['#8B5CF6', '#4285F4', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16']

  // Auto-suggest chart config if not set
  $effect(() => {
    if (!config.xColumn && allColumns.length > 0) {
      const xCol = categoricalColumns.length > 0 ? categoricalColumns[0] : allColumns[0]
      const yCol = numericColumns.length > 0 ? numericColumns[0] : (allColumns.length > 1 ? allColumns[1] : allColumns[0])
      onConfigChange({
        ...config,
        xColumn: xCol,
        yColumns: yCol ? [yCol] : []
      })
    }
  })

  // Check if we can render
  const canRender = $derived(config.xColumn && config.yColumns.length > 0)

  // Prepare chart data with aggregation
  function prepareChartData() {
    if (!config.xColumn || config.yColumns.length === 0) return null

    const grouped = new Map<string, { values: number[], count: number }>()

    result.data.forEach(row => {
      const xVal = String(row[config.xColumn!] ?? 'null')
      if (!grouped.has(xVal)) {
        grouped.set(xVal, {
          values: config.yColumns.map(() => 0),
          count: 0
        })
      }
      const group = grouped.get(xVal)!
      group.count++

      config.yColumns.forEach((yCol, i) => {
        const yVal = Number(row[yCol]) || 0
        const agg = config.aggregation || 'sum'

        if (agg === 'sum') {
          group.values[i] += yVal
        } else if (agg === 'count') {
          group.values[i] = group.count
        } else if (agg === 'max') {
          group.values[i] = Math.max(group.values[i], yVal)
        } else if (agg === 'min') {
          if (group.count === 1) {
            group.values[i] = yVal
          } else {
            group.values[i] = Math.min(group.values[i], yVal)
          }
        } else if (agg === 'avg') {
          // Will calculate after loop
          group.values[i] += yVal
        }
      })
    })

    // Calculate averages
    if (config.aggregation === 'avg') {
      grouped.forEach((group) => {
        group.values = group.values.map(v => v / group.count)
      })
    }

    return {
      labels: Array.from(grouped.keys()),
      datasets: config.yColumns.map((col, i) => ({
        label: col,
        values: Array.from(grouped.values()).map(g => g.values[i])
      }))
    }
  }

  // Render bar chart as SVG
  function renderBarChart() {
    const data = prepareChartData()
    if (!data) return ''

    const width = chartWidth
    const height = chartHeight
    const padding = { top: 40, right: 20, bottom: 60, left: 60 }
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom

    const maxValue = Math.max(...data.datasets.flatMap(d => d.values), 0) || 1
    const barGroupWidth = innerWidth / data.labels.length
    const barWidth = (barGroupWidth * 0.8) / data.datasets.length
    const barGap = barGroupWidth * 0.2

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: transparent;">`

    // Title
    if (chartTitle) {
      svg += `<text x="${width / 2}" y="20" fill="#E5E7EB" font-size="14" font-weight="600" text-anchor="middle">${chartTitle}</text>`
    }

    // Y-axis grid lines and labels
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (innerHeight / 5) * i
      const value = maxValue - (maxValue / 5) * i
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#374151" stroke-dasharray="4"/>`
      svg += `<text x="${padding.left - 10}" y="${y + 4}" fill="#6B7280" font-size="10" text-anchor="end">${formatValue(value)}</text>`
    }

    // Bars
    data.labels.forEach((label, i) => {
      const groupX = padding.left + i * barGroupWidth + barGap / 2

      data.datasets.forEach((dataset, j) => {
        const value = dataset.values[i]
        const barHeight = maxValue > 0 ? (value / maxValue) * innerHeight : 0
        const x = groupX + j * barWidth
        const y = padding.top + innerHeight - barHeight
        const color = colors[j % colors.length]

        svg += `<rect x="${x}" y="${y}" width="${barWidth - 2}" height="${barHeight}" fill="${color}" rx="2">
          <title>${dataset.label}: ${formatValue(value)}</title>
        </rect>`
      })

      // X-axis label
      const labelText = label.length > 12 ? label.slice(0, 12) + '...' : label
      svg += `<text x="${groupX + (barGroupWidth - barGap) / 2}" y="${height - padding.bottom + 20}" fill="#6B7280" font-size="10" text-anchor="middle" transform="rotate(-45, ${groupX + (barGroupWidth - barGap) / 2}, ${height - padding.bottom + 20})">${labelText}</text>`
    })

    // X-axis label
    if (xLabel) {
      svg += `<text x="${width / 2}" y="${height - 5}" fill="#9CA3AF" font-size="11" text-anchor="middle">${xLabel}</text>`
    }

    // Y-axis label
    if (yLabel) {
      svg += `<text x="15" y="${height / 2}" fill="#9CA3AF" font-size="11" text-anchor="middle" transform="rotate(-90, 15, ${height / 2})">${yLabel}</text>`
    }

    // Legend
    if (data.datasets.length > 1) {
      let legendX = padding.left
      data.datasets.forEach((dataset, i) => {
        const color = colors[i % colors.length]
        svg += `<rect x="${legendX}" y="30" width="12" height="12" fill="${color}" rx="2"/>`
        svg += `<text x="${legendX + 16}" y="40" fill="#9CA3AF" font-size="10">${dataset.label}</text>`
        legendX += Math.min(100, dataset.label.length * 8 + 30)
      })
    }

    svg += '</svg>'
    return svg
  }

  // Render line chart as SVG
  function renderLineChart() {
    const data = prepareChartData()
    if (!data) return ''

    const width = chartWidth
    const height = chartHeight
    const padding = { top: 40, right: 20, bottom: 60, left: 60 }
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom

    const maxValue = Math.max(...data.datasets.flatMap(d => d.values), 0) || 1
    const minValue = Math.min(...data.datasets.flatMap(d => d.values), 0)
    const valueRange = maxValue - minValue || 1

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: transparent;">`

    // Title
    if (chartTitle) {
      svg += `<text x="${width / 2}" y="20" fill="#E5E7EB" font-size="14" font-weight="600" text-anchor="middle">${chartTitle}</text>`
    }

    // Grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (innerHeight / 5) * i
      const value = maxValue - (valueRange / 5) * i
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#374151" stroke-dasharray="4"/>`
      svg += `<text x="${padding.left - 10}" y="${y + 4}" fill="#6B7280" font-size="10" text-anchor="end">${formatValue(value)}</text>`
    }

    // Lines
    data.datasets.forEach((dataset, j) => {
      const color = colors[j % colors.length]
      let pathD = ''

      dataset.values.forEach((value, i) => {
        const x = padding.left + (i / Math.max(data.labels.length - 1, 1)) * innerWidth
        const y = padding.top + innerHeight - ((value - minValue) / valueRange) * innerHeight
        pathD += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
      })

      svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`

      // Points
      dataset.values.forEach((value, i) => {
        const x = padding.left + (i / Math.max(data.labels.length - 1, 1)) * innerWidth
        const y = padding.top + innerHeight - ((value - minValue) / valueRange) * innerHeight
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="#111827" stroke-width="2">
          <title>${dataset.label}: ${formatValue(value)}</title>
        </circle>`
      })
    })

    // X-axis labels
    data.labels.forEach((label, i) => {
      const x = padding.left + (i / Math.max(data.labels.length - 1, 1)) * innerWidth
      const labelText = label.length > 10 ? label.slice(0, 10) + '...' : label
      svg += `<text x="${x}" y="${height - padding.bottom + 20}" fill="#6B7280" font-size="10" text-anchor="middle">${labelText}</text>`
    })

    // Axis labels
    if (xLabel) svg += `<text x="${width / 2}" y="${height - 5}" fill="#9CA3AF" font-size="11" text-anchor="middle">${xLabel}</text>`
    if (yLabel) svg += `<text x="15" y="${height / 2}" fill="#9CA3AF" font-size="11" text-anchor="middle" transform="rotate(-90, 15, ${height / 2})">${yLabel}</text>`

    // Legend
    if (data.datasets.length > 1) {
      let legendX = padding.left
      data.datasets.forEach((dataset, i) => {
        const color = colors[i % colors.length]
        svg += `<line x1="${legendX}" y1="36" x2="${legendX + 12}" y2="36" stroke="${color}" stroke-width="2"/>`
        svg += `<text x="${legendX + 16}" y="40" fill="#9CA3AF" font-size="10">${dataset.label}</text>`
        legendX += Math.min(100, dataset.label.length * 8 + 30)
      })
    }

    svg += '</svg>'
    return svg
  }

  // Render pie chart as SVG
  function renderPieChart() {
    const data = prepareChartData()
    if (!data || data.labels.length === 0) return ''

    const width = chartWidth
    const height = chartHeight
    const centerX = width / 2
    const centerY = height / 2 + 10
    const radius = Math.min(width, height) / 2 - 60

    const values = data.datasets[0]?.values || []
    const total = values.reduce((a, b) => a + b, 0) || 1

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: transparent;">`

    // Title
    if (chartTitle) {
      svg += `<text x="${width / 2}" y="20" fill="#E5E7EB" font-size="14" font-weight="600" text-anchor="middle">${chartTitle}</text>`
    }

    let currentAngle = -Math.PI / 2

    data.labels.forEach((label, i) => {
      const value = values[i]
      const sliceAngle = (value / total) * Math.PI * 2
      const color = colors[i % colors.length]

      // Calculate arc path
      const x1 = centerX + radius * Math.cos(currentAngle)
      const y1 = centerY + radius * Math.sin(currentAngle)
      const x2 = centerX + radius * Math.cos(currentAngle + sliceAngle)
      const y2 = centerY + radius * Math.sin(currentAngle + sliceAngle)
      const largeArc = sliceAngle > Math.PI ? 1 : 0

      svg += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="#111827" stroke-width="2">
        <title>${label}: ${formatValue(value)} (${((value / total) * 100).toFixed(1)}%)</title>
      </path>`

      // Label
      const labelAngle = currentAngle + sliceAngle / 2
      const labelRadius = radius * 0.7
      const labelX = centerX + labelRadius * Math.cos(labelAngle)
      const labelY = centerY + labelRadius * Math.sin(labelAngle)

      if (sliceAngle > 0.3) {
        const percentage = ((value / total) * 100).toFixed(1)
        svg += `<text x="${labelX}" y="${labelY}" fill="#E5E7EB" font-size="11" font-weight="500" text-anchor="middle" dominant-baseline="middle">${percentage}%</text>`
      }

      currentAngle += sliceAngle
    })

    // Legend
    const legendY = height - 40
    const legendItemWidth = Math.min(100, width / data.labels.length)
    const legendStartX = (width - data.labels.length * legendItemWidth) / 2

    data.labels.forEach((label, i) => {
      const x = legendStartX + i * legendItemWidth
      const color = colors[i % colors.length]
      const labelText = label.length > 10 ? label.slice(0, 10) + '...' : label
      svg += `<rect x="${x}" y="${legendY}" width="10" height="10" fill="${color}" rx="2"/>`
      svg += `<text x="${x + 14}" y="${legendY + 9}" fill="#9CA3AF" font-size="9">${labelText}</text>`
    })

    svg += '</svg>'
    return svg
  }

  // Render scatter plot as SVG
  function renderScatterChart() {
    if (!config.xColumn || config.yColumns.length === 0) return ''

    const width = chartWidth
    const height = chartHeight
    const padding = { top: 40, right: 20, bottom: 60, left: 60 }
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom

    const xValues = result.data.map(row => Number(row[config.xColumn!]) || 0)
    const yValues = result.data.map(row => Number(row[config.yColumns[0]]) || 0)

    const xMin = Math.min(...xValues)
    const xMax = Math.max(...xValues)
    const yMin = Math.min(...yValues)
    const yMax = Math.max(...yValues)
    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: transparent;">`

    // Title
    if (chartTitle) {
      svg += `<text x="${width / 2}" y="20" fill="#E5E7EB" font-size="14" font-weight="600" text-anchor="middle">${chartTitle}</text>`
    }

    // Grid
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (innerHeight / 5) * i
      const x = padding.left + (innerWidth / 5) * i
      const yValue = yMax - (yRange / 5) * i
      const xValue = xMin + (xRange / 5) * i
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#374151" stroke-dasharray="4"/>`
      svg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="#374151" stroke-dasharray="4"/>`
      svg += `<text x="${padding.left - 10}" y="${y + 4}" fill="#6B7280" font-size="10" text-anchor="end">${formatValue(yValue)}</text>`
      svg += `<text x="${x}" y="${height - padding.bottom + 15}" fill="#6B7280" font-size="10" text-anchor="middle">${formatValue(xValue)}</text>`
    }

    // Points
    result.data.forEach((row) => {
      const xVal = Number(row[config.xColumn!]) || 0
      const yVal = Number(row[config.yColumns[0]]) || 0
      const x = padding.left + ((xVal - xMin) / xRange) * innerWidth
      const y = padding.top + innerHeight - ((yVal - yMin) / yRange) * innerHeight
      const color = colors[0]

      svg += `<circle cx="${x}" cy="${y}" r="5" fill="${color}" fill-opacity="0.7" stroke="${color}" stroke-width="1">
        <title>${config.xColumn}: ${formatValue(xVal)}, ${config.yColumns[0]}: ${formatValue(yVal)}</title>
      </circle>`
    })

    // Axis labels
    if (xLabel || config.xColumn) svg += `<text x="${width / 2}" y="${height - 5}" fill="#9CA3AF" font-size="11" text-anchor="middle">${xLabel || config.xColumn}</text>`
    if (yLabel || config.yColumns[0]) svg += `<text x="15" y="${height / 2}" fill="#9CA3AF" font-size="11" text-anchor="middle" transform="rotate(-90, 15, ${height / 2})">${yLabel || config.yColumns[0]}</text>`

    svg += '</svg>'
    return svg
  }

  // Render histogram as SVG
  function renderHistogram() {
    if (!config.xColumn) return ''

    const width = chartWidth
    const height = chartHeight
    const padding = { top: 40, right: 20, bottom: 60, left: 60 }
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom

    const values = result.data.map(row => Number(row[config.xColumn!])).filter(v => !isNaN(v))
    if (values.length === 0) return ''

    const min = Math.min(...values)
    const max = Math.max(...values)
    const binCount = 15
    const binWidth = (max - min) / binCount || 1

    // Create bins
    const bins = Array.from({ length: binCount }, (_, i) => ({
      x0: min + i * binWidth,
      x1: min + (i + 1) * binWidth,
      count: 0
    }))

    values.forEach(v => {
      const binIndex = Math.min(Math.floor((v - min) / binWidth), binCount - 1)
      if (binIndex >= 0 && binIndex < bins.length) {
        bins[binIndex].count++
      }
    })

    const maxCount = Math.max(...bins.map(b => b.count), 1)

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: transparent;">`

    // Title
    if (chartTitle) {
      svg += `<text x="${width / 2}" y="20" fill="#E5E7EB" font-size="14" font-weight="600" text-anchor="middle">${chartTitle}</text>`
    }

    // Y-axis grid
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (innerHeight / 5) * i
      const value = maxCount - (maxCount / 5) * i
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#374151" stroke-dasharray="4"/>`
      svg += `<text x="${padding.left - 10}" y="${y + 4}" fill="#6B7280" font-size="10" text-anchor="end">${Math.round(value)}</text>`
    }

    // Bars
    const barWidthPx = innerWidth / binCount
    bins.forEach((bin, i) => {
      const x = padding.left + i * barWidthPx
      const barHeight = (bin.count / maxCount) * innerHeight
      const y = padding.top + innerHeight - barHeight

      svg += `<rect x="${x + 1}" y="${y}" width="${barWidthPx - 2}" height="${barHeight}" fill="${colors[0]}" fill-opacity="0.8" stroke="${colors[0]}" stroke-width="1">
        <title>${formatValue(bin.x0)} - ${formatValue(bin.x1)}: ${bin.count}</title>
      </rect>`
    })

    // X-axis labels
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (innerWidth / 5) * i
      const value = min + (max - min) / 5 * i
      svg += `<text x="${x}" y="${height - padding.bottom + 15}" fill="#6B7280" font-size="10" text-anchor="middle">${formatValue(value)}</text>`
    }

    // Axis labels
    if (xLabel || config.xColumn) svg += `<text x="${width / 2}" y="${height - 5}" fill="#9CA3AF" font-size="11" text-anchor="middle">${xLabel || config.xColumn}</text>`
    svg += `<text x="15" y="${height / 2}" fill="#9CA3AF" font-size="11" text-anchor="middle" transform="rotate(-90, 15, ${height / 2})">Count</text>`

    svg += '</svg>'
    return svg
  }

  // Format number for display
  function formatValue(n: number): string {
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    if (Number.isInteger(n)) return n.toString()
    return n.toFixed(2)
  }

  // Get chart SVG based on type
  function getChartSVG() {
    switch (config.type) {
      case 'bar': return renderBarChart()
      case 'line': return renderLineChart()
      case 'pie': return renderPieChart()
      case 'scatter': return renderScatterChart()
      case 'histogram': return renderHistogram()
      default: return ''
    }
  }
</script>

<div class="results-chart">
  <!-- Config Panel -->
  <aside class="chart-config">
    <div class="config-section">
      <h4>Chart Type</h4>
      <div class="chart-types">
        {#each chartTypes as ct}
          <button
            class="type-btn"
            class:active={config.type === ct.value}
            onclick={() => onConfigChange({ ...config, type: ct.value })}
            title={ct.label}
          >
            <span class="icon">{ct.icon}</span>
            <span class="label">{ct.label.split(' ')[0]}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="config-section">
      <h4>Data Mapping</h4>

      <div class="config-field">
        <label for="x-column">X Axis</label>
        <select
          id="x-column"
          value={config.xColumn || ''}
          onchange={(e) => onConfigChange({ ...config, xColumn: e.currentTarget.value || null })}
        >
          <option value="">Select column...</option>
          {#each allColumns as col}
            <option value={col}>{col} ({columnTypes[col]})</option>
          {/each}
        </select>
      </div>

      <div class="config-field">
        <label for="y-column">Y Axis</label>
        <select
          id="y-column"
          value={config.yColumns[0] || ''}
          onchange={(e) => onConfigChange({ ...config, yColumns: e.currentTarget.value ? [e.currentTarget.value] : [] })}
        >
          <option value="">Select column...</option>
          {#each allColumns as col}
            <option value={col}>{col} ({columnTypes[col]})</option>
          {/each}
        </select>
      </div>

      {#if config.type !== 'scatter' && config.type !== 'histogram'}
        <div class="config-field">
          <label for="aggregation">Aggregation</label>
          <select
            id="aggregation"
            value={config.aggregation || 'sum'}
            onchange={(e) => onConfigChange({ ...config, aggregation: e.currentTarget.value as any })}
          >
            {#each aggregations as agg}
              <option value={agg.value}>{agg.label}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>

    <!-- Advanced Options Toggle -->
    <button class="advanced-toggle" onclick={() => showAdvanced = !showAdvanced}>
      {showAdvanced ? '▼' : '▶'} Advanced Options
    </button>

    {#if showAdvanced}
      <div class="config-section advanced">
        <div class="config-row">
          <div class="config-field">
            <label for="width">Width</label>
            <input id="width" type="number" bind:value={chartWidth} min="300" max="1200" step="50" />
          </div>
          <div class="config-field">
            <label for="height">Height</label>
            <input id="height" type="number" bind:value={chartHeight} min="200" max="800" step="50" />
          </div>
        </div>

        <div class="config-field">
          <label for="title">Chart Title</label>
          <input id="title" type="text" bind:value={chartTitle} placeholder="Optional title..." />
        </div>

        <div class="config-field">
          <label for="x-label">X Axis Label</label>
          <input id="x-label" type="text" bind:value={xLabel} placeholder="Optional label..." />
        </div>

        <div class="config-field">
          <label for="y-label">Y Axis Label</label>
          <input id="y-label" type="text" bind:value={yLabel} placeholder="Optional label..." />
        </div>
      </div>
    {/if}
  </aside>

  <!-- Chart Preview -->
  <div class="chart-preview">
    {#if canRender}
      {@html getChartSVG()}
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
    height: 100%;
    background: #111827;
  }

  /* Config Panel */
  .chart-config {
    width: 220px;
    flex-shrink: 0;
    padding: 0.75rem;
    background: #0F172A;
    border-right: 1px solid #1F2937;
    overflow-y: auto;
  }

  .config-section {
    margin-bottom: 1rem;
  }

  .config-section h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6B7280;
  }

  .chart-types {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.375rem;
  }

  .type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    padding: 0.5rem 0.25rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .type-btn:hover {
    background: #374151;
    border-color: #4B5563;
  }

  .type-btn.active {
    background: rgba(66, 133, 244, 0.15);
    border-color: #4285F4;
  }

  .type-btn .icon {
    font-size: 1rem;
  }

  .type-btn .label {
    font-size: 0.625rem;
    color: #9CA3AF;
  }

  .type-btn.active .label {
    color: #E5E7EB;
  }

  .config-field {
    margin-bottom: 0.75rem;
  }

  .config-field label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    color: #9CA3AF;
  }

  .config-field select,
  .config-field input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #E5E7EB;
    font-size: 0.75rem;
  }

  .config-field select:focus,
  .config-field input:focus {
    outline: none;
    border-color: #4285F4;
  }

  .config-row {
    display: flex;
    gap: 0.5rem;
  }

  .config-row .config-field {
    flex: 1;
  }

  .advanced-toggle {
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: none;
    color: #6B7280;
    font-size: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: color 0.15s;
  }

  .advanced-toggle:hover {
    color: #9CA3AF;
  }

  .config-section.advanced {
    padding-top: 0.5rem;
    border-top: 1px solid #1F2937;
  }

  /* Chart Preview */
  .chart-preview {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow: auto;
  }

  .chart-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #6B7280;
  }

  .chart-placeholder .icon {
    font-size: 2.5rem;
    opacity: 0.4;
  }

  .chart-placeholder .text {
    font-size: 0.875rem;
  }

  :global(.chart-preview svg) {
    max-width: 100%;
    height: auto;
  }
</style>
