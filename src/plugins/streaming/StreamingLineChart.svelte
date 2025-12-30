<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import * as Plot from '@observablehq/plot'
  import type { StreamingTable } from './StreamingTable'

  interface Props {
    table: StreamingTable
    xField: string
    yField: string
    title?: string
    windowSize?: number  // Show last N points
    color?: string
    height?: number
  }

  let {
    table,
    xField,
    yField,
    title = 'Real-time Data',
    windowSize = 100,
    color = '#4285F4',
    height = 300
  }: Props = $props()

  let chartContainer: HTMLDivElement
  let data = $state<any[]>([])
  let unsubscribe: (() => void) | null = null
  let isLoading = $state(true)

  onMount(() => {
    // Initial load
    loadData()

    // Subscribe to updates
    unsubscribe = table.subscribe(() => {
      loadData()
    })
  })

  onDestroy(() => {
    unsubscribe?.()
  })

  async function loadData() {
    try {
      const sql = windowSize
        ? `SELECT * FROM "${table.name}" ORDER BY "${xField}" DESC LIMIT ${windowSize}`
        : `SELECT * FROM "${table.name}" ORDER BY "${xField}"`

      const result = await table.query(sql)

      // Reverse to show chronological order
      data = windowSize ? result.reverse() : result

      isLoading = false
      renderChart()
    } catch (error) {
      console.error('Failed to load streaming data:', error)
      isLoading = false
    }
  }

  function renderChart() {
    if (!chartContainer || data.length === 0) return

    try {
      const chart = Plot.plot({
        title: title,
        marks: [
          Plot.lineY(data, {
            x: xField,
            y: yField,
            stroke: color,
            strokeWidth: 2
          }),
          Plot.dot(data, {
            x: xField,
            y: yField,
            fill: color,
            r: 3
          }),
          Plot.ruleY([0], { stroke: '#374151', strokeDasharray: '2,2' })
        ],
        marginLeft: 60,
        marginRight: 20,
        marginTop: 40,
        marginBottom: 40,
        width: chartContainer.clientWidth,
        height: height,
        style: {
          background: 'transparent',
          color: '#F3F4F6'
        },
        x: {
          label: xField,
          grid: true,
          tickFormat: (d) => {
            if (d instanceof Date) {
              return d.toLocaleTimeString()
            }
            return d
          }
        },
        y: {
          label: yField,
          grid: true
        }
      })

      chartContainer.innerHTML = ''
      chartContainer.appendChild(chart)
    } catch (error) {
      console.error('Failed to render chart:', error)
    }
  }

  // Re-render on window resize
  let resizeObserver: ResizeObserver | null = null
  onMount(() => {
    if (chartContainer) {
      resizeObserver = new ResizeObserver(() => {
        if (data.length > 0) {
          renderChart()
        }
      })
      resizeObserver.observe(chartContainer)
    }
  })

  onDestroy(() => {
    resizeObserver?.disconnect()
  })
</script>

<div class="streaming-chart-container">
  {#if isLoading}
    <div class="loading">Loading data...</div>
  {:else if data.length === 0}
    <div class="no-data">
      <p>No data yet. Streaming will start automatically.</p>
    </div>
  {:else}
    <div class="chart-stats">
      <span class="stat">
        <span class="label">Points:</span>
        <span class="value">{data.length}</span>
      </span>
      {#if data.length > 0}
        <span class="stat">
          <span class="label">Latest:</span>
          <span class="value">{data[data.length - 1][yField]?.toFixed(2)}</span>
        </span>
      {/if}
    </div>
  {/if}

  <div bind:this={chartContainer} class="chart"></div>
</div>

<style>
  .streaming-chart-container {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    padding: 1rem;
    min-height: 300px;
  }

  .chart {
    width: 100%;
  }

  .loading,
  .no-data {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 250px;
    color: #9CA3AF;
    font-size: 0.875rem;
  }

  .chart-stats {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: #111827;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .stat {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .label {
    color: #9CA3AF;
  }

  .value {
    color: #F3F4F6;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Observable Plot styling overrides */
  :global(.streaming-chart-container svg) {
    background: transparent !important;
  }

  :global(.streaming-chart-container text) {
    fill: #D1D5DB !important;
  }

  :global(.streaming-chart-container .plot-title) {
    fill: #F3F4F6 !important;
    font-weight: 600 !important;
  }
</style>
