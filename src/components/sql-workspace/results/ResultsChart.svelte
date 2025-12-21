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
  let chartWidth = $state(700)
  let chartHeight = $state(400)
  let chartTitle = $state('')
  let xLabel = $state('')
  let yLabel = $state('')
  let showAdvanced = $state(false)
  let dataLimit = $state(20) // Limit number of bars/points
  let sortOrder = $state<'desc' | 'asc' | 'none'>('none') // Preserve original order by default

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

  // Aggregation options (None first for raw data display)
  const aggregations = [
    { value: 'none', label: 'None (Raw)' },
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' }
  ] as const

  // Colors for charts
  const colors = ['#8B5CF6', '#4285F4', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16']

  // Check if X column has duplicate values (needs aggregation)
  function hasXColumnDuplicates(xCol: string): boolean {
    if (!xCol || result.data.length === 0) return false
    const values = result.data.map(row => row[xCol])
    const uniqueValues = new Set(values)
    return uniqueValues.size < values.length
  }

  // Get smart aggregation default based on data
  function getSmartAggregation(xCol: string | null): string {
    if (!xCol) return 'none'
    return hasXColumnDuplicates(xCol) ? 'sum' : 'none'
  }

  // Auto-suggest chart config if not set
  $effect(() => {
    if (!config.xColumn && allColumns.length > 0) {
      const xCol = categoricalColumns.length > 0 ? categoricalColumns[0] : allColumns[0]
      const yCol = numericColumns.length > 0 ? numericColumns[0] : (allColumns.length > 1 ? allColumns[1] : allColumns[0])
      const smartAgg = getSmartAggregation(xCol)
      onConfigChange({
        ...config,
        xColumn: xCol,
        yColumns: yCol ? [yCol] : [],
        aggregation: smartAgg as any
      })
    }
  })

  // Update aggregation when X column changes
  $effect(() => {
    if (config.xColumn && config.aggregation === undefined) {
      const smartAgg = getSmartAggregation(config.xColumn)
      if (smartAgg !== config.aggregation) {
        onConfigChange({
          ...config,
          aggregation: smartAgg as any
        })
      }
    }
  })

  // Check if we can render
  const canRender = $derived(config.xColumn && config.yColumns.length > 0)

  // Prepare chart data with aggregation, sorting, and limiting
  function prepareChartData(limit?: number, sort?: 'desc' | 'asc' | 'none') {
    if (!config.xColumn || config.yColumns.length === 0) return null

    const agg = config.aggregation || 'none'

    // For "none" aggregation, use raw data without grouping
    if (agg === 'none') {
      let entries = result.data.map(row => ({
        label: String(row[config.xColumn!] ?? 'null'),
        values: config.yColumns.map(yCol => Number(row[yCol]) || 0)
      }))

      // Sort by first Y column value
      const sortBy = sort ?? sortOrder
      if (sortBy !== 'none') {
        entries.sort((a, b) => {
          const diff = b.values[0] - a.values[0]
          return sortBy === 'desc' ? diff : -diff
        })
      }

      // Limit data points
      const maxItems = limit ?? dataLimit
      const totalCount = entries.length
      if (maxItems > 0 && entries.length > maxItems) {
        entries = entries.slice(0, maxItems)
      }

      return {
        labels: entries.map(e => e.label),
        datasets: config.yColumns.map((col, i) => ({
          label: col,
          values: entries.map(e => e.values[i])
        })),
        totalCount,
        limitedCount: entries.length
      }
    }

    // With aggregation, group by X column
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
    if (agg === 'avg') {
      grouped.forEach((group) => {
        group.values = group.values.map(v => v / group.count)
      })
    }

    // Convert to arrays
    let entries = Array.from(grouped.entries()).map(([label, data]) => ({
      label,
      values: data.values
    }))

    // Sort by first Y column value
    const sortBy = sort ?? sortOrder
    if (sortBy !== 'none') {
      entries.sort((a, b) => {
        const diff = b.values[0] - a.values[0]
        return sortBy === 'desc' ? diff : -diff
      })
    }

    // Limit data points
    const maxItems = limit ?? dataLimit
    if (maxItems > 0 && entries.length > maxItems) {
      entries = entries.slice(0, maxItems)
    }

    return {
      labels: entries.map(e => e.label),
      datasets: config.yColumns.map((col, i) => ({
        label: col,
        values: entries.map(e => e.values[i])
      })),
      totalCount: grouped.size,
      limitedCount: entries.length
    }
  }

  // Render bar chart as SVG
  function renderBarChart() {
    const data = prepareChartData()
    if (!data || data.labels.length === 0) return ''

    const width = chartWidth
    const height = chartHeight
    const padding = { top: 50, right: 30, bottom: 80, left: 70 }
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom

    const numBars = data.labels.length
    const maxValue = Math.max(...data.datasets.flatMap(d => d.values), 0) || 1

    // Calculate nice Y-axis ticks
    const yTicks = calculateNiceTicks(0, maxValue, 5)
    const yMax = yTicks[yTicks.length - 1]

    // Calculate bar dimensions with dynamic sizing based on data count
    // More bars = thinner bars, fewer bars = wider bars (but not too wide)
    const totalBarGroupWidth = innerWidth / numBars

    // Dynamic bar width limits based on number of bars
    let minBarWidth: number, maxBarWidth: number, gapRatio: number
    if (numBars <= 5) {
      minBarWidth = 20
      maxBarWidth = 40
      gapRatio = 0.4 // 40% gap for few bars
    } else if (numBars <= 15) {
      minBarWidth = 12
      maxBarWidth = 30
      gapRatio = 0.35
    } else if (numBars <= 30) {
      minBarWidth = 8
      maxBarWidth = 20
      gapRatio = 0.3
    } else {
      minBarWidth = 4
      maxBarWidth = 15
      gapRatio = 0.25 // Less gap for many bars
    }

    const barGroupGap = totalBarGroupWidth * gapRatio
    const availableBarWidth = totalBarGroupWidth - barGroupGap
    const barWidth = Math.min(maxBarWidth, Math.max(minBarWidth, availableBarWidth / data.datasets.length))
    const actualGroupWidth = barWidth * data.datasets.length

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: transparent;">`

    // Title
    if (chartTitle) {
      svg += `<text x="${width / 2}" y="24" fill="#E5E7EB" font-size="14" font-weight="600" text-anchor="middle">${chartTitle}</text>`
    }

    // Data info (showing limited)
    if (data.totalCount > data.limitedCount) {
      svg += `<text x="${width - padding.right}" y="24" fill="#6B7280" font-size="10" text-anchor="end">Showing top ${data.limitedCount} of ${data.totalCount}</text>`
    }

    // Y-axis grid lines and labels
    yTicks.forEach(tick => {
      const y = padding.top + innerHeight - (tick / yMax) * innerHeight
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#374151" stroke-opacity="0.5" stroke-dasharray="4"/>`
      svg += `<text x="${padding.left - 12}" y="${y + 4}" fill="#6B7280" font-size="11" text-anchor="end">${formatValue(tick)}</text>`
    })

    // Baseline
    svg += `<line x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${width - padding.right}" y2="${padding.top + innerHeight}" stroke="#4B5563" stroke-width="1"/>`

    // Calculate X-axis label interval (smart tick display)
    const labelInterval = calculateLabelInterval(numBars, innerWidth)

    // Bars
    data.labels.forEach((label, i) => {
      const groupCenterX = padding.left + (i + 0.5) * totalBarGroupWidth
      const groupStartX = groupCenterX - actualGroupWidth / 2

      data.datasets.forEach((dataset, j) => {
        const value = dataset.values[i]
        const barHeight = yMax > 0 ? (value / yMax) * innerHeight : 0
        const x = groupStartX + j * barWidth
        const y = padding.top + innerHeight - barHeight
        const color = colors[j % colors.length]

        // Bar with rounded top corners (corner radius proportional to bar width)
        if (barHeight > 0) {
          const cornerRadius = Math.min(3, barWidth / 6)
          const barGap = Math.max(1, barWidth * 0.08) // Small gap between bars
          svg += `<rect x="${x + barGap}" y="${y}" width="${barWidth - barGap * 2}" height="${barHeight}" fill="${color}" rx="${cornerRadius}" ry="${cornerRadius}">
            <title>${label}\n${dataset.label}: ${formatValue(value)}</title>
          </rect>`
        }
      })

      // X-axis label (only show at intervals)
      if (i % labelInterval === 0 || i === numBars - 1) {
        const labelText = truncateLabel(label, 12)
        const labelY = padding.top + innerHeight + 16

        if (numBars > 10) {
          // Rotated labels for many bars
          svg += `<text x="${groupCenterX}" y="${labelY}" fill="#9CA3AF" font-size="10" text-anchor="end" transform="rotate(-45, ${groupCenterX}, ${labelY})">${labelText}</text>`
        } else {
          // Horizontal labels for few bars
          svg += `<text x="${groupCenterX}" y="${labelY}" fill="#9CA3AF" font-size="11" text-anchor="middle">${labelText}</text>`
        }
      }
    })

    // X-axis label
    if (xLabel || config.xColumn) {
      svg += `<text x="${width / 2}" y="${height - 8}" fill="#6B7280" font-size="11" text-anchor="middle">${xLabel || config.xColumn}</text>`
    }

    // Y-axis label
    if (yLabel || config.yColumns[0]) {
      svg += `<text x="16" y="${height / 2}" fill="#6B7280" font-size="11" text-anchor="middle" transform="rotate(-90, 16, ${height / 2})">${yLabel || config.yColumns[0]}</text>`
    }

    // Legend (bottom)
    const legendY = height - 24
    const legendItemWidth = 100
    const legendStartX = (width - data.datasets.length * legendItemWidth) / 2

    data.datasets.forEach((dataset, i) => {
      const x = legendStartX + i * legendItemWidth
      const color = colors[i % colors.length]
      svg += `<rect x="${x}" y="${legendY - 10}" width="14" height="14" fill="${color}" rx="3"/>`
      svg += `<text x="${x + 20}" y="${legendY}" fill="#9CA3AF" font-size="11">${truncateLabel(dataset.label, 10)}</text>`
    })

    svg += '</svg>'
    return svg
  }

  // Calculate nice tick values for axis
  function calculateNiceTicks(min: number, max: number, targetCount: number): number[] {
    const range = max - min
    const roughStep = range / targetCount

    // Find nice step value
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
    const normalized = roughStep / magnitude

    let niceStep: number
    if (normalized <= 1) niceStep = magnitude
    else if (normalized <= 2) niceStep = 2 * magnitude
    else if (normalized <= 5) niceStep = 5 * magnitude
    else niceStep = 10 * magnitude

    const niceMin = Math.floor(min / niceStep) * niceStep
    const niceMax = Math.ceil(max / niceStep) * niceStep

    const ticks: number[] = []
    for (let tick = niceMin; tick <= niceMax; tick += niceStep) {
      ticks.push(tick)
    }
    return ticks
  }

  // Calculate label display interval based on available space
  function calculateLabelInterval(numLabels: number, availableWidth: number): number {
    const minLabelWidth = 60 // Minimum pixels per label
    const maxVisibleLabels = Math.floor(availableWidth / minLabelWidth)
    return Math.max(1, Math.ceil(numLabels / maxVisibleLabels))
  }

  // Truncate label with ellipsis
  function truncateLabel(label: string, maxLength: number): string {
    if (label.length <= maxLength) return label
    return label.slice(0, maxLength - 1) + '…'
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

  // Export chart as SVG
  function exportSVG() {
    const svgContent = getChartSVG()
    if (!svgContent) return

    // Add XML declaration and proper SVG header
    const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>
${svgContent.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')}`

    const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chart-${config.type}-${Date.now()}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Export chart as PNG
  async function exportPNG() {
    const svgContent = getChartSVG()
    if (!svgContent) return

    // Create a canvas with higher resolution for better quality
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = chartWidth * scale
    canvas.height = chartHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill with background
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Convert SVG to data URL
    const svgWithNs = svgContent.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    const svgBlob = new Blob([svgWithNs], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    // Load and draw image
    const img = new Image()
    img.onload = () => {
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(svgUrl)

      // Download
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `chart-${config.type}-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.src = svgUrl
  }
</script>

<div class="results-chart">
  <!-- Config Panel -->
  <aside class="chart-config">
    <div class="config-section">
      <h4>Chart Type</h4>
      <div class="chart-type-select">
        <select
          value={config.type}
          onchange={(e) => onConfigChange({ ...config, type: e.currentTarget.value as any })}
        >
          {#each chartTypes as ct}
            <option value={ct.value}>{ct.label}</option>
          {/each}
        </select>
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
            <label for="limit">Max Items</label>
            <select id="limit" bind:value={dataLimit}>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={30}>Top 30</option>
              <option value={50}>Top 50</option>
              <option value={0}>All</option>
            </select>
          </div>
          <div class="config-field">
            <label for="sort">Sort</label>
            <select id="sort" bind:value={sortOrder}>
              <option value="desc">High → Low</option>
              <option value="asc">Low → High</option>
              <option value="none">Original</option>
            </select>
          </div>
        </div>

        <div class="config-row">
          <div class="config-field">
            <label for="width">Width</label>
            <input id="width" type="number" bind:value={chartWidth} min="400" max="1200" step="50" />
          </div>
          <div class="config-field">
            <label for="height">Height</label>
            <input id="height" type="number" bind:value={chartHeight} min="250" max="800" step="50" />
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
      <div class="chart-container">
        {@html getChartSVG()}
      </div>
      <div class="export-toolbar">
        <button class="export-btn" onclick={exportPNG} title="Export as PNG">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          PNG
        </button>
        <button class="export-btn" onclick={exportSVG} title="Export as SVG">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          SVG
        </button>
      </div>
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

  .chart-type-select select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #E5E7EB;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .chart-type-select select:hover {
    background: #374151;
    border-color: #4B5563;
  }

  .chart-type-select select:focus {
    outline: none;
    border-color: #4285F4;
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow: auto;
    position: relative;
  }

  .chart-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .export-toolbar {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .export-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .export-btn:hover {
    background: #374151;
    border-color: #4B5563;
    color: #E5E7EB;
  }

  .export-btn svg {
    flex-shrink: 0;
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

  :global(.chart-container svg) {
    max-width: 100%;
    height: auto;
  }
</style>
