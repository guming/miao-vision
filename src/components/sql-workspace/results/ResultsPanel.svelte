<script lang="ts">
  /**
   * ResultsPanel Component
   *
   * Main container for query results with tabbed views (Table/Charts).
   * Integrates: Table, Chart, Column Selector, Statistics, Export.
   */

  import type { QueryResult } from '@/types/database'
  import type {
    ResultsViewMode,
    ColumnVisibility,
    SortConfig,
    FilterConfig,
    ResultsChartConfig,
    ColumnStatistics
  } from './types'
  import { calculateAllColumnStats } from './types'
  import { formatExecutionTime } from '@/plugins/data-display/shared/formatter'
  import ColumnSelector from './ColumnSelector.svelte'
  import ColumnStats from './ColumnStats.svelte'
  import ResultsChart from './ResultsChart.svelte'
  import QuickInsights from './QuickInsights.svelte'

  interface Props {
    result: QueryResult
  }

  let { result }: Props = $props()

  // State
  let viewMode = $state<ResultsViewMode>('table')
  let columnVisibility = $state<ColumnVisibility[]>([])
  let sort = $state<SortConfig>({ column: null, direction: 'asc' })
  let filter = $state<FilterConfig>({ searchQuery: '', columnFilters: {} })
  let currentPage = $state(1)
  let pageSize = $state(50)
  let statsModalOpen = $state(false)
  let insightsModalOpen = $state(false)
  let chartConfig = $state<ResultsChartConfig>({
    type: 'bar',
    xColumn: null,
    yColumns: [],
    aggregation: 'sum'
  })

  // P0.1: Lazy loading for chart - mount component in next tick
  let chartMounted = $state(false)

  // Lazy mount chart when switching to chart view
  $effect(() => {
    if (viewMode === 'chart') {
      // Delay mounting to next tick to unblock tab switch
      const timeoutId = setTimeout(() => {
        chartMounted = true
      }, 0)
      return () => clearTimeout(timeoutId)
    } else {
      // Unmount when switching away
      chartMounted = false
    }
  })

  // Initialize column visibility when result changes
  $effect(() => {
    if (result) {
      columnVisibility = result.columns.map(col => ({
        name: col,
        visible: true,
        type: undefined // Will be inferred
      }))
      currentPage = 1
      sort = { column: null, direction: 'asc' }
      filter = { searchQuery: '', columnFilters: {} }
    }
  })

  // Visible columns
  const visibleColumns = $derived(
    columnVisibility.filter(c => c.visible).map(c => c.name)
  )

  // Filtered and sorted data
  const processedData = $derived(() => {
    let data = [...result.data]

    // Filter by search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase()
      data = data.filter(row =>
        visibleColumns.some(col =>
          String(row[col] ?? '').toLowerCase().includes(query)
        )
      )
    }

    // Sort
    if (sort.column) {
      data.sort((a, b) => {
        const aVal = a[sort.column!]
        const bVal = b[sort.column!]

        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        let cmp = 0
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal
        } else {
          cmp = String(aVal).localeCompare(String(bVal))
        }

        return sort.direction === 'asc' ? cmp : -cmp
      })
    }

    return data
  })

  // Paginated data
  const paginatedData = $derived(() => {
    const data = processedData()
    const start = (currentPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  })

  const totalPages = $derived(Math.ceil(processedData().length / pageSize))

  // Column statistics (computed on demand)
  let columnStats = $state<ColumnStatistics[]>([])

  function openStats() {
    columnStats = calculateAllColumnStats(result)
    statsModalOpen = true
  }

  function toggleSort(column: string) {
    if (sort.column === column) {
      sort.direction = sort.direction === 'asc' ? 'desc' : 'asc'
    } else {
      sort.column = column
      sort.direction = 'asc'
    }
  }

  function exportCSV() {
    const data = processedData()
    const headers = visibleColumns.join(',')
    const rows = data.map(row =>
      visibleColumns.map(col => {
        const val = row[col]
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    )
    const csv = [headers, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportJSON() {
    const data = processedData()
    const filtered = data.map(row => {
      const obj: Record<string, unknown> = {}
      visibleColumns.forEach(col => { obj[col] = row[col] })
      return obj
    })
    const json = JSON.stringify(filtered, null, 2)

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyToClipboard() {
    const data = processedData()
    const headers = visibleColumns.join('\t')
    const rows = data.map(row =>
      visibleColumns.map(col => String(row[col] ?? '')).join('\t')
    )
    const text = [headers, ...rows].join('\n')
    navigator.clipboard.writeText(text)
  }

  // Add to Report functionality
  let addToReportOpen = $state(false)
  let reportCopied = $state(false)

  interface ReportTemplate {
    id: string
    name: string
    description: string
    generator: () => string
  }

  // Get current SQL from the workspace (passed via event)
  function getCurrentSQL(): string {
    // Try to get SQL from the query workspace store via window event
    const event = new CustomEvent('get-current-sql', { detail: { sql: '' } })
    window.dispatchEvent(event)
    return event.detail.sql || '-- SQL query here'
  }

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'sql-only',
      name: 'SQL Query Block',
      description: 'Insert SQL code that executes and displays results',
      generator: () => {
        const sql = getCurrentSQL()
        return `\`\`\`sql\n${sql}\n\`\`\``
      }
    },
    {
      id: 'sql-with-datatable',
      name: 'SQL with DataTable',
      description: 'SQL query with interactive data table display',
      generator: () => {
        const sql = getCurrentSQL()
        return `\`\`\`sql id=my_query\n${sql}\n\`\`\`\n\n<DataTable data={my_query} />`
      }
    },
    {
      id: 'sql-with-chart',
      name: 'SQL with Chart',
      description: 'SQL query with bar chart visualization',
      generator: () => {
        const sql = getCurrentSQL()
        const xCol = visibleColumns[0] || 'x'
        const yCol = visibleColumns.find(c => {
          const sample = result.data[0]?.[c]
          return typeof sample === 'number'
        }) || visibleColumns[1] || 'y'
        return `\`\`\`sql id=chart_data\n${sql}\n\`\`\`\n\n\`\`\`chart\ntype: bar\ndata: chart_data\nx: ${xCol}\ny: ${yCol}\n\`\`\``
      }
    }
  ]

  function copyReportTemplate(template: ReportTemplate) {
    const markdown = template.generator()
    navigator.clipboard.writeText(markdown)
    reportCopied = true
    setTimeout(() => {
      reportCopied = false
      addToReportOpen = false
    }, 1500)
  }
</script>

<div class="results-panel">
  <!-- Tabs: Table | Charts -->
  <div class="results-tabs">
    <div class="tabs-left">
      <button
        class="tab"
        class:active={viewMode === 'table'}
        onclick={() => viewMode = 'table'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 3v18"/>
        </svg>
        Table
      </button>
      <button
        class="tab"
        class:active={viewMode === 'chart'}
        onclick={() => viewMode = 'chart'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
        Charts
      </button>
    </div>

    <div class="tabs-right">
      <!-- Search -->
      <div class="search-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search all columns..."
          bind:value={filter.searchQuery}
        />
        {#if filter.searchQuery}
          <button class="clear-btn" onclick={() => filter.searchQuery = ''}>×</button>
        {/if}
      </div>

      <span class="result-meta">
        <span class="row-count">{processedData().length.toLocaleString()} rows</span>
        <span class="meta-divider">•</span>
        <span class="col-count">{result.columns.length} cols</span>
        <span class="meta-divider">•</span>
        <span class="exec-time">{formatExecutionTime(result.executionTime)}</span>
      </span>

      <button class="tool-btn" onclick={openStats} title="Column Statistics">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
        Stats
      </button>

      <button class="tool-btn insights-btn" onclick={() => insightsModalOpen = true} title="Quick Insights">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        Insights
      </button>

      <ColumnSelector
        columns={columnVisibility}
        onChange={(cols) => columnVisibility = cols}
      />

      <div class="export-dropdown">
        <button class="tool-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export
        </button>
        <div class="export-menu">
          <button onclick={copyToClipboard}>Copy to Clipboard</button>
          <button onclick={exportCSV}>Export CSV</button>
          <button onclick={exportJSON}>Export JSON</button>
        </div>
      </div>

      <div class="add-to-report-dropdown">
        <button
          class="tool-btn report-btn"
          onclick={() => addToReportOpen = !addToReportOpen}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <path d="M14 2v6h6M12 18v-6M9 15h6"/>
          </svg>
          Add to Report
        </button>
        {#if addToReportOpen}
          <div class="report-menu">
            <div class="report-menu-header">
              <span>Add to Report</span>
              <button class="close-menu" onclick={() => addToReportOpen = false}>×</button>
            </div>
            {#if reportCopied}
              <div class="copy-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Copied to clipboard!
              </div>
            {:else}
              {#each reportTemplates as template}
                <button class="template-btn" onclick={() => copyReportTemplate(template)}>
                  <span class="template-name">{template.name}</span>
                  <span class="template-desc">{template.description}</span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="results-content">
    {#if viewMode === 'table'}
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="row-number">#</th>
              {#each visibleColumns as column}
                <th
                  class:sorted={sort.column === column}
                  onclick={() => toggleSort(column)}
                >
                  <span class="column-name">{column}</span>
                  {#if sort.column === column}
                    <span class="sort-indicator">
                      {sort.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  {/if}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each paginatedData() as row, i}
              <tr>
                <td class="row-number">{(currentPage - 1) * pageSize + i + 1}</td>
                {#each visibleColumns as column}
                  <td class:null={row[column] === null || row[column] === undefined}>
                    {#if row[column] === null || row[column] === undefined}
                      <span class="null-value">NULL</span>
                    {:else if typeof row[column] === 'object'}
                      {JSON.stringify(row[column])}
                    {:else}
                      {row[column]}
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="pagination">
          <button
            class="page-btn"
            onclick={() => currentPage = 1}
            disabled={currentPage === 1}
          >««</button>
          <button
            class="page-btn"
            onclick={() => currentPage--}
            disabled={currentPage === 1}
          >«</button>

          <span class="page-info">Page {currentPage} of {totalPages}</span>

          <button
            class="page-btn"
            onclick={() => currentPage++}
            disabled={currentPage === totalPages}
          >»</button>
          <button
            class="page-btn"
            onclick={() => currentPage = totalPages}
            disabled={currentPage === totalPages}
          >»»</button>

          <select bind:value={pageSize} onchange={() => currentPage = 1}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
        </div>
      {/if}
    {:else if viewMode === 'chart'}
      {#if chartMounted}
        <ResultsChart
          {result}
          config={chartConfig}
          onConfigChange={(c) => chartConfig = c}
        />
      {:else}
        <div class="chart-loading-placeholder">
          <div class="spinner"></div>
          <p>Loading chart...</p>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Column Statistics Modal -->
  <ColumnStats
    stats={columnStats}
    totalRows={result.rowCount}
    isOpen={statsModalOpen}
    onClose={() => statsModalOpen = false}
  />

  <!-- Quick Insights Modal -->
  <QuickInsights
    {result}
    isOpen={insightsModalOpen}
    onClose={() => insightsModalOpen = false}
  />
</div>

<style>
  .results-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #111827;
  }

  .results-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: #0F172A;
    border-bottom: 1px solid #1F2937;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .tabs-left {
    display: flex;
    gap: 0.25rem;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #9CA3AF;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab:hover {
    background: #1F2937;
    color: #E5E7EB;
  }

  .tab.active {
    background: #1F2937;
    color: #F3F4F6;
    font-weight: 500;
  }

  .tabs-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    width: 10rem;
  }

  .search-box svg {
    color: #6B7280;
    flex-shrink: 0;
  }

  .search-box input {
    flex: 1;
    background: none;
    border: none;
    color: #F3F4F6;
    font-size: 0.75rem;
    outline: none;
    min-width: 0;
  }

  .search-box input::placeholder {
    color: #6B7280;
  }

  .clear-btn {
    padding: 0;
    background: none;
    border: none;
    color: #6B7280;
    font-size: 1rem;
    cursor: pointer;
    line-height: 1;
  }

  .clear-btn:hover {
    color: #F3F4F6;
  }

  .result-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.625rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 4px;
    font-size: 0.6875rem;
    white-space: nowrap;
  }

  .row-count {
    color: #4ADE80;
    font-weight: 500;
  }

  .col-count {
    color: #9CA3AF;
  }

  .exec-time {
    color: #FBBF24;
    font-family: 'JetBrains Mono', monospace;
  }

  .meta-divider {
    color: #4B5563;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #E5E7EB;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tool-btn:hover {
    background: #374151;
    border-color: #4B5563;
  }

  .tool-btn.insights-btn {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
    color: #A78BFA;
  }

  .tool-btn.insights-btn:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.5);
  }

  .export-dropdown {
    position: relative;
  }

  .export-menu {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 50;
    overflow: hidden;
  }

  .export-dropdown:hover .export-menu {
    display: block;
  }

  .export-menu button {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    color: #E5E7EB;
    font-size: 0.75rem;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
  }

  .export-menu button:hover {
    background: #374151;
  }

  .add-to-report-dropdown {
    position: relative;
  }

  .tool-btn.report-btn {
    background: rgba(66, 133, 244, 0.1);
    border-color: rgba(66, 133, 244, 0.3);
    color: #93C5FD;
  }

  .tool-btn.report-btn:hover {
    background: rgba(66, 133, 244, 0.2);
    border-color: rgba(66, 133, 244, 0.5);
  }

  .report-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    width: 16rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 100;
    overflow: hidden;
  }

  .report-menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid #374151;
    font-size: 0.75rem;
    font-weight: 600;
    color: #E5E7EB;
  }

  .close-menu {
    padding: 0.125rem;
    background: none;
    border: none;
    color: #6B7280;
    font-size: 1rem;
    cursor: pointer;
    line-height: 1;
  }

  .close-menu:hover {
    color: #F3F4F6;
  }

  .template-btn {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
  }

  .template-btn:hover {
    background: #374151;
  }

  .template-btn:not(:last-child) {
    border-bottom: 1px solid #374151;
  }

  .template-name {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #F3F4F6;
  }

  .template-desc {
    font-size: 0.6875rem;
    color: #6B7280;
    line-height: 1.4;
  }

  .copy-success {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    color: #4ADE80;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .results-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .table-container {
    flex: 1;
    overflow: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
  }

  th, td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #1F2937;
    white-space: nowrap;
    max-width: 20rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  th {
    background: #0F172A;
    color: #9CA3AF;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: sticky;
    top: 0;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
  }

  th:hover {
    background: #1F2937;
    color: #F3F4F6;
  }

  th.sorted {
    color: #4285F4;
  }

  .column-name {
    margin-right: 0.5rem;
  }

  .sort-indicator {
    font-size: 0.625rem;
  }

  .row-number {
    width: 3rem;
    color: #6B7280;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6875rem;
  }

  td {
    color: #E5E7EB;
    font-family: 'JetBrains Mono', monospace;
  }

  td.null {
    background: rgba(107, 114, 128, 0.1);
  }

  .null-value {
    color: #6B7280;
    font-style: italic;
  }

  tbody tr:hover {
    background: rgba(66, 133, 244, 0.05);
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-top: 1px solid #1F2937;
    background: #0F172A;
  }

  .page-btn {
    padding: 0.375rem 0.625rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .page-btn:hover:not(:disabled) {
    background: #374151;
    color: #F3F4F6;
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    padding: 0 1rem;
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .pagination select {
    padding: 0.375rem 0.5rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #E5E7EB;
    font-size: 0.75rem;
  }

  /* P0.1: Lazy loading placeholder */
  .chart-loading-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 400px;
    gap: 1rem;
    color: #9CA3AF;
  }

  .chart-loading-placeholder .spinner {
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

  .chart-loading-placeholder p {
    font-size: 0.875rem;
  }
</style>
