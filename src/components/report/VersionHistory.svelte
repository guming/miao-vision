<script lang="ts">
  import type { ReportVersion } from '@/types/version'
  import { versionStore } from '@app/stores/version.svelte'

  interface Props {
    /** Report ID to show versions for */
    reportId: string

    /** Show/hide modal */
    show?: boolean

    /** Callback when a version is selected */
    onSelect?: (version: ReportVersion) => void

    /** Callback when compare is clicked */
    onCompare?: (version: ReportVersion) => void

    /** Callback when restore is clicked */
    onRestore?: (version: ReportVersion) => void
  }

  let { reportId, show = $bindable(false), onSelect, onCompare, onRestore }: Props = $props()

  // Format timestamp
  function formatTimestamp(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // Less than 1 minute
    if (diff < 60000) return 'Just now'

    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000)
      return `${mins} minute${mins > 1 ? 's' : ''} ago`
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }

    // Format as date
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format content size
  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Load versions when report ID changes
  $effect(() => {
    if (reportId && show) {
      versionStore.loadVersions(reportId)
    }
  })

  function handleClose() {
    show = false
  }
</script>

{#if show}
  <div class="modal-overlay" onclick={handleClose}>
    <div class="modal-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="version-history">
        <header class="history-header">
          <h3>Version History</h3>
          <div class="header-actions">
            <div class="header-stats">
              {#if versionStore.state.versions.length > 0}
                <span class="stat-item">
                  {versionStore.state.versions.length} version{versionStore.state.versions.length > 1 ? 's' : ''}
                </span>
              {/if}
            </div>
            <button
              type="button"
              class="close-btn"
              onclick={handleClose}
              title="Close"
            >
              ×
            </button>
          </div>
        </header>

  <div class="history-content">
    {#if versionStore.state.isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Loading versions...</span>
      </div>
    {:else if versionStore.state.error}
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-message">{versionStore.state.error}</div>
      </div>
    {:else if versionStore.state.versions.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📜</div>
        <div class="empty-title">No versions yet</div>
        <div class="empty-hint">
          Save your first version to start tracking changes
        </div>
      </div>
    {:else}
      <div class="version-list">
        {#each versionStore.state.versions as version (version.id)}
          <div
            class="version-item"
            class:selected={versionStore.state.selectedVersion?.id === version.id}
            role="button"
            tabindex="0"
            onclick={() => onSelect?.(version)}
            onkeydown={(e) => e.key === 'Enter' && onSelect?.(version)}
          >
            <div class="version-header">
              <div class="version-number">
                <span class="version-label">v{version.version}</span>
                {#if version.isAutoSave}
                  <span class="auto-save-badge" title="Auto-saved">Auto</span>
                {/if}
              </div>
              <div class="version-time">
                {formatTimestamp(version.timestamp)}
              </div>
            </div>

            <div class="version-details">
              {#if version.metadata.description}
                <div class="version-description">
                  {version.metadata.description}
                </div>
              {/if}

              <div class="version-meta">
                <span class="meta-item">
                  {formatSize(version.metadata.contentLength)}
                </span>
                {#if version.metadata.tags && version.metadata.tags.length > 0}
                  <span class="meta-divider">•</span>
                  <div class="version-tags">
                    {#each version.metadata.tags as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <div class="version-actions">
              <button
                type="button"
                class="action-btn"
                title="Compare with current"
                onclick={(e) => {
                  e.stopPropagation()
                  onCompare?.(version)
                }}
              >
                <span class="icon">⇄</span>
                Compare
              </button>
              <button
                type="button"
                class="action-btn"
                title="Restore this version"
                onclick={(e) => {
                  e.stopPropagation()
                  onRestore?.(version)
                }}
              >
                <span class="icon">↻</span>
                Restore
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-dialog {
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .version-history {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #111827;
    color: #F3F4F6;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #1F2937;
    flex-shrink: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .history-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .header-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .stat-item {
    padding: 0.25rem 0.5rem;
    background: #1F2937;
    border-radius: 4px;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #9CA3AF;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: #1F2937;
    color: #F3F4F6;
  }

  .history-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    gap: 0.75rem;
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

  .error-icon {
    font-size: 2rem;
  }

  .error-message {
    color: #EF4444;
    font-size: 0.875rem;
    text-align: center;
  }

  .empty-icon {
    font-size: 3rem;
    opacity: 0.3;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 500;
    color: #9CA3AF;
  }

  .empty-hint {
    font-size: 0.8125rem;
    color: #6B7280;
    text-align: center;
  }

  .version-list {
    display: flex;
    flex-direction: column;
  }

  .version-item {
    padding: 1rem;
    border-bottom: 1px solid #1F2937;
    cursor: pointer;
    transition: background 0.15s;
  }

  .version-item:hover {
    background: #111827;
  }

  .version-item.selected {
    background: #1F2937;
    border-left: 3px solid #4285F4;
  }

  .version-item:focus {
    outline: 2px solid #4285F4;
    outline-offset: -2px;
  }

  .version-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .version-number {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .version-label {
    font-weight: 600;
    color: #F3F4F6;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
  }

  .auto-save-badge {
    padding: 0.125rem 0.375rem;
    background: #374151;
    border-radius: 3px;
    font-size: 0.6875rem;
    color: #9CA3AF;
    font-family: 'JetBrains Mono', monospace;
  }

  .version-time {
    font-size: 0.75rem;
    color: #6B7280;
  }

  .version-details {
    margin-bottom: 0.75rem;
  }

  .version-description {
    font-size: 0.875rem;
    color: #D1D5DB;
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  .version-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #6B7280;
  }

  .meta-divider {
    color: #374151;
  }

  .version-tags {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .tag {
    padding: 0.125rem 0.375rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 3px;
    font-size: 0.6875rem;
    color: #9CA3AF;
  }

  .version-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background: #374151;
    border-color: #4B5563;
    color: #F3F4F6;
  }

  .action-btn .icon {
    font-size: 0.875rem;
  }

  /* Scrollbar styling */
  .history-content::-webkit-scrollbar {
    width: 8px;
  }

  .history-content::-webkit-scrollbar-track {
    background: #030712;
  }

  .history-content::-webkit-scrollbar-thumb {
    background: #374151;
    border-radius: 4px;
  }

  .history-content::-webkit-scrollbar-thumb:hover {
    background: #4B5563;
  }
</style>
