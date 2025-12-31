<script lang="ts">
  import { databaseStore } from '@app/stores/database.svelte'
  import { queryWorkspaceStore } from '@app/stores/query-workspace.svelte'
  import ConnectionSelector from '@/components/connections/ConnectionSelector.svelte'
  import ColumnStatsPopover from './ColumnStatsPopover.svelte'
  import { createSchemaAnalyzer, type IQueryExecutor } from '@core/database'
  import type { ColumnSchema, TableSchema } from '@/types/schema'
  import { getTypeCategory, getTypeIcon, formatRowCount as formatRowCountUtil } from '@/types/schema'

  // Create schema analyzer using databaseStore as query executor
  const queryExecutor: IQueryExecutor = {
    query: (sql: string) => databaseStore.executeQuery(sql),
    listTables: () => databaseStore.listTables()
  }
  const schemaAnalyzer = createSchemaAnalyzer(queryExecutor)

  let tables = $state<string[]>([])
  let expandedTable = $state<string | null>(null)
  let tableSchemas = $state<Record<string, TableSchema>>({})
  let tableRowCounts = $state<Record<string, number>>({})
  let isLoading = $state(false)
  let searchQuery = $state('')
  let hoveredColumn = $state<{ table: string; column: string } | null>(null)
  let columnStatsLoading = $state<string | null>(null)

  // Import functionality
  let fileInput: HTMLInputElement
  let dragOver = $state(false)
  let isUploading = $state(false)
  let uploadError = $state<string | null>(null)

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

  // Reload when dataSources change (after file upload)
  $effect(() => {
    const sources = databaseStore.state.dataSources
    if (sources.length > 0) {
      loadTables()
    }
  })

  async function loadTables() {
    isLoading = true
    try {
      tables = await databaseStore.listTables()
      // Load row counts for each table
      for (const table of tables) {
        try {
          const result = await databaseStore.executeQuery(`SELECT COUNT(*) as cnt FROM ${table}`)
          if (result.data && result.data[0]) {
            tableRowCounts = { ...tableRowCounts, [table]: Number(result.data[0].cnt) }
          }
        } catch {
          // Ignore count errors
        }
      }
    } catch (e) {
      console.error('Failed to load tables:', e)
    } finally {
      isLoading = false
    }
  }

  // File upload functions
  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      await uploadFiles(target.files)
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault()
    dragOver = false
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      await uploadFiles(event.dataTransfer.files)
    }
  }

  async function uploadFiles(files: FileList) {
    uploadError = null
    isUploading = true

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (!['csv', 'parquet', 'json'].includes(extension || '')) {
        uploadError = `Unsupported file type: ${file.name}`
        continue
      }

      try {
        await databaseStore.loadFile(file)
        console.log(`File uploaded: ${file.name}`)
      } catch (error) {
        uploadError = error instanceof Error ? error.message : 'Upload failed'
        console.error('Upload error:', error)
      }
    }

    isUploading = false
    // Refresh tables after upload
    await loadTables()
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    dragOver = true
  }

  function handleDragLeave() {
    dragOver = false
  }

  function openFileDialog() {
    fileInput?.click()
  }

  async function removeTable(tableName: string, e: MouseEvent) {
    e.stopPropagation()
    if (confirm(`Remove table "${tableName}"?`)) {
      await databaseStore.removeDataSource(tableName)
      // Remove from local state
      tables = tables.filter(t => t !== tableName)
      delete tableSchemas[tableName]
      delete tableRowCounts[tableName]
      if (expandedTable === tableName) {
        expandedTable = null
      }
    }
  }

  function formatRowCount(count: number | undefined): string {
    if (count === undefined) return ''
    return formatRowCountUtil(count) + ' rows'
  }

  async function toggleTable(tableName: string) {
    if (expandedTable === tableName) {
      expandedTable = null
      return
    }

    expandedTable = tableName

    // Load enhanced schema with stats if not cached
    if (!tableSchemas[tableName]) {
      try {
        const schema = await schemaAnalyzer.getTableSchema(tableName, {
          includeStats: true,
          sampleSize: 10000,
          detectForeignKeys: true,
          includeTopValues: true,
          topValuesCount: 3
        })
        tableSchemas = { ...tableSchemas, [tableName]: schema }
        tableRowCounts = { ...tableRowCounts, [tableName]: schema.rowCount }
      } catch (e) {
        console.error('Failed to load schema:', e)
        // Fallback to basic schema
        try {
          const basicSchema = await databaseStore.getTableSchema(tableName)
          const columns: ColumnSchema[] = basicSchema.map((row: any) => ({
            name: row.column_name || row.name,
            type: row.column_type || row.type,
            typeCategory: getTypeCategory(row.column_type || row.type),
            nullable: row.null !== 'NO',
            isPrimaryKey: false,
            isForeignKey: false
          }))
          tableSchemas = { ...tableSchemas, [tableName]: {
            name: tableName,
            rowCount: tableRowCounts[tableName] || 0,
            columns,
            primaryKey: [],
            foreignKeys: []
          }}
        } catch {
          // Ignore fallback errors
        }
      }
    }
  }

  async function loadColumnStats(tableName: string, column: ColumnSchema) {
    if (column.stats) return // Already loaded

    const key = `${tableName}:${column.name}`
    if (columnStatsLoading === key) return

    columnStatsLoading = key
    try {
      const stats = await schemaAnalyzer.getColumnStats(
        tableName,
        column.name,
        column.type,
        tableSchemas[tableName]?.rowCount || 0
      )
      // Update the column stats in the cached schema
      const schema = tableSchemas[tableName]
      if (schema) {
        const updatedColumns = schema.columns.map(c =>
          c.name === column.name ? { ...c, stats } : c
        )
        tableSchemas = { ...tableSchemas, [tableName]: { ...schema, columns: updatedColumns } }
      }
    } catch (e) {
      console.error('Failed to load column stats:', e)
    } finally {
      columnStatsLoading = null
    }
  }

  function handleColumnHover(tableName: string, column: ColumnSchema) {
    hoveredColumn = { table: tableName, column: column.name }
    // Load stats on hover if not already loaded
    if (!column.stats) {
      loadColumnStats(tableName, column)
    }
  }

  function handleColumnLeave() {
    hoveredColumn = null
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

  function previewTable(tableName: string, e: MouseEvent) {
    e.stopPropagation()
    const sql = `SELECT * FROM ${tableName} LIMIT 100;`
    queryWorkspaceStore.createTab(sql)
  }

  function getColumnTypeIcon(column: ColumnSchema): string {
    return getTypeIcon(column.typeCategory)
  }

  function getColumnBadges(column: ColumnSchema): string[] {
    const badges: string[] = []
    if (column.isPrimaryKey) badges.push('PK')
    if (column.isForeignKey) badges.push('FK')
    if (column.stats?.isUnique && !column.isPrimaryKey) badges.push('UQ')
    return badges
  }

  function getColumnTooltip(column: ColumnSchema): string {
    const parts = [column.type]
    if (column.isPrimaryKey) parts.push('Primary Key')
    if (column.isForeignKey && column.foreignKeyRef) {
      parts.push(`→ ${column.foreignKeyRef.refTable}.${column.foreignKeyRef.refColumn}`)
    }
    if (column.stats) {
      parts.push(`${column.stats.distinctCount} distinct`)
      if (column.stats.nullPercent > 0) {
        parts.push(`${column.stats.nullPercent.toFixed(1)}% null`)
      }
    }
    return parts.join(' | ')
  }

  // Handle connection change - refresh tables
  function handleConnectionChange() {
    loadTables()
  }
</script>

<div class="data-explorer">
  <!-- Connection Selector -->
  <div class="connection-section">
    <ConnectionSelector onConnectionChange={handleConnectionChange} />
  </div>

  <!-- Import Section -->
  <div class="import-section">
    <div
      class="drop-zone"
      class:drag-over={dragOver}
      class:uploading={isUploading}
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      onclick={openFileDialog}
      onkeydown={(e) => e.key === 'Enter' && openFileDialog()}
      role="button"
      tabindex="0"
    >
      {#if isUploading}
        <span class="upload-status">Uploading...</span>
      {:else}
        <span class="drop-icon">+</span>
        <span class="drop-text">Import Data</span>
      {/if}
    </div>
    <div class="file-hint">CSV, Parquet, JSON</div>

    <input
      bind:this={fileInput}
      type="file"
      accept=".csv,.parquet,.json"
      multiple
      onchange={handleFileSelect}
      style="display: none;"
    />

    {#if uploadError}
      <div class="upload-error">{uploadError}</div>
    {/if}
  </div>

  <div class="explorer-header">
    <h3>Tables {tables.length > 0 ? `(${tables.length})` : ''}</h3>
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
              <span class="table-info">
                <span class="table-name">{table}</span>
                {#if tableRowCounts[table] !== undefined}
                  <span class="row-count">{formatRowCount(tableRowCounts[table])}</span>
                {/if}
              </span>
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
                title="Preview data (SELECT * LIMIT 100)"
              >
                👁
              </button>
              <button
                class="btn-action btn-danger"
                onclick={(e) => removeTable(table, e)}
                title="Remove table"
              >
                ×
              </button>
            </div>
          </div>

          {#if expandedTable === table && tableSchemas[table]}
            <div class="columns-list">
              {#each tableSchemas[table].columns as column}
                {@const badges = getColumnBadges(column)}
                {@const isHovered = hoveredColumn?.table === table && hoveredColumn?.column === column.name}
                <div
                  class="column-item-wrapper"
                  role="group"
                  onmouseenter={() => handleColumnHover(table, column)}
                  onmouseleave={handleColumnLeave}
                >
                  <button
                    class="column-item"
                    class:has-fk={column.isForeignKey}
                    class:has-pk={column.isPrimaryKey}
                    onclick={(e) => insertColumnName(column.name, e)}
                    title={getColumnTooltip(column)}
                  >
                    <span class="type-icon" data-type={column.typeCategory}>
                      {getColumnTypeIcon(column)}
                    </span>
                    <span class="column-name">{column.name}</span>
                    {#if badges.length > 0}
                      <span class="column-badges">
                        {#each badges as badge}
                          <span class="badge" class:pk={badge === 'PK'} class:fk={badge === 'FK'} class:uq={badge === 'UQ'}>{badge}</span>
                        {/each}
                      </span>
                    {/if}
                    <span class="column-type">{column.type}</span>
                  </button>

                  {#if isHovered}
                    <div class="stats-popover-container">
                      <ColumnStatsPopover
                        stats={column.stats}
                        columnType={column.type}
                        typeCategory={column.typeCategory}
                      />
                    </div>
                  {/if}
                </div>
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

  /* Connection Section */
  .connection-section {
    padding: 0.75rem;
    border-bottom: 1px solid #1F2937;
  }

  /* Import Section */
  .import-section {
    padding: 0.75rem;
    border-bottom: 1px solid #1F2937;
  }

  .drop-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #1F2937;
    border: 1px dashed #374151;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .drop-zone:hover {
    border-color: #4285F4;
    background: rgba(66, 133, 244, 0.1);
  }

  .drop-zone.drag-over {
    border-color: #4285F4;
    background: rgba(66, 133, 244, 0.15);
    border-style: solid;
  }

  .drop-zone.uploading {
    opacity: 0.7;
    cursor: wait;
  }

  .drop-icon {
    font-size: 1rem;
    font-weight: 600;
    color: #4285F4;
  }

  .drop-text {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #E5E7EB;
  }

  .upload-status {
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .file-hint {
    margin-top: 0.375rem;
    text-align: center;
    font-size: 0.6875rem;
    color: #6B7280;
  }

  .upload-error {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    font-size: 0.75rem;
    color: #FCA5A5;
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

  .table-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
    overflow: hidden;
  }

  .table-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .row-count {
    font-size: 0.625rem;
    color: #6B7280;
    font-weight: 400;
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

  .btn-action.btn-danger:hover {
    background: #DC2626;
    color: white;
  }

  .columns-list {
    padding: 0.25rem 0 0.5rem 1.5rem;
  }

  .column-item-wrapper {
    position: relative;
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

  .column-item.has-pk {
    border-left: 2px solid #F59E0B;
    padding-left: calc(0.75rem - 2px);
  }

  .column-item.has-fk {
    border-left: 2px solid #8B5CF6;
    padding-left: calc(0.75rem - 2px);
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

  .column-badges {
    display: flex;
    gap: 0.125rem;
    flex-shrink: 0;
  }

  .column-badges .badge {
    padding: 0.0625rem 0.25rem;
    border-radius: 3px;
    font-size: 0.5625rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .column-badges .badge.pk {
    background: rgba(245, 158, 11, 0.2);
    color: #FBBF24;
  }

  .column-badges .badge.fk {
    background: rgba(139, 92, 246, 0.2);
    color: #A78BFA;
  }

  .column-badges .badge.uq {
    background: rgba(16, 185, 129, 0.2);
    color: #6EE7B7;
  }

  .column-type {
    font-size: 0.6875rem;
    color: #6B7280;
    font-family: 'JetBrains Mono', monospace;
    flex-shrink: 0;
  }

  .stats-popover-container {
    position: absolute;
    left: 100%;
    top: 0;
    margin-left: 0.5rem;
    z-index: 100;
  }
</style>
