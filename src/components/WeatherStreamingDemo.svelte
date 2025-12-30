<script lang="ts">
  /**
   * Weather Demo - Beijing Temperature
   *
   * Uses polling API pattern (simulated) for real-time weather updates
   */
  import { onMount, onDestroy } from 'svelte'
  import * as Plot from '@observablehq/plot'

  // Beijing configuration
  const CITY = { name: 'Beijing', baseTemp: -2, color: '#EF4444' }

  // API polling interval
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let pollFrequency = $state(5000) // 5 seconds
  let isPolling = $state(false)
  let lastUpdated = $state<Date | null>(null)

  // Weather data
  let currentTemp = $state<number | null>(null)
  let minTemp = $state<number | null>(null)
  let maxTemp = $state<number | null>(null)
  let avgTemp = $state<number | null>(null)
  let hourlyForecast = $state<any[]>([])
  let historicalData = $state<any[]>([])

  // Chart
  let chartContainer: HTMLDivElement

  onMount(() => {
    // Initial load
    fetchWeatherData()
    // Start polling
    startPolling()
  })

  onDestroy(() => {
    stopPolling()
  })

  // ============ Open-Meteo Weather API ============
  // Free API, no key required: https://open-meteo.com/

  // Beijing coordinates
  const LATITUDE = 39.9042
  const LONGITUDE = 116.4074

  let isLoading = $state(false)
  let apiError = $state<string | null>(null)

  /**
   * Fetch real weather data from Open-Meteo API
   */
  async function fetchWeatherData() {
    isLoading = true
    apiError = null

    try {
      // Fetch 7-day forecast (includes current + future hours)
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia/Shanghai&past_days=7&forecast_days=2`

      const response = await fetch(forecastUrl)
      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const data = await response.json()

      const now = new Date()
      const currentHourStr = now.toISOString().slice(0, 13) + ':00'

      // Parse hourly data
      const hourlyData = data.hourly.time.map((time: string, i: number) => ({
        time,
        timestamp: new Date(time),
        temperature: data.hourly.temperature_2m[i],
        humidity: data.hourly.relative_humidity_2m[i],
        windSpeed: data.hourly.wind_speed_10m[i]
      }))

      // Find current hour index
      const currentIndex = hourlyData.findIndex((h: any) =>
        h.time.startsWith(now.toISOString().slice(0, 13))
      )

      // Get 24-hour forecast starting from current hour
      if (currentIndex >= 0) {
        hourlyForecast = hourlyData.slice(currentIndex, currentIndex + 24).map((h: any, i: number) => ({
          time: h.timestamp.getHours().toString().padStart(2, '0') + ':00',
          temperature: h.temperature,
          humidity: h.humidity,
          windSpeed: Math.round(h.windSpeed * 10) / 10,
          isNow: i === 0
        }))
        currentTemp = hourlyForecast[0]?.temperature ?? null
      }

      // Get historical data (last 7 days)
      const historyStart = currentIndex - (7 * 24)
      if (historyStart >= 0) {
        historicalData = hourlyData.slice(historyStart, currentIndex + 1).map((h: any) => ({
          timestamp: h.timestamp,
          temperature: h.temperature
        }))

        // Calculate stats from historical data
        const temps = historicalData.map(h => h.temperature)
        minTemp = Math.min(...temps)
        maxTemp = Math.max(...temps)
        avgTemp = Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
      }

      lastUpdated = now
      renderChart()

      console.log(`🌤️ Real weather data fetched at ${now.toLocaleTimeString()}`)

    } catch (error) {
      console.error('Failed to fetch weather:', error)
      apiError = error instanceof Error ? error.message : 'Failed to fetch weather data'
    } finally {
      isLoading = false
    }
  }

  // ============ Polling Control ============

  function startPolling() {
    if (isPolling) return
    isPolling = true
    pollInterval = setInterval(fetchWeatherData, pollFrequency)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    isPolling = false
  }

  function togglePolling() {
    if (isPolling) {
      stopPolling()
    } else {
      startPolling()
    }
  }

  function updatePollFrequency() {
    if (isPolling) {
      stopPolling()
      startPolling()
    }
  }

  // ============ Chart Rendering ============

  function renderChart() {
    if (!chartContainer || historicalData.length === 0) return

    try {
      const chart = Plot.plot({
        marks: [
          Plot.lineY(historicalData, {
            x: 'timestamp',
            y: 'temperature',
            stroke: CITY.color,
            strokeWidth: 1.5,
            curve: 'catmull-rom'
          }),
          Plot.areaY(historicalData, {
            x: 'timestamp',
            y: 'temperature',
            fill: CITY.color,
            fillOpacity: 0.08,
            curve: 'catmull-rom'
          }),
          // Interactive tooltip with dark theme
          Plot.tip(historicalData, Plot.pointerX({
            x: 'timestamp',
            y: 'temperature',
            fill: '#1F2937',
            stroke: '#374151',
            textPadding: 8,
            title: (d: any) => `${formatDateTime(d.timestamp)}\n${d.temperature.toFixed(1)}°C`
          })),
          Plot.ruleY([0], { stroke: '#374151', strokeDasharray: '4,4' })
        ],
        marginLeft: 45,
        marginRight: 20,
        marginTop: 20,
        marginBottom: 40,
        width: chartContainer.clientWidth,
        height: 320,
        style: { background: 'transparent', color: '#9CA3AF', fontSize: '11px' },
        x: {
          label: null,
          type: 'time',
          grid: true,
          tickFormat: (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
        },
        y: {
          label: '°C',
          grid: true,
          tickFormat: (d: number) => d.toFixed(0)
        }
      })

      chartContainer.innerHTML = ''
      chartContainer.appendChild(chart)
    } catch (e) {
      console.error('Failed to render chart:', e)
    }
  }

  function formatDateTime(d: Date): string {
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:00`
  }

  function getWeatherIcon(temp: number): string {
    if (temp > 10) return '⛅'
    if (temp > 0) return '🌥️'
    return '❄️'
  }

  // Resize observer
  $effect(() => {
    if (chartContainer && historicalData.length > 0) {
      const observer = new ResizeObserver(() => renderChart())
      observer.observe(chartContainer)
      return () => observer.disconnect()
    }
  })
</script>

<div class="weather-demo">
  <header class="demo-header">
    <div class="header-content">
      <h1>🌡️ Beijing Weather</h1>
      <p class="subtitle">Real-time data from Open-Meteo API</p>
    </div>
    <div class="status-panel">
      <div class="poll-status">
        <span class="status-dot" class:active={isPolling} class:loading={isLoading}></span>
        <span>{isLoading ? 'Loading...' : isPolling ? 'Auto-updating' : 'Paused'}</span>
      </div>
      {#if lastUpdated}
        <div class="last-updated">
          Updated: {lastUpdated.toLocaleTimeString()}
        </div>
      {/if}
      {#if apiError}
        <div class="api-error">⚠️ {apiError}</div>
      {/if}
    </div>
  </header>

  <div class="controls-panel">
    <div class="control-row">
      <div class="control-group">
        <button class="btn btn-primary" onclick={fetchWeatherData} disabled={isLoading}>
          {isLoading ? '⏳ Loading...' : '🔄 Refresh Now'}
        </button>
        <button class="btn" class:btn-accent={isPolling} class:btn-secondary={!isPolling} onclick={togglePolling}>
          {isPolling ? '⏸ Stop Auto-update' : '▶ Start Auto-update'}
        </button>
      </div>

      <div class="frequency-control">
        <label>Poll interval:</label>
        <select bind:value={pollFrequency} onchange={updatePollFrequency}>
          <option value={2000}>2s</option>
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
          <option value={30000}>30s</option>
          <option value={60000}>1min</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Current Weather Overview -->
  <section class="current-weather">
    <div class="weather-card">
      <div class="weather-main">
        <span class="weather-icon">{getWeatherIcon(currentTemp ?? CITY.baseTemp)}</span>
        <div class="current-temp">
          <span class="temp-value">{currentTemp !== null ? currentTemp.toFixed(1) : '--'}</span>
          <span class="temp-unit">°C</span>
        </div>
        <span class="city-name">Beijing</span>
      </div>
      <div class="weather-stats">
        <div class="stat">
          <span class="stat-label">Min</span>
          <span class="stat-value cold">{minTemp !== null ? minTemp.toFixed(1) : '--'}°C</span>
        </div>
        <div class="stat">
          <span class="stat-label">Avg</span>
          <span class="stat-value">{avgTemp !== null ? avgTemp.toFixed(1) : '--'}°C</span>
        </div>
        <div class="stat">
          <span class="stat-label">Max</span>
          <span class="stat-value warm">{maxTemp !== null ? maxTemp.toFixed(1) : '--'}°C</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Hourly Forecast -->
  <section class="hourly-section">
    <h2>🕐 24-Hour Forecast</h2>
    <div class="hourly-scroll">
      <div class="hourly-cards">
        {#each hourlyForecast as hour}
          <div class="hourly-card" class:now={hour.isNow}>
            <div class="hour-time">{hour.isNow ? 'Now' : hour.time}</div>
            <div class="hour-icon">{getWeatherIcon(hour.temperature)}</div>
            <div class="hour-temp">{hour.temperature.toFixed(1)}°C</div>
            <div class="hour-details">
              <span>💨 {hour.windSpeed}km/h</span>
              <span>💧 {hour.humidity}%</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Historical Chart -->
  <section class="chart-section">
    <h2>📈 Temperature History</h2>
    <p class="chart-hint">Hover to see temperature at each point</p>
    <div class="chart-wrapper">
      <div bind:this={chartContainer} class="chart-container"></div>
    </div>
  </section>
</div>

<style>
  .weather-demo {
    padding: 1.5rem;
    max-width: 1100px;
    margin: 0 auto;
  }

  .demo-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }

  .header-content h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #F3F4F6;
    margin: 0 0 0.25rem 0;
  }

  .subtitle {
    color: #9CA3AF;
    font-size: 0.875rem;
    margin: 0;
  }

  .status-panel {
    text-align: right;
  }

  .poll-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
    font-size: 0.875rem;
    color: #D1D5DB;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6B7280;
  }

  .status-dot.active {
    background: #10B981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    animation: pulse 1.5s infinite;
  }

  .status-dot.loading {
    background: #F59E0B;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
    animation: pulse 0.5s infinite;
  }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

  .api-error {
    font-size: 0.75rem;
    color: #F87171;
    margin-top: 0.25rem;
  }

  .last-updated {
    font-size: 0.75rem;
    color: #6B7280;
    margin-top: 0.25rem;
  }

  .controls-panel {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .control-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .control-group { display: flex; gap: 0.75rem; }

  .frequency-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .frequency-control label {
    font-size: 0.8rem;
    color: #9CA3AF;
  }

  .frequency-control select {
    padding: 0.4rem 0.75rem;
    background: #374151;
    border: 1px solid #4B5563;
    border-radius: 0.25rem;
    color: #F3F4F6;
    font-size: 0.8rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary { background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; }
  .btn-accent { background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); color: white; }
  .btn-secondary { background: #374151; color: #F3F4F6; }

  /* Current Weather */
  .current-weather {
    margin-bottom: 1.5rem;
  }

  .weather-card {
    background: linear-gradient(135deg, #1F2937 0%, #111827 100%);
    border: 1px solid #374151;
    border-radius: 0.75rem;
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .weather-main {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .weather-icon { font-size: 3rem; }

  .current-temp {
    display: flex;
    align-items: flex-start;
  }

  .current-temp .temp-value {
    font-size: 3rem;
    font-weight: 700;
    color: #F3F4F6;
    font-family: 'JetBrains Mono', monospace;
    line-height: 1;
  }

  .current-temp .temp-unit {
    font-size: 1.5rem;
    color: #9CA3AF;
    margin-top: 0.25rem;
  }

  .city-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: #9CA3AF;
  }

  .weather-stats {
    display: flex;
    gap: 2rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.7rem;
    color: #6B7280;
    text-transform: uppercase;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #F3F4F6;
    font-family: 'JetBrains Mono', monospace;
  }

  .stat-value.cold { color: #60A5FA; }
  .stat-value.warm { color: #F87171; }

  /* Hourly Forecast */
  .hourly-section {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .hourly-section h2 {
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
    margin: 0 0 1rem 0;
  }

  .hourly-scroll { overflow-x: auto; }
  .hourly-cards { display: flex; gap: 0.5rem; }

  .hourly-card {
    background: #111827;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    padding: 0.75rem;
    min-width: 80px;
    text-align: center;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .hourly-card:hover {
    transform: translateY(-2px);
    border-color: #4B5563;
  }

  .hourly-card.now {
    background: linear-gradient(180deg, #1E40AF 0%, #1F2937 100%);
    border-color: #3B82F6;
  }

  .hour-time {
    font-size: 0.75rem;
    color: #9CA3AF;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .hourly-card.now .hour-time {
    color: #60A5FA;
    font-weight: 700;
  }

  .hour-icon { font-size: 1.25rem; margin-bottom: 0.25rem; }

  .hour-temp {
    font-size: 1rem;
    font-weight: 700;
    color: #F3F4F6;
    font-family: 'JetBrains Mono', monospace;
    margin-bottom: 0.5rem;
  }

  .hour-details {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    font-size: 0.6rem;
    color: #6B7280;
  }

  /* Chart Section */
  .chart-section {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .chart-section h2 {
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
    margin: 0 0 0.25rem 0;
  }

  .chart-hint {
    font-size: 0.75rem;
    color: #6B7280;
    margin: 0 0 1rem 0;
  }

  .chart-wrapper { min-height: 350px; }
  .chart-container { width: 100%; }

  :global(.chart-container svg) { background: transparent !important; }
  :global(.chart-container text) { fill: #9CA3AF !important; }
  :global(.chart-container [aria-label="tip"] text) { fill: #F3F4F6 !important; }
  :global(.chart-container [aria-label="tip"]) { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }

  @media (max-width: 768px) {
    .weather-demo { padding: 1rem; }
    .demo-header { flex-direction: column; gap: 1rem; }
    .weather-card { flex-direction: column; gap: 1rem; }
    .weather-stats { justify-content: center; }
    .control-row { flex-direction: column; }
  }
</style>
