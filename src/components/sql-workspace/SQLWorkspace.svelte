<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { databaseStore } from '@app/stores/database.svelte'
  import { queryWorkspaceStore } from '@app/stores/query-workspace.svelte'
  import { snippetStore } from '@app/stores/snippet.svelte'
  import DataExplorer from './DataExplorer.svelte'
  import QueryTabs from './QueryTabs.svelte'
  import QueryToolbar from './QueryToolbar.svelte'
  import { ResultsPanel } from './results'
  import MonacoEditor from '../MonacoEditor.svelte'
  import type { SQLCompletionProvider } from './sql-completion'
  import type { SnippetCompletionProvider } from './snippet-completion'

  let editorRef = $state<MonacoEditor | null>(null)

  // SQL Completion Provider using database store
  const sqlCompletionProvider: SQLCompletionProvider = {
    getTables: async () => {
      try {
        return await databaseStore.listTables()
      } catch {
        return []
      }
    },
    getTableSchema: async (tableName: string) => {
      try {
        return await databaseStore.getTableSchema(tableName)
      } catch {
        return []
      }
    }
  }

  // Snippet Completion Provider using snippet store
  const snippetCompletionProvider: SnippetCompletionProvider = {
    getSnippets: () => snippetStore.allSnippets,
    recordUsage: (id: string) => snippetStore.recordUsage(id)
  }

  // Execute the current query
  async function executeQuery() {
    const activeTab = queryWorkspaceStore.activeTab
    if (!activeTab || !databaseStore.state.initialized) return

    const sql = activeTab.sql.trim()
    if (!sql) return

    queryWorkspaceStore.setTabExecuting(activeTab.id, true)

    try {
      const result = await databaseStore.executeQuery(sql)
      queryWorkspaceStore.setTabResult(activeTab.id, result)
      queryWorkspaceStore.addToHistory(sql, result, true)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Query failed'
      queryWorkspaceStore.setTabResult(activeTab.id, null, errorMsg)
      queryWorkspaceStore.addToHistory(sql, null, false)
    }
  }

  // Execute selected text only
  async function executeSelection() {
    const selection = editorRef?.getSelection()
    if (!selection?.trim()) {
      // No selection, execute all
      executeQuery()
      return
    }

    const activeTab = queryWorkspaceStore.activeTab
    if (!activeTab || !databaseStore.state.initialized) return

    queryWorkspaceStore.setTabExecuting(activeTab.id, true)

    try {
      const result = await databaseStore.executeQuery(selection)
      queryWorkspaceStore.setTabResult(activeTab.id, result)
      queryWorkspaceStore.addToHistory(selection, result, true)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Query failed'
      queryWorkspaceStore.setTabResult(activeTab.id, null, errorMsg)
      queryWorkspaceStore.addToHistory(selection, null, false)
    }
  }

  // Handle SQL change from editor
  function handleSqlChange(value: string) {
    const activeTab = queryWorkspaceStore.activeTab
    if (activeTab) {
      queryWorkspaceStore.updateTabSql(activeTab.id, value)
    }
  }

  // Handle insert text event from DataExplorer
  function handleInsertText(e: CustomEvent<{ text: string }>) {
    if (editorRef) {
      const current = editorRef.getValue()
      const text = e.detail.text
      // Simple insert at end for now
      editorRef.setValue(current + (current.endsWith('\n') ? '' : '\n') + text)
    }
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const modKey = isMac ? e.metaKey : e.ctrlKey

    if (modKey && e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        executeSelection()
      } else {
        executeQuery()
      }
    }

    if (modKey && e.key === 't') {
      e.preventDefault()
      queryWorkspaceStore.createTab()
    }

    if (modKey && e.key === 'w') {
      e.preventDefault()
      const activeTab = queryWorkspaceStore.activeTab
      if (activeTab) {
        queryWorkspaceStore.closeTab(activeTab.id)
      }
    }
  }

  // Handle get-current-sql event for Add to Report feature
  function handleGetCurrentSQL(e: CustomEvent<{ sql: string }>) {
    const activeTab = queryWorkspaceStore.activeTab
    if (activeTab) {
      e.detail.sql = activeTab.sql
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('insert-sql-text', handleInsertText as EventListener)
    window.addEventListener('get-current-sql', handleGetCurrentSQL as EventListener)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('insert-sql-text', handleInsertText as EventListener)
    window.removeEventListener('get-current-sql', handleGetCurrentSQL as EventListener)
  })
