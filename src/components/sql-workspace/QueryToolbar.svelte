<script lang="ts">
  import { queryWorkspaceStore } from '@app/stores/query-workspace.svelte'
  import { formatExecutionTime } from '@/plugins/data-display/shared/formatter'

  interface Props {
    onRun: () => void
    onRunSelection: () => void
    onFormat?: () => void
    onOpenSnippets?: () => void
    isExecuting: boolean
  }

  let { onRun, onRunSelection, onFormat, onOpenSnippets, isExecuting }: Props = $props()

  let showHistory = $state(false)

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  function truncateSql(sql: string, maxLength = 60): string {
    const oneLine = sql.replace(/\s+/g, ' ').trim()
    if (oneLine.length <= maxLength) return oneLine
    return oneLine.substring(0, maxLength) + '...'
  }
</script>

<div class="query-toolbar">
  <div class="toolbar-left">
    <button
      class="btn-run"
      onclick={onRun}
      disabled={isExecuting}
      title="Run query (Cmd+Enter)"
    >
      {#if isExecuting}
        <span class="spinner"></span>
        Running...
      {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        Run
      {/if}
    </button>

    <button
      class="btn-secondary"
      onclick={onRunSelection}
      disabled={isExecuting}
      title="Run selection (Cmd+Shift+Enter)"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 3l14 9-14 9V3z"/>
      </svg>
      Selection
    </button>

    {#if onFormat}
      <button
        class="btn-secondary"
        onclick={onFormat}
        title="Format SQL"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10H3M21 6H3M21 14H3M21 18H3"/>
        </svg>
        Format
      </button>
    {/if}
  </div>

  <div class="toolbar-right">
    {#if onOpenSnippets}
      <button
        class="btn-secondary"
        onclick={onOpenSnippets}
        title="SQL Snippets (Cmd+K)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        Snippets
      </button>
    {/if}

    <div class="history-dropdown">
      <button
        class="btn-secondary"
        onclick={() => showHistory = !showHistory}
        title="Query history"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        History
        <span class="badge">{queryWorkspaceStore.state.history.length}</span>
      </button>

      {#if showHistory}
        <div class="history-panel">
          <div class="history-header">
            <span>Recent Queries</span>
            {#if queryWorkspaceStore.state.history.length > 0}
              <button
                class="btn-clear"
                onclick={() => {
                  queryWorkspaceStore.clearHistory()
                  showHistory = false
                }}
              >
                Clear
              </button>
            {/if}
          </div>

          <div class="history-list">
            {#if queryWorkspaceStore.state.history.length === 0}
              <div class="history-empty">No query history yet</div>
            {:else}
              {#each queryWorkspaceStore.state.history as item}
                <button
                  class="history-item"
                  class:success={item.success}
                  class:error={!item.success}
                  onclick={() => {
                    queryWorkspaceStore.loadFromHistory(item.id)
                    showHistory = false
                  }}
                >
                  <div class="history-sql">{truncateSql(item.sql)}</div>
                  <div class="history-meta">
                    <span class="history-time">{formatTime(item.executedAt)}</span>
                    {#if item.success}
                      <span class="history-rows">{item.rowCount} rows</span>
                      <span class="history-duration">{formatExecutionTime(item.executionTime)}</span>
                    {:else}
                      <span class="history-error">Failed</span>
                    {/if}
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Click outside to close history -->
{#if showHistory}
  <div
    class="backdrop"
    role="button"
    tabindex="-1"
    aria-label="Close history"
    onclick={() => showHistory = false}
    onkeydown={(e) => e.key === 'Escape' && (showHistory = false)}
  ></div>
{/if}

<style>
  .query-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: #111827;
    border-bottom: 1px solid #1F2937;
    gap: 1rem;
  }

  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-run {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-run:hover:not(:disabled) {
    background: linear-gradient(135deg, #3B78E7 0%, #7C4FDB 100%);
    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
  }

  .btn-run:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid transparent;
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #E5E7EB;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #374151;
    border-color: #4B5563;
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .badge {
    padding: 0.125rem 0.375rem;
    background: #374151;
    border-radius: 9999px;
    font-size: 0.6875rem;
    color: #9CA3AF;
  }

  .history-dropdown {
    position: relative;
  }

  .history-panel {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    width: 24rem;
    max-height: 20rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    overflow: hidden;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #374151;
    font-size: 0.75rem;
    font-weight: 600;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn-clear {
    padding: 0.25rem 0.5rem;
    background: none;
    border: none;
    color: #EF4444;
    font-size: 0.75rem;
    cursor: pointer;
    border-radius: 4px;
  }

  .btn-clear:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .history-list {
    max-height: 16rem;
    overflow-y: auto;
  }

  .history-empty {
    padding: 2rem;
    text-align: center;
    color: #6B7280;
    font-size: 0.8125rem;
  }

  .history-item {
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    border-bottom: 1px solid #374151;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
  }

  .history-item:hover {
    background: #374151;
  }

  .history-item:last-child {
    border-bottom: none;
  }

  .history-sql {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: #E5E7EB;
    margin-bottom: 0.375rem;
    word-break: break-all;
  }

  .history-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.6875rem;
    color: #6B7280;
  }

  .history-item.success .history-rows {
    color: #22C55E;
  }

  .history-item.success .history-duration {
    color: #FBBF24;
    font-family: 'JetBrains Mono', monospace;
  }

  .history-item.error .history-error {
    color: #EF4444;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
  }
</style>
