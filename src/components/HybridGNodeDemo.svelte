<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { HybridGNode } from '@core/engine'
  import type { HybridView } from '@core/engine'
  import { duckDBManager } from '@core/database'
  import * as Plot from '@observablehq/plot'

  let gnode: HybridGNode
  let salesByRegionView: HybridView
  let salesByProductView: HybridView
  let topRegionsView: HybridView

  let isStreaming = $state(false)
  let streamInterval: ReturnType<typeof setInterval> | null = null
  let updateFrequency = $state(100)
  let totalRowsGenerated = $state(0)
  let totalUpdates = $state(0)

  // View data
  let regionData = $state<any[]>([])
  let productData = $state<any[]>([])
  let topRegionsData = $state<any[]>([])

  // Performance metrics
  let lastUpdateTime = $state(0)
  let avgUpdateTime = $state(0)
  let updateTimes: number[] = []

  // Chart containers
  let regionChartContainer: HTMLDivElement
  let productChartContainer: HTMLDivElement

  onMount(async () => {
    await initializeGNode()
  })

  onDestroy(() => {
    stopStreaming()
    gnode?.destroy()
  })

  async function initializeGNode() {
    try {
      // Create GNode instance
      gnode = new HybridGNode()

      // Create sales table
      await gnode.createTable('sales', {
        timestamp: 'TIMESTAMP',
        region: 'VARCHAR',
        product: 'VARCHAR',
        quantity: 'INTEGER',
        revenue: 'DOUBLE'
      })

      // View 1: Sales by region
      salesByRegionView = await gnode.createView('sales_by_region', {
        source: 'sales',
        rowPivots: ['region'],
        aggregates: {
          revenue: 'sum',
          quantity: 'sum'
        },
        sort: [{ column: 'revenue_sum', direction: 'desc' }]
      })

      // View 2: Sales by product
      salesByProductView = await gnode.createView('sales_by_product', {
        source: 'sales',
        rowPivots: ['product'],
        aggregates: {
          revenue: 'avg',
          quantity: 'count'
        },
        sort: [{ column: 'revenue_avg', direction: 'desc' }]
      })

      // View 3: Top 5 regions (filtered view)
      topRegionsView = await gnode.createView('top_regions', {
        source: 'sales',
        rowPivots: ['region'],
        aggregates: {
          revenue: 'sum'
        },
        sort: [{ column: 'revenue_sum', direction: 'desc' }]
      })

      // Subscribe to updates
      salesByRegionView.onUpdate(() => loadData())
      salesByProductView.onUpdate(() => loadData())
      topRegionsView.onUpdate(() => loadData())

      console.log('✅ Hybrid GNode initialized')
    } catch (error) {
      console.error('Failed to initialize GNode:', error)
    }
  }

  async function loadData() {
    // Guard: only load if all views are initialized
    if (!salesByRegionView || !salesByProductView || !topRegionsView) {
      return
    }

    try {
      [regionData, productData, topRegionsData] = await Promise.all([
        salesByRegionView.toArray(),
        salesByProductView.toArray(),
        topRegionsView.toArray()
      ])

      // Limit top regions to 5
      topRegionsData = topRegionsData.slice(0, 5)

      renderCharts()
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  function renderCharts() {
    if (!regionChartContainer || !productChartContainer) return
    if (regionData.length === 0) return

    // Region chart
    try {
      const regionChart = Plot.plot({
        marginLeft: 80,
        marginBottom: 40,
        width: regionChartContainer.clientWidth,
        height: 300,
        marks: [
          Plot.barX(regionData, {
            y: 'region',
            x: 'revenue_sum',
            fill: '#4285F4',
            sort: { y: 'x', reverse: true }
          }),
          Plot.ruleX([0])
        ],
        x: { label: 'Total Revenue ($)' },
        y: { label: 'Region' }
      })

      regionChartContainer.innerHTML = ''
      regionChartContainer.appendChild(regionChart)
    } catch (error) {
      console.error('Failed to render region chart:', error)
    }

    // Product chart
    try {
      const productChart = Plot.plot({
        marginLeft: 80,
        marginBottom: 40,
        width: productChartContainer.clientWidth,
        height: 300,
        marks: [
          Plot.barX(productData, {
            y: 'product',
            x: 'revenue_avg',
            fill: '#34A853',
            sort: { y: 'x', reverse: true }
          }),
          Plot.ruleX([0])
        ],
        x: { label: 'Average Revenue ($)' },
        y: { label: 'Product' }
      })

      productChartContainer.innerHTML = ''
      productChartContainer.appendChild(productChart)
    } catch (error) {
      console.error('Failed to render product chart:', error)
    }
  }

  function startStreaming() {
    if (isStreaming) return

    isStreaming = true
    totalRowsGenerated = 0
    totalUpdates = 0
    updateTimes = []

    streamInterval = setInterval(async () => {
      const startTime = performance.now()

      try {
        const batchSize = 50
        const salesData = generateSalesData(batchSize)

        await gnode.update('sales', salesData)

        totalRowsGenerated += batchSize
        totalUpdates++

        const elapsed = performance.now() - startTime
        lastUpdateTime = elapsed

        updateTimes.push(elapsed)
        if (updateTimes.length > 20) {
          updateTimes.shift()
        }
        avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
      } catch (error) {
        console.error('Update failed:', error)
      }
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

  function generateSalesData(count: number): any[] {
    const regions = ['North', 'South', 'East', 'West', 'Central']
    const products = ['iPhone', 'MacBook', 'iPad', 'AirPods', 'Watch']

    return Array.from({ length: count }, () => ({
      timestamp: new Date(),
      region: regions[Math.floor(Math.random() * regions.length)],
      product: products[Math.floor(Math.random() * products.length)],
      quantity: Math.floor(Math.random() * 10) + 1,
      revenue: (Math.random() * 1000) + 100
    }))
  }

  async function clearData() {
    stopStreaming()

    // Destroy old instance
    if (gnode) {
      gnode.destroy()
    }

    // Reset view references to prevent race conditions
    salesByRegionView = null as any
    salesByProductView = null as any
    topRegionsView = null as any

    // Drop old tables from DuckDB
    try {
      const db = await duckDBManager.getDB()
      const conn = await db.connect()

      // Drop all related tables
      await conn.query(`DROP TABLE IF EXISTS sales`)
      await conn.query(`DROP TABLE IF EXISTS sales_delta`)
      await conn.query(`DROP TABLE IF EXISTS sales_by_region_cache`)
      await conn.query(`DROP TABLE IF EXISTS sales_by_product_cache`)
      await conn.query(`DROP TABLE IF EXISTS top_regions_cache`)
    } catch (error) {
      console.error('Failed to drop tables:', error)
    }

    // Recreate everything
    await initializeGNode()

    totalRowsGenerated = 0
    totalUpdates = 0
    updateTimes = []
    regionData = []
    productData = []
    topRegionsData = []
  }
</script>

<div class="hybrid-gnode-demo">
  <header class="demo-header">
    <h1>⚡ Hybrid GNode Demo</h1>
    <p class="subtitle">
      DuckDB Storage + Perspective-style Dependency Graph
    </p>
  </header>

  <div class="controls-panel">
    <div class="control-group">
      <button
        class="btn btn-primary"
        class:btn-stop={isStreaming}
        onclick={toggleStreaming}
      >
        {isStreaming ? '⏸ Stop' : '▶ Start'} Streaming
      </button>

      <button class="btn btn-secondary" onclick={clearData}>
        🗑️ Clear Data
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Rows</div>
        <div class="stat-value">{totalRowsGenerated.toLocaleString()}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Total Updates</div>
        <div class="stat-value">{totalUpdates}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Last Update</div>
        <div class="stat-value">{lastUpdateTime.toFixed(2)}ms</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Avg Update</div>
        <div class="stat-value">{avgUpdateTime.toFixed(2)}ms</div>
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
      <label for="freq-slider">
        Update Frequency: {updateFrequency}ms
      </label>
      <input
        id="freq-slider"
        type="range"
        min="50"
        max="1000"
        step="50"
        bind:value={updateFrequency}
        disabled={isStreaming}
      />
    </div>
  </div>

  <div class="charts-section">
    <div class="chart-card">
      <h3>Sales by Region (SUM)</h3>
      <p class="chart-meta">{regionData.length} regions • Total aggregated</p>
      <div bind:this={regionChartContainer} class="chart-container"></div>
    </div>

    <div class="chart-card">
      <h3>Sales by Product (AVG)</h3>
      <p class="chart-meta">{productData.length} products • Average revenue</p>
      <div bind:this={productChartContainer} class="chart-container"></div>
    </div>
  </div>

  <div class="data-section">
    <div class="data-card">
      <h3>🏆 Top 5 Regions</h3>
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {#each topRegionsData as row}
              <tr>
                <td>{row.region}</td>
                <td>${row.revenue_sum?.toFixed(2)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <div class="data-card">
      <h3>📊 All Regions</h3>
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Revenue</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {#each regionData as row}
              <tr>
                <td>{row.region}</td>
                <td>${row.revenue_sum?.toFixed(2)}</td>
                <td>{row.quantity_sum}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="info-panel">
    <h3>Architecture Highlights</h3>
    <ul>
      <li>
        <strong>Dependency Graph:</strong> TypeScript-based (Perspective-style)
      </li>
      <li>
        <strong>Storage Engine:</strong> DuckDB columnar storage
      </li>
      <li>
        <strong>Incremental Updates:</strong> Delta table + batched merge
      </li>
      <li>
        <strong>Auto-refresh:</strong> 60 FPS (16ms batch window)
      </li>
      <li>
        <strong>View Dependencies:</strong> 3 views, automatic propagation
      </li>
    </ul>
  </div>
</div>

<style>
  .hybrid-gnode-demo {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .demo-header {
    margin-bottom: 2rem;
  }

  .demo-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #F3F4F6;
    margin: 0 0 0.5rem 0;
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

  .stats-grid {
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
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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
  }

  .charts-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .chart-card {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .chart-card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #F3F4F6;
    margin: 0 0 0.25rem 0;
  }

  .chart-meta {
    font-size: 0.875rem;
    color: #9CA3AF;
    margin: 0 0 1rem 0;
  }

  .chart-container {
    min-height: 300px;
  }

  .data-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .data-card {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .data-card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #F3F4F6;
    margin: 0 0 1rem 0;
  }

  .data-table {
    max-height: 300px;
    overflow-y: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    position: sticky;
    top: 0;
    background: #111827;
  }

  th {
    text-align: left;
    padding: 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #9CA3AF;
    text-transform: uppercase;
    border-bottom: 1px solid #374151;
  }

  td {
    padding: 0.75rem;
    font-size: 0.875rem;
    color: #D1D5DB;
    border-bottom: 1px solid #374151;
  }

  tbody tr:hover {
    background: #111827;
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