</script>

<div class="sql-workspace">
  <!-- Data Explorer Sidebar -->
  <aside
    class="workspace-sidebar"
    class:collapsed={queryWorkspaceStore.state.sidebarCollapsed}
  >
    {#if !queryWorkspaceStore.state.sidebarCollapsed}
      <DataExplorer />
    {/if}

    <button
      class="sidebar-toggle"
      onclick={() => queryWorkspaceStore.toggleSidebar()}
      title={queryWorkspaceStore.state.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {queryWorkspaceStore.state.sidebarCollapsed ? '»' : '«'}
    </button>
  </aside>

  <!-- Main Content -->
  <div class="workspace-main">
    <!-- Tabs -->
    <QueryTabs />

    <!-- Editor & Results -->
    <div class="workspace-content">
      <!-- Query Panel -->
      <div class="query-panel">
        <QueryToolbar
          onRun={executeQuery}
          onRunSelection={executeSelection}
          isExecuting={queryWorkspaceStore.activeTab?.isExecuting || false}
        />

        <div class="editor-container">
          {#if queryWorkspaceStore.activeTab}
            {#key queryWorkspaceStore.activeTab.id}
              <MonacoEditor
                bind:this={editorRef}
                value={queryWorkspaceStore.activeTab.sql}
                language="sql"
                height="100%"
                onChange={handleSqlChange}
                {sqlCompletionProvider}
                {snippetCompletionProvider}
              />
            {/key}
          {/if}
        </div>
      </div>

      <!-- Results Panel -->
      <div class="results-panel">
        {#if queryWorkspaceStore.activeTab?.isExecuting}
          <div class="results-loading">
            <div class="spinner"></div>
            <span>Executing query...</span>
          </div>
        {:else if queryWorkspaceStore.activeTab?.error}
          <div class="results-error">
            <div class="error-icon">✕</div>
            <div class="error-title">Query Error</div>
            <div class="error-message">{queryWorkspaceStore.activeTab.error}</div>
          </div>
        {:else if queryWorkspaceStore.activeTab?.result}
          <ResultsPanel result={queryWorkspaceStore.activeTab.result} />
        {:else}
          <div class="results-empty">
            <div class="empty-icon">📊</div>
            <div class="empty-title">No Results</div>
            <div class="empty-hint">
              Run a query to see results here<br/>
              <span class="shortcut">⌘+Enter</span> to execute
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .sql-workspace {
    display: flex;
    height: 100%;
    background: #030712;
  }

  .workspace-sidebar {
    position: relative;
    width: 16rem;
    flex-shrink: 0;
    transition: width 0.2s ease;
  }

  .workspace-sidebar.collapsed {
    width: 1.5rem;
  }

  .sidebar-toggle {
    position: absolute;
    right: -0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.5rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    z-index: 10;
    transition: all 0.15s;
  }

  .sidebar-toggle:hover {
    background: #374151;
    color: #F3F4F6;
  }

  .workspace-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .workspace-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .query-panel {
    display: flex;
    flex-direction: column;
    height: 40%;
    min-height: 200px;
    border-bottom: 1px solid #1F2937;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
  }

  .results-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 200px;
  }

  .results-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: #9CA3AF;
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #374151;
    border-top-color: #4285F4;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .results-error {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
  }

  .error-icon {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 50%;
    color: #EF4444;
    font-size: 1.5rem;
  }

  .error-title {
    font-size: 1rem;
    font-weight: 600;
    color: #EF4444;
  }

  .error-message {
    max-width: 40rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    color: #FCA5A5;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    text-align: center;
    word-break: break-word;
  }

  .results-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #6B7280;
  }

  .empty-icon {
    font-size: 2.5rem;
    opacity: 0.3;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 500;
    color: #9CA3AF;
  }

  .empty-hint {
    font-size: 0.8125rem;
    text-align: center;
    line-height: 1.6;
  }

  .shortcut {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: #9CA3AF;
  }
</style>
