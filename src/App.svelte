<script lang="ts">
  import { onMount } from 'svelte'
  import FileUploader from './components/FileUploader.svelte'
  import QueryRunner from './components/QueryRunner.svelte'
  import ChartConfigPanel from './components/ChartConfigPanel.svelte'
  import VgplotChart from './components/VgplotChart.svelte'
  import MarkdownEditor from './components/MarkdownEditor.svelte'
  import ReportToolbar from './components/ReportToolbar.svelte'
  import ReportRenderer from './components/ReportRenderer.svelte'
  import { databaseStore } from '@app/stores/database.svelte'
  import { chartStore } from '@app/stores/chart.svelte'
  import { reportStore } from '@app/stores/report.svelte'
  import { getInputStore } from '@app/stores/report-inputs'
  import type { InputStore } from '@app/stores/report-inputs'
  import { initializeMosaic } from '@core/database'
  import { reportExecutionService } from '@core/engine/report-execution.service'
  import type { ChartConfig } from './types/chart'
  import type { QueryResult } from './types/database'
  import type { Report } from './types/report'

  // Svelte 5 Runes mode
  let appTitle = $state('Miao Vision')
  let subtitle = $state('Local-First Analytics')
  let activeTab = $state<'upload' | 'query' | 'visualize' | 'report'>('upload')
  let lastQueryResult = $state<QueryResult | null>(null)
  let currentChartConfig = $state<ChartConfig | null>(null)

  // Report tab state
  let markdownEditor = $state<MarkdownEditor | null>(null)
  let isExecutingReport = $state(false)
  let currentInputStore = $state<InputStore | null>(null)

  onMount(async () => {
    // Initialize database on mount
    try {
      await databaseStore.initialize()
      await initializeMosaic()
      console.log('Application initialized')

      // CRITICAL: Clear all block statuses on page load
      // DuckDB is in-memory, so tables don't persist across page refreshes
      // But localStorage saves block statuses, causing stale references
      if (reportStore.state.currentReport && reportStore.state.currentReport.blocks) {
        console.log('🧹 Clearing block statuses on app initialization...')
        reportStore.state.currentReport.blocks.forEach(block => {
          delete block.status
          delete block.chartConfig
          delete block.sqlResult
        })
        // Trigger reactivity
        reportStore.state.currentReport = { ...reportStore.state.currentReport }
        console.log('✅ Block statuses cleared - charts will show placeholder until Execute')
      }

      // Debug: Expose stores to window for debugging
      if (typeof window !== 'undefined') {
        (window as any).__DEBUG__ = {
          reportStore,
          databaseStore,
          chartStore
        }
        console.log('🔧 Debug tools available: window.__DEBUG__')
      }
    } catch (error) {
      console.error('Failed to initialize application:', error)
    }
  })

  function setTab(tab: 'upload' | 'query' | 'visualize' | 'report') {
    activeTab = tab
  }

  async function handleQueryResult(result: QueryResult) {
    lastQueryResult = result
    console.log('Query result received:', result)
  }

  async function handleCreateChart() {
    if (!lastQueryResult) {
      alert('Please run a query first!')
      return
    }

    try {
      await chartStore.loadQueryResult(lastQueryResult)
      setTab('visualize')
    } catch (error) {
      console.error('Failed to prepare chart:', error)
      alert('Failed to prepare chart data')
    }
  }

  function handleGenerateChart(config: ChartConfig) {
    currentChartConfig = config
    console.log('Generating chart with config:', config)
  }

  // Report tab handlers
  function handleReportContentChange(content: string, reportId: string) {
    console.log('📝 handleReportContentChange called with reportId:', reportId)
    console.log('  current report id:', reportStore.state.currentReport?.id)
    reportStore.updateContent(content, reportId)
  }

  async function handleExecuteReport() {
    console.log('🚀 Execute button clicked!')

    if (!reportStore.state.currentReport) {
      console.error('No report to execute')
      alert('No report to execute')
      return
    }

    isExecutingReport = true

    try {
      const report = reportStore.state.currentReport

      // Get or create input store for this report
      const inputStore = getInputStore(report.id)
      currentInputStore = inputStore

      // Execute the report using the service
      const result = await reportExecutionService.executeReport(
        report,
        inputStore,
        (progress) => {
          reportStore.updateProgress(progress)
        },
        (updatedReport) => {
          // Update report state to trigger reactivity
          reportStore.state.currentReport = updatedReport
        }
      )

      if (result.success) {
        console.log('✅ Report executed successfully')

        // Store table mapping in report store
        if (result.tableMapping) {
          reportStore.state.tableMapping = result.tableMapping
        }

        // Save the updated report
        reportStore.saveReports()
      } else {
        console.error('❌ Report execution had errors:', result.errors)
        alert(`Report execution completed with ${result.failedBlocks} error(s)`)
      }
    } catch (error) {
      console.error('💥 Failed to execute report:', error)
      alert(`Failed to execute report: ${error instanceof Error ? error.message : error}`)
    } finally {
      isExecutingReport = false
    }
  }

  function handleSaveReport() {
    reportStore.saveReports()
    console.log('Report saved')
  }

  function handleSelectReport(report: Report) {
    console.log('Selected report:', report.id)

    // Note: loadReport() is called BEFORE this function by ReportList
    // So currentReport is already set to the new (cloned) report

    // Get input store for the selected report
    currentInputStore = getInputStore(report.id)

    // CRITICAL: Reset all block statuses and clear chartConfigs on the CURRENT report
    // (which was already cloned by loadReport)
    // This prevents rendering charts with stale data when tables don't exist
    // (DuckDB is in-memory, so tables are cleared on page refresh)
    const currentReport = reportStore.state.currentReport
    if (currentReport && currentReport.blocks && currentReport.blocks.length > 0) {
      currentReport.blocks.forEach(block => {
        block.status = 'pending'
        delete block.chartConfig
        delete block.sqlResult
      })
      console.log('🧹 Cleared block statuses and configs (tables may not exist)')
    }

    // Clear execution state for this report (force fresh execution)
    reportExecutionService.clearExecutionState(report.id)

    console.log('🔄 Switched to new report - reactive execution disabled until first Execute')
  }

  // Debug: Log when currentReport changes (for debugging editor issues)
  $effect(() => {
    const report = reportStore.state.currentReport
    console.log('🟢 App.svelte $effect: currentReport changed')
    console.log('  report id:', report?.id || '(none)')
    console.log('  report name:', report?.name || '(none)')
    console.log('  report content length:', report?.content?.length || 0)
    console.log('  report content preview:', report?.content?.substring(0, 100) || '(empty)')
  })

  // Reactive execution: Re-execute affected SQL blocks when inputs change
  $effect(() => {
    if (!currentInputStore || !reportStore.state.currentReport) return

    console.log('🔄 Setting up reactive execution for report:', reportStore.state.currentReport.id)

    // Setup reactive execution using the service
    const unsubscribe = reportExecutionService.setupReactiveExecution(
      reportStore.state.currentReport,
      currentInputStore,
      (updatedReport) => {
        // Update report state to trigger reactivity
        reportStore.state.currentReport = updatedReport
      }
    )

    return () => {
      unsubscribe()
    }
  })
