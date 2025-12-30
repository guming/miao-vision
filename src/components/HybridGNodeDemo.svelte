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
      // Ensure DuckDB is initialized first
      console.log('🔄 Initializing DuckDB...')
      await duckDBManager.initialize()
      console.log('✅ DuckDB initialized')

      // Create GNode instance
      gnode = new HybridGNode()

      console.log('📋 Creating stocks table...')
      // Create stocks table
      await gnode.createTable('stocks', {
        timestamp: 'TIMESTAMP',
        symbol: 'VARCHAR',
        sector: 'VARCHAR',
        price: 'DOUBLE',
        volume: 'INTEGER'
      })
      console.log('✅ Stocks table created')

      // View 1: Volume by symbol
      salesByRegionView = await gnode.createView('volume_by_symbol', {
        source: 'stocks',
        rowPivots: ['symbol'],
        aggregates: {
          volume: 'sum',
          price: 'avg'
        },
        sort: [{ column: 'volume_sum', direction: 'desc' }]
      })

      // View 2: Average price by sector
      salesByProductView = await gnode.createView('price_by_sector', {
        source: 'stocks',
        rowPivots: ['sector'],
        aggregates: {
          price: 'avg',
          volume: 'sum'
        },
        sort: [{ column: 'price_avg', direction: 'desc' }]
      })

      // View 3: Top symbols by volume
      topRegionsView = await gnode.createView('top_symbols', {
        source: 'stocks',
        rowPivots: ['symbol'],
        aggregates: {
          volume: 'sum'
        },
        sort: [{ column: 'volume_sum', direction: 'desc' }]
      })

      // Subscribe to updates
      salesByRegionView.onUpdate(() => loadData())
      salesByProductView.onUpdate(() => loadData())
      topRegionsView.onUpdate(() => loadData())

      console.log('📊 Inserting initial sample data...')
      // Insert initial sample data to show charts immediately
      try {
        const initialData = generateStockData(100)
        await gnode.update('stocks', initialData)
        totalRowsGenerated = 100
        console.log('✅ Initial data inserted')
      } catch (insertError) {
        console.error('❌ Failed to insert initial data:', insertError)
        throw insertError
      }

      // Wait for views to refresh and load initial data
      console.log('⏳ Waiting for views to refresh...')
      await new Promise(resolve => setTimeout(resolve, 200))
      await loadData()

      console.log('✅ Hybrid GNode initialized with sample data')
    } catch (error) {
      console.error('❌ Failed to initialize GNode:', error)
      throw error
    }
  }

  async function loadData() {
    // Guard: only load if all views are initialized
    if (!salesByRegionView || !salesByProductView || !topRegionsView) {
      console.warn('⏭️ loadData skipped - views not ready')
      return
    }

    try {
      console.log('📊 Loading data from views...')
      const [region, product, topRegions] = await Promise.all([
        salesByRegionView.toArray(),
        salesByProductView.toArray(),
        topRegionsView.toArray()
      ])

      console.log(`📊 Loaded: ${region.length} regions, ${product.length} products, ${topRegions.length} top regions`)

      regionData = region
      productData = product
      topRegionsData = topRegions.slice(0, 5)

      renderCharts()
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  function renderCharts() {
    if (!regionChartContainer || !productChartContainer) return

    // Show empty state if no data
    if (regionData.length === 0) {
      regionChartContainer.innerHTML = '<div class="empty-state">📊 No data yet. Click "Start Streaming" to generate data.</div>'
      productChartContainer.innerHTML = '<div class="empty-state">📊 No data yet. Click "Start Streaming" to generate data.</div>'
      return
    }

    // Volume by Symbol chart
    try {
      const volumeChart = Plot.plot({
        marginLeft: 80,
        marginBottom: 40,
        width: regionChartContainer.clientWidth,
        height: 300,
        marks: [
          Plot.barX(regionData, {
            y: 'symbol',
            x: 'volume_sum',
            fill: '#4285F4',
            sort: { y: 'x', reverse: true }
          }),
          Plot.ruleX([0])
        ],
        x: { label: 'Total Volume' },
        y: { label: 'Symbol' }
      })

      regionChartContainer.innerHTML = ''
      regionChartContainer.appendChild(volumeChart)
    } catch (error) {
      console.error('Failed to render volume chart:', error)
    }

    // Price by Sector chart
    try {
      const priceChart = Plot.plot({
        marginLeft: 100,
        marginBottom: 40,
        width: productChartContainer.clientWidth,
        height: 300,
        marks: [
          Plot.barX(productData, {
            y: 'sector',
            x: 'price_avg',
            fill: '#34A853',
            sort: { y: 'x', reverse: true }
          }),
          Plot.ruleX([0])
        ],
        x: { label: 'Average Price ($)' },
        y: { label: 'Sector' }
      })

      productChartContainer.innerHTML = ''
      productChartContainer.appendChild(priceChart)
    } catch (error) {
      console.error('Failed to render price chart:', error)
    }
  }

  function startStreaming() {
    if (isStreaming) return

    console.log(`▶ Starting streaming with ${updateFrequency}ms frequency`)
    isStreaming = true
    // Don't reset totalRowsGenerated if we have initial data
    if (totalRowsGenerated === 0) {
      totalUpdates = 0
      updateTimes = []
    }

    streamInterval = setInterval(async () => {
      const startTime = performance.now()

      try {
        const batchSize = 50
        const stockData = generateStockData(batchSize)

        console.log(`⚡ Inserting ${batchSize} rows...`)
        await gnode.update('stocks', stockData)

        totalRowsGenerated += batchSize
        totalUpdates++

        const elapsed = performance.now() - startTime
        lastUpdateTime = elapsed

        updateTimes.push(elapsed)
        if (updateTimes.length > 20) {
          updateTimes.shift()
        }
        avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length

        console.log(`✓ Update #${totalUpdates} completed in ${elapsed.toFixed(2)}ms`)
      } catch (error) {
        console.error('❌ Update failed:', error)
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

  // Stock symbols and their base prices
  const STOCKS = [
    { symbol: 'AAPL', sector: 'Technology', basePrice: 185 },
    { symbol: 'GOOGL', sector: 'Technology', basePrice: 142 },
    { symbol: 'MSFT', sector: 'Technology', basePrice: 378 },
    { symbol: 'AMZN', sector: 'Consumer', basePrice: 178 },
    { symbol: 'META', sector: 'Technology', basePrice: 505 },
    { symbol: 'JPM', sector: 'Finance', basePrice: 195 },
    { symbol: 'BAC', sector: 'Finance', basePrice: 35 },
    { symbol: 'JNJ', sector: 'Healthcare', basePrice: 156 },
    { symbol: 'PFE', sector: 'Healthcare', basePrice: 28 },
    { symbol: 'XOM', sector: 'Energy', basePrice: 105 }
  ]

  function generateStockData(count: number): any[] {
    // Generate deterministic data: cycle through all stocks
    return Array.from({ length: count }, (_, i) => {
      const stock = STOCKS[i % STOCKS.length]
      // Add small random price variation (+/- 2%)
      const priceVariation = stock.basePrice * (0.98 + Math.random() * 0.04)
      return {
        timestamp: new Date(),
        symbol: stock.symbol,
        sector: stock.sector,
        price: Math.round(priceVariation * 100) / 100,
        volume: Math.floor(Math.random() * 10000) + 1000
      }
    })
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
      await conn.query(`DROP TABLE IF EXISTS stocks`)
      await conn.query(`DROP TABLE IF EXISTS stocks_delta`)
      await conn.query(`DROP TABLE IF EXISTS volume_by_symbol_cache`)
      await conn.query(`DROP TABLE IF EXISTS price_by_sector_cache`)
      await conn.query(`DROP TABLE IF EXISTS top_symbols_cache`)
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
    <h1>📈 Real-time Stock Analytics</h1>
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
      <h3>Volume by Symbol</h3>
      <p class="chart-meta">{regionData.length} stocks • Total volume</p>
      <div bind:this={regionChartContainer} class="chart-container"></div>
    </div>

    <div class="chart-card">
      <h3>Avg Price by Sector</h3>
      <p class="chart-meta">{productData.length} sectors • Average price</p>
      <div bind:this={productChartContainer} class="chart-container"></div>
    </div>
  </div>

  <div class="data-section">
    <div class="data-card">
      <h3>📈 Top 5 Stocks by Volume</h3>
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Total Volume</th>
            </tr>
          </thead>
          <tbody>
            {#each topRegionsData as row}
              <tr>
                <td>{row.symbol}</td>
                <td>{row.volume_sum?.toLocaleString()}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <div class="data-card">
      <h3>📊 All Stocks</h3>
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Avg Price</th>
              <th>Total Volume</th>
            </tr>
          </thead>
          <tbody>
            {#each regionData as row}
              <tr>
                <td>{row.symbol}</td>
                <td>${row.price_avg?.toFixed(2)}</td>
                <td>{row.volume_sum?.toLocaleString()}</td>
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

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: #9CA3AF;
    font-size: 1rem;
    text-align: center;
    padding: 2rem;
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
