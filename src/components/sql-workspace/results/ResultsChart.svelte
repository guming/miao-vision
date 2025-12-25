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
  import { MosaicChartAdapter } from './MosaicChartAdapter'
  import type { MosaicChartSpec } from './MosaicChartAdapter'

  interface Props {
    result: QueryResult
    config: ResultsChartConfig
    onConfigChange: (config: ResultsChartConfig) => void
  }

  let { result, config, onConfigChange }: Props = $props()

  // vgplot integration (now default for supported chart types)
  let mosaicChartSpec = $state<MosaicChartSpec | null>(null)
  let mosaicLoading = $state(false)
  let mosaicError = $state<string | null>(null)
  let chartContainer = $state<HTMLDivElement | null>(null)

  // UX: Track whether user has actively selected a chart type
  // Don't auto-render on mount - wait for user to select
  let userHasInteracted = $state(false)

  // P0.2: Cache DuckDB table to avoid reloading same data
  let cachedTableName = $state<string | null>(null)
  let cachedResultHash = $state<string>('')

  // Generate hash for query result to detect changes
  function getResultHash(result: QueryResult): string {
    return `${result.data.length}_${result.columns.join('_')}_${result.rowCount}`
  }

  // P0.4: Generate hash for chart config to detect meaningful changes
  function getConfigHash(config: ResultsChartConfig, width: number, height: number, title: string, xLbl: string, yLbl: string, sort: string): string {
    return JSON.stringify({
      type: config.type,
      xColumn: config.xColumn,
      yColumns: config.yColumns,
      aggregation: config.aggregation,
      groupBy: config.groupBy,
      width,
      height,
      title,
      xLbl,
      yLbl,
      sort
    })
  }

  let cachedConfigHash = $state<string>('')

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

  // P0.4: Render vgplot chart only when data or config actually changes
  $effect(() => {
    // UX: Don't auto-render until user selects a chart type
    if (!userHasInteracted) {
      mosaicChartSpec = null
      return
    }

    // Use vgplot for all supported chart types (bar, line, scatter, histogram)
    if (!MosaicChartAdapter.isVgplotSupported(config.type) || !canRender) {
      mosaicChartSpec = null
      return
    }

    // P0.4: Check if data or config has changed
    const currentResultHash = getResultHash(result)
    const currentConfigHash = getConfigHash(config, chartWidth, chartHeight, chartTitle, xLabel, yLabel, sortOrder)

    const dataChanged = currentResultHash !== cachedResultHash
    const configChanged = currentConfigHash !== cachedConfigHash

    // Skip rendering if nothing changed
    if (!dataChanged && !configChanged && mosaicChartSpec) {
      console.log('[ResultsChart] Skipping render - no changes detected')
      return
    }

    console.log('[ResultsChart] Triggering render:', { dataChanged, configChanged })

    // Show loading immediately
    mosaicLoading = true
    mosaicError = null

    // Debounce rendering to avoid blocking UI
    const timeoutId = setTimeout(() => {
      async function renderMosaicChart() {
        try {
          console.log('[ResultsChart] Rendering vgplot chart...')

          // Build chart config for adapter
          const adapterConfig: ResultsChartConfig = {
            ...config,
            width: chartWidth,
            height: chartHeight,
            title: chartTitle || undefined,
            xLabel: xLabel || undefined,
            yLabel: yLabel || undefined,
            sort: sortOrder,
            showGrid: true
          }

          // P0.2: Pass cached table name if data hasn't changed
          const tableNameToUse = dataChanged ? undefined : cachedTableName || undefined
          const spec = await MosaicChartAdapter.buildChart(result, adapterConfig, tableNameToUse)
          mosaicChartSpec = spec

          // P0.2 & P0.4: Update cache
          if (dataChanged) {
            cachedTableName = spec.tableName
            cachedResultHash = currentResultHash
            console.log('[ResultsChart] Cached new table:', cachedTableName)
          } else if (cachedTableName) {
            console.log('[ResultsChart] Reused cached table:', cachedTableName)
          }

          if (configChanged) {
            cachedConfigHash = currentConfigHash
            console.log('[ResultsChart] Updated config cache')
          }

          console.log(`[ResultsChart] Chart rendered in ${spec.renderTime.toFixed(2)}ms`)
        } catch (error) {
          console.error('[ResultsChart] Failed to render chart:', error)
          mosaicError = error instanceof Error ? error.message : 'Failed to render chart'
          mosaicChartSpec = null
        } finally {
          mosaicLoading = false
        }
      }

      renderMosaicChart()
    }, 50) // 50ms delay to unblock UI

    // Cleanup
    return () => clearTimeout(timeoutId)
  })

  // Append vgplot chart to container when spec changes
  $effect(() => {
    if (mosaicChartSpec && chartContainer) {
      // Clear previous chart
      chartContainer.innerHTML = ''

      // Append new chart
      chartContainer.appendChild(mosaicChartSpec.plot)

      console.log('[ResultsChart] vgplot chart appended to DOM')
    }
  })

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

  // Custom SVG render functions removed for bar, line, scatter, histogram
  // These chart types now use Mosaic vgplot exclusively for better performance

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


  // Format number for display
  function formatValue(n: number): string {
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    if (Number.isInteger(n)) return n.toString()
    return n.toFixed(2)
  }

  // P0.4: Optimize $derived to avoid unnecessary recalculations
  // Only pie chart uses custom SVG; other types use vgplot exclusively
  const chartSVG = $derived.by(() => {
    // Only access dependencies when needed (pie chart)
    if (config.type === 'pie') {
      // Only track dependencies relevant to pie chart
      void [config.xColumn, config.yColumns, config.aggregation, sortOrder, dataLimit, chartWidth, chartHeight, chartTitle]
      return renderPieChart()
    }

    // For vgplot charts, return empty (no dependencies needed)
    return ''
  })

  // Keep function for export functionality
  function getChartSVG() {
    return chartSVG
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

  // Export vgplot chart as SVG
  function exportVgplotSVG() {
    if (!mosaicChartSpec || !chartContainer) return

    const svgElement = chartContainer.querySelector('svg')
    if (!svgElement) return

    // Clone the SVG and add XML namespace
    const svgClone = svgElement.cloneNode(true) as SVGElement
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    const svgString = new XMLSerializer().serializeToString(svgClone)
    const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`

    const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chart-${config.type}-vgplot-${Date.now()}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Unified export SVG handler
  function handleExportSVG() {
    if (MosaicChartAdapter.isVgplotSupported(config.type) && mosaicChartSpec) {
      exportVgplotSVG()
    } else {
      exportSVG()
    }
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

  // Export vgplot chart as PNG
  async function exportVgplotPNG() {
    if (!mosaicChartSpec || !chartContainer) return

    const svgElement = chartContainer.querySelector('svg')
    if (!svgElement) return

    // Get SVG dimensions
    const bbox = svgElement.getBoundingClientRect()
    const width = bbox.width
    const height = bbox.height

    // Create canvas with higher resolution
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill with background
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Convert SVG to data URL
    const svgClone = svgElement.cloneNode(true) as SVGElement
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const svgString = new XMLSerializer().serializeToString(svgClone)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
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
        link.download = `chart-${config.type}-vgplot-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.src = svgUrl
  }

  // Unified export PNG handler
  async function handleExportPNG() {
    if (MosaicChartAdapter.isVgplotSupported(config.type) && mosaicChartSpec) {
      await exportVgplotPNG()
    } else {
      await exportPNG()
    }
  }

  // Save chart configuration as JSON
  function saveConfiguration() {
    const configData = {
      version: '1.0',
      chartConfig: {
        type: config.type,
        xColumn: config.xColumn,
        yColumns: config.yColumns,
        groupColumn: config.groupColumn,
        aggregation: config.aggregation
      },
      advancedOptions: {
        width: chartWidth,
        height: chartHeight,
        title: chartTitle,
        xLabel: xLabel,
        yLabel: yLabel,
        sort: sortOrder,
        dataLimit: dataLimit
      },
      savedAt: new Date().toISOString()
    }

    const json = JSON.stringify(configData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chart-config-${config.type}-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Load chart configuration from JSON file
  function loadConfiguration() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const configData = JSON.parse(text)

        // Validate version
        if (!configData.version || !configData.chartConfig) {
          throw new Error('Invalid configuration file format')
        }

        // Apply chart config
        onConfigChange({
          ...config,
          type: configData.chartConfig.type || config.type,
          xColumn: configData.chartConfig.xColumn || config.xColumn,
          yColumns: configData.chartConfig.yColumns || config.yColumns,
          groupColumn: configData.chartConfig.groupColumn,
          aggregation: configData.chartConfig.aggregation || config.aggregation
        })

        // Apply advanced options
        if (configData.advancedOptions) {
          chartWidth = configData.advancedOptions.width || chartWidth
          chartHeight = configData.advancedOptions.height || chartHeight
          chartTitle = configData.advancedOptions.title || ''
          xLabel = configData.advancedOptions.xLabel || ''
          yLabel = configData.advancedOptions.yLabel || ''
          sortOrder = configData.advancedOptions.sort || 'none'
          dataLimit = configData.advancedOptions.dataLimit || 20
        }

        console.log('[ResultsChart] Configuration loaded successfully')
      } catch (error) {
        console.error('[ResultsChart] Failed to load configuration:', error)
        alert('Failed to load configuration file. Please check the file format.')
      }
    }
    input.click()
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
          onchange={(e) => {
            userHasInteracted = true
            onConfigChange({ ...config, type: e.currentTarget.value as any })
          }}
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

        <!-- Configuration Management -->
        <div class="config-field">
          <label>Configuration</label>
          <div class="config-buttons">
            <button class="config-btn" onclick={saveConfiguration} title="Save chart configuration">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Save Config
            </button>
            <button class="config-btn" onclick={loadConfiguration} title="Load chart configuration">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>
                <polyline points="16 8 12 4 8 8"/>
                <line x1="12" y1="4" x2="12" y2="16"/>
              </svg>
              Load Config
            </button>
          </div>
          <p class="hint">Save/load all chart settings as JSON</p>
        </div>
      </div>
    {/if}
  </aside>

  <!-- Chart Preview -->
  <div class="chart-preview">
    {#if !userHasInteracted}
      <!-- UX: Show friendly placeholder until user selects chart type -->
      <div class="chart-placeholder initial">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
        <h3>Select Chart Type</h3>
        <p>Choose a chart type from the left panel to visualize your data</p>
        <div class="chart-type-hints">
          <span>📊 Bar</span>
          <span>📈 Line</span>
          <span>🥧 Pie</span>
          <span>⚬ Scatter</span>
          <span>📶 Histogram</span>
        </div>
      </div>
    {:else if canRender}
      <!-- vgplot chart (for supported chart types: bar, line, scatter, histogram) -->
      {#if MosaicChartAdapter.isVgplotSupported(config.type)}
        {#if mosaicLoading}
          <!-- P0.3: Skeleton screen for better perceived performance -->
          <div class="chart-skeleton">
            <div class="skeleton-header"></div>
            <div class="skeleton-chart">
              <div class="skeleton-y-axis"></div>
              <div class="skeleton-bars">
                {#each Array(8) as _}
                  <div class="skeleton-bar" style="height: {20 + Math.random() * 60}%"></div>
                {/each}
              </div>
            </div>
            <div class="skeleton-x-axis"></div>
          </div>
        {:else if mosaicError}
          <div class="mosaic-error">
            <strong>⚠ Chart Error</strong>
            <p>{mosaicError}</p>
          </div>
        {:else if mosaicChartSpec}
          <div class="mosaic-info">
            <span class="perf">Rendered in {mosaicChartSpec.renderTime.toFixed(2)}ms</span>
          </div>
          <div class="chart-container" bind:this={chartContainer}></div>
        {/if}
      {:else}
        <!-- Custom SVG chart (pie chart only) -->
        <div class="chart-container">
          {@html chartSVG}
        </div>
      {/if}

      <div class="export-toolbar">
        <button class="export-btn" onclick={handleExportPNG} title="Export as PNG">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          PNG
        </button>
        <button class="export-btn" onclick={handleExportSVG} title="Export as SVG">
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

  .config-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .config-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    width: 100%;
  }

  .config-btn:hover {
    background: #374151;
    border-color: #4B5563;
    color: #E5E7EB;
  }

  .config-btn svg {
    flex-shrink: 0;
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
    width: 100%;
    max-width: 100%;
    overflow: visible;
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

  /* UX: Initial state placeholder */
  .chart-placeholder.initial {
    justify-content: center;
    height: 100%;
    gap: 1.5rem;
    padding: 3rem 2rem;
  }

  .chart-placeholder.initial svg {
    opacity: 0.3;
    stroke: #4B5563;
  }

  .chart-placeholder.initial h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #9CA3AF;
  }

  .chart-placeholder.initial p {
    margin: 0;
    font-size: 0.875rem;
    color: #6B7280;
    text-align: center;
    max-width: 320px;
  }

  .chart-type-hints {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .chart-type-hints span {
    padding: 0.375rem 0.75rem;
    background: rgba(75, 85, 99, 0.3);
    border: 1px solid #374151;
    border-radius: 6px;
    font-size: 0.75rem;
    color: #9CA3AF;
  }

  :global(.chart-preview svg) {
    max-width: 100%;
    height: auto;
  }

  :global(.chart-container svg) {
    max-width: 100%;
    height: auto;
  }

  /* P0.3: Skeleton screen for loading state */
  .chart-skeleton {
    width: 100%;
    max-width: 700px;
    padding: 2rem;
  }

  .skeleton-header {
    height: 24px;
    width: 200px;
    background: linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
    margin-bottom: 2rem;
  }

  .skeleton-chart {
    display: flex;
    gap: 1rem;
    height: 350px;
  }

  .skeleton-y-axis {
    width: 40px;
    background: linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
  }

  .skeleton-bars {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .skeleton-bar {
    flex: 1;
    background: linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px 4px 0 0;
    min-height: 50px;
  }

  .skeleton-x-axis {
    height: 20px;
    width: 100%;
    background: linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
    margin-top: 0.5rem;
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  /* Mosaic vgplot styles */
  .mosaic-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    color: #9CA3AF;
  }

  .mosaic-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
  }

  .mosaic-error strong {
    color: #FCA5A5;
    font-size: 0.9rem;
  }

  .mosaic-info {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
  }

  .mosaic-info .badge {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .mosaic-info .perf {
    color: #10B981;
    font-weight: 500;
  }

  .hint {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    color: #6B7280;
  }

  /* Checkbox styling */
  .config-field label input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  /* vgplot default styling overrides - dark theme */
  :global(.chart-container svg) {
    font-family: inherit;
    background-color: transparent !important;
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* Force dark background for plot area */
  :global(.chart-container svg rect[fill="white"]),
  :global(.chart-container svg rect[fill="#ffffff"]) {
    fill: #1F2937 !important;
  }

  /* Dark text for axes and labels */
  :global(.chart-container svg text) {
    fill: #E5E7EB !important;
  }

  /* Dark grid lines */
  :global(.chart-container svg .grid line) {
    stroke: #374151 !important;
  }

  :global(.chart-container .mark) {
    transition: opacity 0.2s;
  }

  :global(.chart-container .mark:hover) {
    opacity: 0.8;
  }
</style>
