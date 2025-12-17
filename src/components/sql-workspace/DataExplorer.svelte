<script lang="ts">
  import { databaseStore } from '@app/stores/database.svelte'
  import { queryWorkspaceStore } from '@app/stores/query-workspace.svelte'

  interface TableColumn {
    column_name: string
    column_type: string
    null?: string
    key?: string
    default?: string
    extra?: string
  }

  let tables = $state<string[]>([])
  let expandedTable = $state<string | null>(null)
  let tableSchemas = $state<Record<string, TableColumn[]>>({})
  let isLoading = $state(false)
  let searchQuery = $state('')

  // Filtered tables based on search
  const filteredTables = $derived(
    searchQuery
      ? tables.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : tables
  )

  // Load tables on mount and when database changes
  $effect(() => {
    if (databaseStore.state.initialized) {
      loadTables()
    }
  })

  async function loadTables() {
    isLoading = true
    try {
      tables = await databaseStore.listTables()
    } catch (e) {
      console.error('Failed to load tables:', e)
    } finally {
      isLoading = false
    }
  }

  async function toggleTable(tableName: string) {
    if (expandedTable === tableName) {
      expandedTable = null
      return
    }

    expandedTable = tableName

    // Load schema if not cached
    if (!tableSchemas[tableName]) {
      try {
        const schema = await databaseStore.getTableSchema(tableName)
        tableSchemas = { ...tableSchemas, [tableName]: schema }
      } catch (e) {
        console.error('Failed to load schema:', e)
      }
    }
  }

  function insertTableName(tableName: string, e: MouseEvent) {
    e.stopPropagation()
    const activeTab = queryWorkspaceStore.activeTab
    if (activeTab) {
      // Dispatch event for editor to handle
      window.dispatchEvent(new CustomEvent('insert-sql-text', {
        detail: { text: tableName }
      }))
    }
  }

  function insertColumnName(columnName: string, e: MouseEvent) {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('insert-sql-text', {
      detail: { text: columnName }
    }))
  }

  function getColumnName(col: TableColumn): string {
    return col.column_name || (col as any).name || 'unknown'
  }

  function getColumnType(col: TableColumn): string {
    return col.column_type || (col as any).type || 'unknown'
  }

  function previewTable(tableName: string, e: MouseEvent) {
    e.stopPropagation()
    const sql = `SELECT * FROM ${tableName} LIMIT 100;`
    queryWorkspaceStore.createTab(sql)
  }

  function getTypeIcon(type: string | undefined): string {
    if (!type) return '?'
    const t = type.toLowerCase()
    if (t.includes('int') || t.includes('float') || t.includes('double') || t.includes('decimal') || t.includes('bigint')) {
      return '#'
    }
    if (t.includes('varchar') || t.includes('text') || t.includes('char') || t.includes('string')) {
      return 'T'
    }
    if (t.includes('date') || t.includes('time') || t.includes('timestamp')) {
      return 'D'
    }
    if (t.includes('bool')) {
      return 'B'
    }
    return '?'
  }
</script>

<div class="data-explorer">
  <div class="explorer-header">
    <h3>Tables</h3>
    <button class="btn-refresh" onclick={loadTables} title="Refresh">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    </button>
  </div>

  <div class="search-box">
    <input
      type="text"
      placeholder="Search tables..."
      bind:value={searchQuery}
    />
  </div>

  <div class="tables-list">
    {#if isLoading}
      <div class="loading">Loading tables...</div>
    {:else if filteredTables.length === 0}
      <div class="empty">
        {searchQuery ? 'No tables match your search' : 'No tables loaded'}
      </div>
    {:else}
      {#each filteredTables as table}
        <div class="table-item" class:expanded={expandedTable === table}>
          <div class="table-header">
            <button class="table-toggle" onclick={() => toggleTable(table)}>
              <span class="expand-icon">{expandedTable === table ? '▼' : '▶'}</span>
              <span class="table-icon">📊</span>
              <span class="table-name">{table}</span>
            </button>
            <div class="table-actions">
              <button
                class="btn-action"
                onclick={(e) => insertTableName(table, e)}
                title="Insert table name"
              >
                +
              </button>
              <button
                class="btn-action"
                onclick={(e) => previewTable(table, e)}
                title="Preview data"
              >
                👁
              </button>
            </div>
          </div>

          {#if expandedTable === table && tableSchemas[table]}
            <div class="columns-list">
              {#each tableSchemas[table] as column}
                {@const colName = getColumnName(column)}
                {@const colType = getColumnType(column)}
                <button
                  class="column-item"
                  onclick={(e) => insertColumnName(colName, e)}
                  title={`${colType} - Click to insert`}
                >
                  <span class="type-icon" data-type={colType}>
                    {getTypeIcon(colType)}
                  </span>
                  <span class="column-name">{colName}</span>
                  <span class="column-type">{colType}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .data-explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #111827;
    border-right: 1px solid #1F2937;
  }

  .explorer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #1F2937;
  }

  .explorer-header h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9CA3AF;
  }

  .btn-refresh {
    padding: 0.25rem;
    background: none;
    border: none;
    color: #6B7280;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .btn-refresh:hover {
    color: #F3F4F6;
    background: #1F2937;
  }

  .search-box {
    padding: 0.5rem;
    border-bottom: 1px solid #1F2937;
  }

  .search-box input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #F3F4F6;
    font-size: 0.8125rem;
  }

  .search-box input:focus {
    outline: none;
    border-color: #4285F4;
  }

  .search-box input::placeholder {
    color: #6B7280;
  }

  .tables-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  }

  .loading, .empty {
    padding: 1rem;
    text-align: center;
    color: #6B7280;
    font-size: 0.8125rem;
  }

  .table-item {
    border-bottom: 1px solid transparent;
  }

  .table-item.expanded {
    background: rgba(66, 133, 244, 0.05);
    border-bottom-color: #1F2937;
  }

  .table-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem 0 0;
    transition: background 0.15s;
  }

  .table-header:hover {
    background: #1F2937;
  }

  .table-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    background: none;
    border: none;
    color: #E5E7EB;
    font-size: 0.8125rem;
    cursor: pointer;
    text-align: left;
  }

  .expand-icon {
    font-size: 0.625rem;
    color: #6B7280;
    width: 0.75rem;
  }

  .table-icon {
    font-size: 0.875rem;
  }

  .table-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .table-actions {
    display: none;
    gap: 0.25rem;
  }

  .table-header:hover .table-actions {
    display: flex;
  }

  .btn-action {
    padding: 0.125rem 0.375rem;
    background: #374151;
    border: none;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-action:hover {
    background: #4285F4;
    color: white;
  }

  .columns-list {
    padding: 0.25rem 0 0.5rem 1.5rem;
  }

  .column-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: none;
    border: none;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    transition: all 0.15s;
  }

  .column-item:hover {
    background: #1F2937;
    color: #F3F4F6;
  }

  .type-icon {
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #374151;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    color: #9CA3AF;
  }

  .column-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .column-type {
    font-size: 0.6875rem;
    color: #6B7280;
    font-family: 'JetBrains Mono', monospace;
  }
</style>