</script>

<main>
  <!-- Sidebar Navigation -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1 class="sidebar-logo">{appTitle}</h1>
      <p class="sidebar-subtitle">{subtitle}</p>
    </div>

    <nav class="sidebar-nav">
      <button
        class="nav-item"
        class:active={activeTab === 'upload'}
        onclick={() => setTab('upload')}
      >
        <span class="nav-label">Upload</span>
      </button>
      <button
        class="nav-item"
        class:active={activeTab === 'query'}
        onclick={() => setTab('query')}
        disabled={!databaseStore.state.initialized}
      >
        <span class="nav-label">Query</span>
      </button>
      <button
        class="nav-item"
        class:active={activeTab === 'visualize'}
        onclick={() => setTab('visualize')}
        disabled={!databaseStore.state.initialized}
      >
        <span class="nav-label">Visualize</span>
      </button>

      <div class="nav-section">
        <div class="nav-section-header">
          <span class="nav-section-title">Reports</span>
          <button
            class="btn-new-report"
            onclick={() => {
              const name = prompt('Enter report name:')
              if (name) {
                const report = reportStore.createReport(name)
                // createReport already sets currentReport, just need to set up handlers
                handleSelectReport(report)
                setTab('report')
              }
            }}
            disabled={!databaseStore.state.initialized}
            title="New Report"
          >
            +
          </button>
        </div>

        <div class="report-list">
          {#each reportStore.state.reports as report}
            <button
              class="report-item"
              class:active={activeTab === 'report' && reportStore.state.currentReport?.id === report.id}
              onclick={() => {
                // IMPORTANT: Must call loadReport first to clone the report
                reportStore.loadReport(report.id)
                handleSelectReport(report)
                setTab('report')
              }}
            >
              <span class="report-name">{report.name}</span>
              <span
                class="btn-delete-report"
                onclick={(e) => {
                  e.stopPropagation()
                  if (confirm('Delete this report?')) {
                    reportStore.deleteReport(report.id)
                  }
                }}
                role="button"
                tabindex="0"
                title="Delete"
              >
                ×
              </span>
            </button>
          {/each}
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      {#if databaseStore.state.loading}
        <span class="status-badge loading">Loading</span>
      {:else if databaseStore.state.initialized}
        <span class="status-badge ready">Ready</span>
      {:else}
        <span class="status-badge error">Error</span>
      {/if}
    </div>
  </aside>

  <!-- Main Content Area -->
  <div class="main-wrapper">
    <header class="top-header">
      <h2 class="page-title">
        {#if activeTab === 'upload'}Upload Data
        {:else if activeTab === 'query'}SQL Query
        {:else if activeTab === 'visualize'}Data Visualization
        {:else if activeTab === 'report'}Markdown Reports
        {/if}
      </h2>
    </header>

    <div class="content" class:content-report={activeTab === 'report'}>
      {#if databaseStore.state.error}
        <div class="error-banner">
          <strong>Error:</strong> {databaseStore.state.error}
        </div>
      {/if}

      {#if activeTab === 'upload'}
        <div class="page-container">
          <FileUploader />
        </div>
      {:else if activeTab === 'query'}
        <div class="page-container">
          <QueryRunner onQueryResult={handleQueryResult} />

          {#if lastQueryResult && lastQueryResult.rowCount > 0}
            <div class="chart-action">
              <button class="btn-create-chart" onclick={handleCreateChart}>
                Create Chart from Result
              </button>
            </div>
          {/if}
        </div>
      {:else if activeTab === 'visualize'}
        <div class="page-container visualize-layout">

        {#if chartStore.isReady()}
          <div class="viz-container">
            <aside class="config-sidebar">
              <ChartConfigPanel
                availableColumns={chartStore.state.availableColumns}
                availableTables={chartStore.tableName ? [chartStore.tableName] : []}
                onGenerate={handleGenerateChart}
              />
            </aside>

            <div class="chart-display">
              {#if currentChartConfig}
                <VgplotChart config={currentChartConfig} />
              {:else}
                <div class="empty-state">
                  <p>👈 Configure your chart and click "Generate Chart"</p>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="empty-state-large">
            <div class="icon">📊</div>
            <h3>No Data Available</h3>
            <p>Run a SQL query first, then click "Create Chart" to visualize your data.</p>
            <button class="btn-nav" onclick={() => setTab('query')}>
              Go to Query →
            </button>
          </div>
        {/if}
      </div>
      {:else if activeTab === 'report'}
        <div class="page-container report-layout">
          <div class="report-container">
            {#if reportStore.state.currentReport}
              <ReportToolbar
                bind:editor={markdownEditor}
                onExecute={handleExecuteReport}
                onSave={handleSaveReport}
                isExecuting={isExecutingReport}
              />

              <div class="report-workspace">
                <div class="editor-pane">
                  <div class="pane-header">
                    <h3>📝 Editor</h3>
                  </div>
                  {#key reportStore.state.currentReport.id}
                    <MarkdownEditor
                      bind:this={markdownEditor}
                      value={reportStore.state.currentReport.content}
                      reportId={reportStore.state.currentReport.id}
                      onChange={handleReportContentChange}
                      height="calc(100vh - 300px)"
                    />
                  {/key}
                </div>

                <div class="preview-pane">
                  <div class="pane-header">
                    <h3>👁️ Preview</h3>
                  </div>
                  <ReportRenderer
                    report={reportStore.state.currentReport}
                    inputStore={currentInputStore}
                    tableMapping={reportStore.state.tableMapping}
                  />
                </div>
              </div>
            {:else}
              <div class="empty-state-large">
                <div class="icon">📝</div>
                <h3>No Report Selected</h3>
                <p>Create a new report or select one from the list to get started.</p>
                <button
                  class="btn-nav"
                  onclick={() => reportStore.createReport('New Report')}
                >
                  Create Report →
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <footer>
      <p>Built with Vite + Svelte 5 + DuckDB-WASM + Mosaic + Monaco Editor</p>
    </footer>
  </div>
</main>

<style>
  /* ========================================
   * Main Layout - Sidebar + Content
   * ======================================== */

  main {
    display: flex;
    min-height: 100vh;
    background-color: #030712;
    margin: 0;
    padding: 0;
  }

  /* ========================================
   * Sidebar Styles
   * ======================================== */

  .sidebar {
    width: 16rem; /* 256px */
    height: 100vh;
    position: fixed;
    left: 0;
    top: 0;
    background-color: #111827;
    border-right: 1px solid #1F2937;
    display: flex;
    flex-direction: column;
    z-index: 40;
  }

  .sidebar-header {
    padding: 2rem 1.5rem 1.5rem;
    border-bottom: 1px solid #1F2937;
  }

  .sidebar-logo {
    margin: 0;
    font-size: 1.375rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    /* Gemini gradient text */
    background: linear-gradient(90deg, #4285F4 0%, #A855F7 50%, #EC4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .sidebar-subtitle {
    margin: 0.5rem 0 0 0;
    color: #6B7280;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .sidebar-nav {
    flex: 1;
    padding: 1.5rem 0;
    overflow-y: auto;
  }

  .nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-left: 3px solid transparent;
    color: #9CA3AF;
    font-size: 0.9375rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .nav-item:hover:not(:disabled) {
    background-color: #1F2937;
    color: #F3F4F6;
    transform: translateX(2px);
  }

  .nav-item:focus-visible {
    outline: 2px solid #4285F4;
    outline-offset: -2px;
  }

  .nav-item.active {
    background-color: rgba(66, 133, 244, 0.1);
    border-left-color: #4285F4;
    color: #F3F4F6;
    font-weight: 600;
  }

  .nav-item:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .nav-label {
    flex: 1;
  }

  /* Nav Section (for Reports) */
  .nav-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #1F2937;
  }

  .nav-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem 0.75rem;
  }

  .nav-section-title {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6B7280;
  }

  .btn-new-report {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.375rem;
    color: #9CA3AF;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-new-report:hover:not(:disabled) {
    background-color: #374151;
    color: #F3F4F6;
    border-color: #4285F4;
    transform: scale(1.05);
  }

  .btn-new-report:focus-visible {
    outline: 2px solid #4285F4;
    outline-offset: 2px;
  }

  .btn-new-report:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .report-list {
    max-height: 300px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #374151 transparent;
  }

  .report-list::-webkit-scrollbar {
    width: 6px;
  }

  .report-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .report-list::-webkit-scrollbar-thumb {
    background-color: #374151;
    border-radius: 3px;
    transition: background-color 0.2s ease;
  }

  .report-list::-webkit-scrollbar-thumb:hover {
    background-color: #4B5563;
  }

  .report-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1.5rem;
    background: none;
    border: none;
    border-left: 3px solid transparent;
    color: #9CA3AF;
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    gap: 0.5rem;
  }

  .report-item:hover:not(.active) {
    background-color: #1F2937;
    color: #F3F4F6;
    transform: translateX(2px);
  }

  .report-item:focus-visible {
    outline: 2px solid #4285F4;
    outline-offset: -2px;
  }

  .report-item.active {
    background-color: rgba(66, 133, 244, 0.1);
    border-left-color: #4285F4;
    color: #F3F4F6;
    font-weight: 600;
  }

  .report-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-delete-report {
    width: 1.25rem;
    height: 1.25rem;
    display: none;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 0.25rem;
    color: #6B7280;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .report-item:hover .btn-delete-report {
    display: flex;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .btn-delete-report:hover {
    background-color: rgba(239, 68, 68, 0.1);
    color: #F87171;
    transform: scale(1.1);
  }

  .btn-delete-report:focus-visible {
    outline: 2px solid #EF4444;
    outline-offset: 2px;
  }

  .sidebar-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #1F2937;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .status-badge.ready {
    background-color: rgba(34, 197, 94, 0.1);
    color: #4ADE80;
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .status-badge.loading {
    background-color: rgba(245, 158, 11, 0.1);
    color: #FBBF24;
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  .status-badge.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  /* ========================================
   * Main Wrapper (Content Area)
   * ======================================== */

  .main-wrapper {
    flex: 1;
    margin-left: 16rem; /* Match sidebar width */
    margin-top: 0;
    margin-bottom: 0;
    margin-right: 0;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .top-header {
    margin: 0;
    padding: 1.5rem 2rem 1rem;
    background-color: #030712;
    border-bottom: 1px solid #1F2937;
  }

  .page-title {
    margin: 0;
    font-size: 1.625rem;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: #F3F4F6;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    background-color: #030712;
  }

  .content-report {
    position: relative;
    overflow: hidden;
  }

  .page-container {
    max-width: 80rem; /* 1280px */
    margin: 0 auto;
    padding: 2rem;
  }

  .error-banner {
    padding: 1rem 1.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    color: #FCA5A5;
    margin-bottom: 1.5rem;
  }

  footer {
    padding: 1.5rem 2rem;
    border-top: 1px solid #1F2937;
    background-color: #030712;
    text-align: center;
    font-size: 0.75rem;
    color: #6B7280;
  }

  footer p {
    margin: 0;
  }

  /* ========================================
   * Buttons
   * ======================================== */

  .btn-create-chart {
    padding: 0.625rem 1.5rem;
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-create-chart:hover {
    background: linear-gradient(135deg, #3B78E7 0%, #7C4FDB 100%);
    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
  }

  .chart-action {
    margin-top: 2rem;
    text-align: center;
  }

  /* ========================================
   * Visualize Layout
   * ======================================== */

  .visualize-layout {
    max-width: none;
  }

  .viz-container {
    display: grid;
    grid-template-columns: 16rem 1fr;
    gap: 1.5rem;
  }

  .config-sidebar {
    /* Styles moved to ChartConfigPanel component */
  }

  .chart-display {
    min-height: 500px;
    background-color: #111827;
    border: 1px solid #374151;
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #6B7280;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  .empty-state-large {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-state-large .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.2;
  }

  .empty-state-large h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .empty-state-large p {
    margin: 0 0 1.5rem 0;
    color: #9CA3AF;
    font-size: 0.875rem;
  }

  .btn-nav {
    padding: 0.625rem 1.5rem;
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-nav:hover {
    background: linear-gradient(135deg, #3B78E7 0%, #7C4FDB 100%);
    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
  }

  /* ========================================
   * Report Layout
   * ======================================== */

  .report-layout {
    max-width: none;
    padding: 0;
    margin: 0;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
  }

  .report-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .report-workspace {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    flex: 1;
    overflow: hidden;
  }

  .editor-pane,
  .preview-pane {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-pane {
    border-right: 1px solid #1F2937;
    background-color: #111827;
  }

  .pane-header {
    padding: 0.75rem 1rem;
    background-color: #0F172A;
    border-bottom: 1px solid #1F2937;
    flex-shrink: 0;
  }

  .pane-header h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .preview-pane {
    overflow-y: auto;
    background-color: #030712;
  }

  /* ========================================
   * Responsive Design
   * ======================================== */

  /* Tablet and below (1024px) */
  @media (max-width: 1024px) {
    .sidebar {
      position: fixed;
      z-index: 50;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .main-wrapper {
      margin-left: 0;
    }

    .top-header {
      padding: 1rem 1.5rem 0.75rem;
    }

    .page-title {
      font-size: 1.375rem;
    }

    .viz-container {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .report-workspace {
      grid-template-columns: 1fr;
    }

    .editor-pane {
      border-right: none;
      border-bottom: 1px solid #1F2937;
      min-height: 400px;
    }

    .preview-pane {
      min-height: 400px;
    }
  }

  /* Mobile (768px) */
  @media (max-width: 768px) {
    .top-header {
      padding: 0.75rem 1rem 0.5rem;
    }

    .page-title {
      font-size: 1.25rem;
    }

    .content-wrapper {
      padding: 1rem;
    }

    .viz-container {
      gap: 1rem;
    }

    .report-workspace {
      gap: 0;
    }

    .editor-pane,
    .preview-pane {
      min-height: 300px;
    }

    /* Reduce padding in cards */
    .evidence-card {
      padding: 1rem;
    }

    /* Stack buttons vertically on mobile */
    .btn-lg {
      width: 100%;
    }
  }

  /* Small Mobile (480px) */
  @media (max-width: 480px) {
    .top-header {
      padding: 0.5rem 0.75rem 0.375rem;
    }

    .page-title {
      font-size: 1.125rem;
    }

    .content-wrapper {
      padding: 0.75rem;
    }

    .sidebar {
      width: 100%;
    }

    .nav-item,
    .report-item {
      padding: 0.625rem 1rem;
    }

    .btn-md {
      width: 100%;
    }
  }
</style>
