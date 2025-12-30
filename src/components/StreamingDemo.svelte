<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { StreamingTable } from '@/plugins/streaming/StreamingTable'
  import StreamingLineChart from '@/plugins/streaming/StreamingLineChart.svelte'

  // Streaming tables
  let cpuTable: StreamingTable
  let memoryTable: StreamingTable
  let networkTable: StreamingTable

  // Control state
  let isStreaming = $state(false)
  let streamInterval: ReturnType<typeof setInterval> | null = null
  let updateFrequency = $state(100) // ms
  let dataPointsGenerated = $state(0)

  // Statistics
  let cpuRowCount = $state(0)
  let memoryRowCount = $state(0)
  let networkRowCount = $state(0)

  onMount(() => {
    initializeTables()
  })

  onDestroy(() => {
    stopStreaming()
    cpuTable?.destroy()
    memoryTable?.destroy()
    networkTable?.destroy()
  })

  function initializeTables() {
    // CPU metrics
    cpuTable = new StreamingTable(
      'streaming_cpu_metrics',
      {
        timestamp: 'TIMESTAMP',
        value: 'DOUBLE'
      },
      {
        maxRows: 100,
        autoFlush: true
      }
    )

    // Memory metrics
    memoryTable = new StreamingTable(
      'streaming_memory_metrics',
      {
        timestamp: 'TIMESTAMP',
        value: 'DOUBLE'
      },
      {
        maxRows: 100,
        autoFlush: true
      }
    )

    // Network metrics
    networkTable = new StreamingTable(
      'streaming_network_metrics',
      {
        timestamp: 'TIMESTAMP',
        download: 'DOUBLE',
        upload: 'DOUBLE'
      },
      {
        maxRows: 100,
        autoFlush: true
      }
    )

    // Subscribe to updates for stats
    cpuTable.subscribe(updateStats)
    memoryTable.subscribe(updateStats)
    networkTable.subscribe(updateStats)
  }

  async function updateStats() {
    cpuRowCount = await cpuTable.getRowCount()
    memoryRowCount = await memoryTable.getRowCount()
    networkRowCount = await networkTable.getRowCount()
  }

  function startStreaming() {
    if (isStreaming) return

    isStreaming = true
    dataPointsGenerated = 0

    // Simulate real-time metrics
    streamInterval = setInterval(() => {
      const now = new Date()

      // CPU usage (0-100%)
      const cpuValue = 20 + Math.random() * 60 + Math.sin(Date.now() / 2000) * 15

      // Memory usage (0-16 GB)
      const memoryValue = 4 + Math.random() * 8 + Math.cos(Date.now() / 3000) * 2

      // Network traffic (0-100 Mbps)
      const downloadValue = 10 + Math.random() * 80
      const uploadValue = 5 + Math.random() * 30

      cpuTable.update({ timestamp: now, value: cpuValue })
      memoryTable.update({ timestamp: now, value: memoryValue })
      networkTable.update({
        timestamp: now,
        download: downloadValue,
        upload: uploadValue
      })

      dataPointsGenerated++
    }, updateFrequency)
  }

  function stopStreaming() {
    if (streamInterval) {
      clearInterval(streamInterval)
      streamInterval = null
    }
    isStreaming = false
  }

  function toggleStreaming() {
    if (isStreaming) {
      stopStreaming()
    } else {
      startStreaming()
    }
  }

  async function clearAllData() {
    await cpuTable.clear()
    await memoryTable.clear()
    await networkTable.clear()
    dataPointsGenerated = 0
    updateStats()
  }
</script>

