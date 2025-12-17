<script lang="ts">
  import type { QueryResult } from '@/types/database'

  interface Props {
    result: QueryResult
  }

  let { result }: Props = $props()

  // State
  let sortColumn = $state<string | null>(null)
  let sortDirection = $state<'asc' | 'desc'>('asc')
  let searchQuery = $state('')
  let currentPage = $state(1)
  let pageSize = $state(50)

  // Filtered and sorted data
  const filteredData = $derived(() => {
    let data = [...result.data]

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      data = data.filter(row =>
        result.columns.some(col =>
          String(row[col] ?? '').toLowerCase().includes(query)
        )
      )
    }

    // Sort
    if (sortColumn) {
      data.sort((a, b) => {
        const aVal = a[sortColumn!]
        const bVal = b[sortColumn!]

        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        let cmp = 0
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal
        } else {
          cmp = String(aVal).localeCompare(String(bVal))
        }

        return sortDirection === 'asc' ? cmp : -cmp
      })
    }

    return data
  })

  // Paginated data
  const paginatedData = $derived(() => {
    const data = filteredData()
    const start = (currentPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  })

  const totalPages = $derived(Math.ceil(filteredData().length / pageSize))

  function toggleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      sortColumn = column
      sortDirection = 'asc'
    }
  }

  function exportCSV() {
    const data = filteredData()
    const headers = result.columns.join(',')
    const rows = data.map(row =>
      result.columns.map(col => {
        const val = row[col]
        if (val === null || val === undefined) return ''
        const str = String(val)
        // Escape quotes and wrap in quotes if contains comma
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
    const data = filteredData()
    const json = JSON.stringify(data, null, 2)

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyToClipboard() {
    const data = filteredData()
    const headers = result.columns.join('\t')
    const rows = data.map(row =>
      result.columns.map(col => String(row[col] ?? '')).join('\t')
    )
    const text = [headers, ...rows].join('\n')
    navigator.clipboard.writeText(text)
  }
</script>

<div class="results-table">
  <div class="results-header">
    <div class="results-info">
      <span class="row-count">{filteredData().length} rows</span>
      <span class="exec-time">{result.executionTime.toFixed(2)}ms</span>
    </div>

    <div class="results-actions">
      <input
        type="text"
        class="search-input"
        placeholder="Filter results..."
        bind:value={searchQuery}
      />

      <button class="btn-export" onclick={copyToClipboard} title="Copy to clipboard">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>

      <button class="btn-export" onclick={exportCSV} title="Export CSV">
        CSV
      </button>

      <button class="btn-export" onclick={exportJSON} title="Export JSON">
        JSON
      </button>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th class="row-number">#</th>
          {#each result.columns as column}
            <th
              class:sorted={sortColumn === column}
              onclick={() => toggleSort(column)}
            >
              <span class="column-name">{column}</span>
              {#if sortColumn === column}
                <span class="sort-indicator">
                  {sortDirection === 'asc' ? '▲' : '▼'}
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
            {#each result.columns as column}
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

  {#if totalPages > 1}
    <div class="pagination">
      <button
        class="btn-page"
        onclick={() => currentPage = 1}
        disabled={currentPage === 1}
      >
        ««
      </button>
      <button
        class="btn-page"
        onclick={() => currentPage--}
        disabled={currentPage === 1}
      >
        «
      </button>

      <span class="page-info">
        Page {currentPage} of {totalPages}
      </span>

      <button
        class="btn-page"
        onclick={() => currentPage++}
        disabled={currentPage === totalPages}
      >
        »
      </button>
      <button
        class="btn-page"
        onclick={() => currentPage = totalPages}
        disabled={currentPage === totalPages}
      >
        »»
      </button>

      <select class="page-size" bind:value={pageSize} onchange={() => currentPage = 1}>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value={500}>500</option>
      </select>
    </div>
  {/if}
</div>

<style>
  .results-table {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #111827;
  }

  .results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #1F2937;
    gap: 1rem;
  }

  .results-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .row-count {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #E5E7EB;
  }

  .exec-time {
    padding: 0.25rem 0.5rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 9999px;
    font-size: 0.6875rem;
    color: #4ADE80;
  }

  .results-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .search-input {
    padding: 0.375rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #F3F4F6;
    font-size: 0.8125rem;
    width: 12rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #4285F4;
  }

  .search-input::placeholder {
    color: #6B7280;
  }

  .btn-export {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.375rem 0.625rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-export:hover {
    background: #374151;
    color: #F3F4F6;
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

  .btn-page {
    padding: 0.375rem 0.625rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-page:hover:not(:disabled) {
    background: #374151;
    color: #F3F4F6;
  }

  .btn-page:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    padding: 0 1rem;
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .page-size {
    padding: 0.375rem 0.5rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #E5E7EB;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .page-size:focus {
    outline: none;
    border-color: #4285F4;
  }
</style>
