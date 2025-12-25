<script lang="ts">
  /**
   * ChartWrapper Component
   *
   * Wraps report plugins for SQL Workspace usage:
   * - Adds interactive configuration panel
   * - Handles data transformation
   * - Provides export functionality
   * - Ensures consistent UX across all chart types
   */

  import type { Component } from 'svelte'
  import type { QueryResult } from '@/types/database'
  import type { ChartAdapter, ChartComponentInfo } from './chart-types'

  interface Props {
    /**
     * Query result to visualize
     */
    result: QueryResult

    /**
     * Chart component metadata
     */
    chartInfo: ChartComponentInfo

    /**
     * User configuration
     */
    config: any

    /**
     * Configuration change handler
     */
    onConfigChange: (config: any) => void

    /**
     * Optional: Custom configuration panel
     */
    configPanel?: Component
  }

  let {
    result,
    chartInfo,
    config,
    onConfigChange,
    configPanel
  }: Props = $props()

  // Transform data using adapter
  const chartData = $derived.by(() => {
    return chartInfo.adapter.transform(result, config)
  })

  // Lazily load component
  let ChartComponent = $state<Component | null>(null)
  let isLoading = $state(true)
  let loadError = $state<string | null>(null)

  $effect(() => {
    isLoading = true
    loadError = null

    chartInfo.load()
      .then(module => {
        ChartComponent = module.default
        isLoading = false
      })
      .catch(err => {
        console.error(`Failed to load ${chartInfo.type}:`, err)
        loadError = `Failed to load chart: ${err.message}`
        isLoading = false
      })
  })

  // Export functionality
  function exportSVG() {
    // Implementation depends on chart component API
    console.log('Export SVG', chartInfo.type, chartData)
  }

  function exportPNG() {
    console.log('Export PNG', chartInfo.type, chartData)
  }

  // Auto-suggest config on mount
  $effect(() => {
    if (!config.xColumn && chartInfo.adapter.suggestConfig) {
      const suggested = chartInfo.adapter.suggestConfig(result)
      onConfigChange({ ...config, ...suggested })
    }
  })
</script>

<div class="chart-wrapper">
  <!-- Configuration Panel (left sidebar) -->
  {#if configPanel}
    <aside class="chart-config">
      <svelte:component this={configPanel} {config} {onConfigChange} />
    </aside>
  {/if}

  <!-- Chart Preview (main area) -->
  <div class="chart-preview">
    {#if isLoading}
      <div class="chart-loading">
        <div class="spinner"></div>
        <span>Loading {chartInfo.label}...</span>
      </div>
    {:else if loadError}
      <div class="chart-error">
        <span class="icon">⚠️</span>
        <span class="message">{loadError}</span>
      </div>
    {:else if !chartData}
      <div class="chart-placeholder">
        <span class="icon">{chartInfo.icon}</span>
        <span class="text">Invalid data for {chartInfo.label}</span>
      </div>
    {:else if ChartComponent}
      <div class="chart-container">
        <svelte:component this={ChartComponent} data={chartData} />
      </div>

      <!-- Export Toolbar -->
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
    {/if}
  </div>
</div>

<style>
  .chart-wrapper {
    display: flex;
    height: 100%;
    background: #111827;
  }

  .chart-config {
    width: 220px;
    flex-shrink: 0;
    padding: 0.75rem;
    background: #0F172A;
    border-right: 1px solid #1F2937;
    overflow-y: auto;
  }

  .chart-preview {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow: auto;
  }

  .chart-loading,
  .chart-error,
  .chart-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: #6B7280;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #1F2937;
    border-top-color: #4285F4;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .chart-error .icon {
    font-size: 2.5rem;
  }

  .chart-error .message {
    font-size: 0.875rem;
    color: #EF4444;
  }

  .chart-placeholder .icon {
    font-size: 2.5rem;
    opacity: 0.4;
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
</style>