<div class="streaming-demo">
  <header class="demo-header">
    <div class="header-content">
      <h1>🔴 Streaming Data Demo</h1>
      <p class="subtitle">
        Real-time data visualization with DuckDB-WASM and Observable Plot
      </p>
    </div>
  </header>

  <div class="controls-panel">
    <div class="control-group">
      <button
        class="btn btn-primary"
        class:btn-stop={isStreaming}
        onclick={toggleStreaming}
      >
        {isStreaming ? '⏸ Stop Streaming' : '▶ Start Streaming'}
      </button>

      <button class="btn btn-secondary" onclick={clearAllData}>
        🗑️ Clear Data
      </button>
    </div>

    <div class="stats-group">
      <div class="stat-card">
        <div class="stat-label">Update Frequency</div>
        <div class="stat-value">{updateFrequency}ms</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Data Points</div>
        <div class="stat-value">{dataPointsGenerated}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Status</div>
        <div class="stat-value status-indicator">
          <span class="status-dot" class:active={isStreaming}></span>
          {isStreaming ? 'Streaming' : 'Stopped'}
        </div>
      </div>
    </div>

    <div class="frequency-control">
      <label for="frequency-slider">
        Update Frequency: {updateFrequency}ms
      </label>
      <input
        id="frequency-slider"
        type="range"
        min="50"
        max="1000"
        step="50"
        bind:value={updateFrequency}
        disabled={isStreaming}
      />
    </div>
  </div>

  <div class="charts-grid">
    <div class="chart-section">
      <h2>CPU Usage (%)</h2>
      <p class="chart-description">
        Real-time CPU utilization • {cpuRowCount} data points
      </p>
      {#if cpuTable}
        <StreamingLineChart
          table={cpuTable}
          xField="timestamp"
          yField="value"
          title="CPU Usage Over Time"
          color="#4285F4"
          windowSize={100}
        />
      {/if}
    </div>

    <div class="chart-section">
      <h2>Memory Usage (GB)</h2>
      <p class="chart-description">
        Real-time memory consumption • {memoryRowCount} data points
      </p>
      {#if memoryTable}
        <StreamingLineChart
          table={memoryTable}
          xField="timestamp"
          yField="value"
          title="Memory Usage Over Time"
          color="#34A853"
          windowSize={100}
        />
      {/if}
    </div>

    <div class="chart-section full-width">
      <h2>Network Traffic (Mbps)</h2>
      <p class="chart-description">
        Real-time network I/O • {networkRowCount} data points
      </p>
      {#if networkTable}
        <div class="network-charts">
          <StreamingLineChart
            table={networkTable}
            xField="timestamp"
            yField="download"
            title="Download Speed"
            color="#FBBC04"
            windowSize={100}
          />
          <StreamingLineChart
            table={networkTable}
            xField="timestamp"
            yField="upload"
            title="Upload Speed"
            color="#EA4335"
            windowSize={100}
          />
        </div>
      {/if}
    </div>
  </div>

  <div class="info-panel">
    <h3>About This Demo</h3>
    <ul>
      <li>
        <strong>Streaming Engine:</strong> Custom StreamingTable class with DuckDB-WASM
      </li>
      <li>
        <strong>Sliding Window:</strong> Each table keeps only the latest 100 rows
      </li>
      <li>
        <strong>Auto-flush:</strong> Data is automatically flushed when buffer reaches 100 rows
      </li>
      <li>
        <strong>Visualization:</strong> Observable Plot with real-time updates
      </li>
      <li>
        <strong>Performance:</strong> Efficient batching and reactive updates
      </li>
    </ul>
  </div>
</div>

<style>
  .streaming-demo {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .demo-header {
    margin-bottom: 2rem;
  }

  .header-content h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #F3F4F6;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .subtitle {
    color: #9CA3AF;
    font-size: 1rem;
    margin: 0;
  }

  .controls-panel {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .control-group {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
  }

  .btn-stop {
    background: linear-gradient(135deg, #EA4335 0%, #FBBC04 100%);
  }

  .btn-secondary {
    background: #374151;
    color: #F3F4F6;
  }

  .btn-secondary:hover {
    background: #4B5563;
  }

  .stats-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: #111827;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid #374151;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #F3F4F6;
    font-family: 'JetBrains Mono', monospace;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
  }

  .status-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: #6B7280;
    transition: all 0.3s;
  }

  .status-dot.active {
    background: #34A853;
    box-shadow: 0 0 12px rgba(52, 168, 83, 0.6);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .frequency-control {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .frequency-control label {
    font-size: 0.875rem;
    color: #D1D5DB;
    font-weight: 500;
  }

  .frequency-control input[type="range"] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #374151;
    outline: none;
  }

  .frequency-control input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    cursor: pointer;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .chart-section {
    background: transparent;
  }

  .chart-section.full-width {
    grid-column: 1 / -1;
  }

  .chart-section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #F3F4F6;
    margin: 0 0 0.25rem 0;
  }

  .chart-description {
    font-size: 0.875rem;
    color: #9CA3AF;
    margin: 0 0 1rem 0;
  }

  .network-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .info-panel {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .info-panel h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #F3F4F6;
    margin: 0 0 1rem 0;
  }

  .info-panel ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .info-panel li {
    padding: 0.5rem 0;
    color: #D1D5DB;
    font-size: 0.875rem;
  }

  .info-panel strong {
    color: #4285F4;
    font-weight: 600;
  }
</style>
