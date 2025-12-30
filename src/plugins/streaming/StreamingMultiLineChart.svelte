<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import * as Plot from '@observablehq/plot'
  import type { StreamingTable } from './StreamingTable'

  interface SeriesConfig {
    name: string
    color: string
    filter: string  // SQL WHERE value, e.g., "Beijing"
  }

  interface Props {
    table: StreamingTable
    xField: string
    yField: string
    seriesField: string  // Field to group by (e.g., "city")
    series: SeriesConfig[]
    title?: string
    windowSize?: number
    height?: number
    yLabel?: string
  }

  let {
    table,
    xField,
    yField,
    seriesField,
    series,
    title = 'Multi-Series Chart',
    windowSize = 200,
    height = 400,
    yLabel = ''
  }: Props = $props()

  let chartContainer: HTMLDivElement
  let data = $state<any[]>([])
  let unsubscribe: (() => void) | null = null
  let isLoading = $state(true)

  onMount(async () => {
    await table.waitForInit()
    loadData()
    unsubscribe = table.subscribe(() => {
      loadData()
    })
  })

  onDestroy(() => {
    unsubscribe?.()
    resizeObserver?.disconnect()
  })

  async function loadData() {
    try {
      // Query all series data with limit per series
      const sql = `
        SELECT * FROM "${table.name}"
        ORDER BY "${xField}" DESC
        LIMIT ${windowSize * series.length}
      `
      const result = await table.query(sql)

      // Convert timestamp to Date objects
      data = result.reverse().map(row => ({
        ...row,
        [xField]: row[xField] instanceof Date ? row[xField] : new Date(row[xField])
      }))

      isLoading = false
      renderChart()
    } catch (error) {
      console.error('Failed to load multi-series data:', error)
      isLoading = false
    }
  }

  function renderChart() {
    if (!chartContainer || data.length === 0) return

    try {
      // Create marks for each series
      const marks: any[] = []

      for (const s of series) {
        const seriesData = data.filter(d => d[seriesField] === s.name)
        if (seriesData.length > 0) {
          marks.push(
            Plot.lineY(seriesData, {
              x: xField,
              y: yField,
              stroke: s.color,
              strokeWidth: 2
            })
          )
          marks.push(
            Plot.dot(seriesData, {
              x: xField,
              y: yField,
              fill: s.color,
              r: 2
            })
          )
        }
      }

      // Add zero line
      marks.push(Plot.ruleY([0], { stroke: '#374151', strokeDasharray: '2,2' }))

      const chart = Plot.plot({
        title: title,
        marks: marks,
        marginLeft: 60,
        marginRight: 20,
        marginTop: 40,
        marginBottom: 50,
        width: chartContainer.clientWidth,
        height: height,
        style: {
          background: 'transparent',
          color: '#F3F4F6'
        },
        x: {
          label: 'Date',
          grid: true,
          type: 'time',
          tickFormat: (d: Date) => `12/${d.getDate()}`
        },
        y: {
          label: yLabel || yField,
          grid: true
        }
      })

      chartContainer.innerHTML = ''
      chartContainer.appendChild(chart)
    } catch (error) {
      console.error('Failed to render multi-series chart:', error)
    }
  }

  // Resize observer
  let resizeObserver: ResizeObserver | null = null
  onMount(() => {
    if (chartContainer) {
      resizeObserver = new ResizeObserver(() => {
        if (data.length > 0) renderChart()
      })
      resizeObserver.observe(chartContainer)
    }
  })
</script>

<div class="multi-chart-wrapper">
  {#if isLoading}
    <div class="loading">Loading data...</div>
  {:else if data.length === 0}
    <div class="no-data">No data yet</div>
  {:else}
    <div class="legend">
      {#each series as s}
        <div class="legend-item">
          <span class="legend-color" style="background: {s.color}"></span>
          <span class="legend-label">{s.name}</span>
        </div>
      {/each}
    </div>
  {/if}
  <div bind:this={chartContainer} class="chart"></div>
</div>

<style>
  .multi-chart-wrapper {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .chart {
    width: 100%;
  }

  .loading,
  .no-data {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: #9CA3AF;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    background: #111827;
    border-radius: 0.375rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #D1D5DB;
  }

  .legend-color {
    width: 12px;
    height: 3px;
    border-radius: 1px;
  }

  :global(.multi-chart-wrapper svg) {
    background: transparent !important;
  }

  :global(.multi-chart-wrapper text) {
    fill: #D1D5DB !important;
  }

  :global(.multi-chart-wrapper .plot-title) {
    fill: #F3F4F6 !important;
    font-weight: 600 !important;
  }
</style>
