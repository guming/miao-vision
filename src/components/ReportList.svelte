<script lang="ts">
  import { reportStore } from '@app/stores/report.svelte'
  import type { Report } from '@/types/report'

  interface Props {
    onSelect?: (report: Report) => void
  }

  let { onSelect }: Props = $props()

  function handleNew() {
    const name = prompt('Enter report name:')
    if (name) {
      const report = reportStore.createReport(name)
      if (onSelect) {
        onSelect(report)
      }
    }
  }

  function handleSelect(report: Report) {
    console.log('📋 ReportList.handleSelect called for:', report.id)
    const success = reportStore.loadReport(report.id)
    console.log('  loadReport returned:', success)
    console.log('  currentReport after load:', reportStore.state.currentReport?.id)

    if (onSelect) {
      onSelect(report)
    }
  }

  function handleDelete(reportId: string, event: Event) {
    event.stopPropagation()

    if (confirm('Delete this report? This action cannot be undone.')) {
      reportStore.deleteReport(reportId)
    }
  }

  function handleDuplicate(reportId: string, event: Event) {
    event.stopPropagation()

    const duplicate = reportStore.duplicateReport(reportId)
    if (duplicate && onSelect) {
      onSelect(duplicate)
    }
  }

  function handleRename(reportId: string, currentName: string, event: Event) {
    event.stopPropagation()

    const newName = prompt('Enter new name:', currentName)
    if (newName && newName !== currentName) {
      reportStore.renameReport(reportId, newName)
    }
  }

  function formatDate(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return 'Today'
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }
</script>

<div class="report-list">
  <div class="list-header">
    <h3>Reports</h3>
    <button class="btn-new" onclick={handleNew} title="Create New Report">
      + New
    </button>
  </div>

  <div class="list-content">
    {#if reportStore.state.reports.length === 0}
      <div class="empty-list">
        <p>No reports yet</p>
        <p class="hint">Click "+ New" to create your first report</p>
      </div>
    {:else}
      <ul class="reports">
        {#each reportStore.state.reports as report (report.id)}
          <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
          <li
            class="report-item"
            class:active={reportStore.state.currentReport?.id === report.id}
            onclick={() => handleSelect(report)}
            onkeydown={(e) => e.key === 'Enter' && handleSelect(report)}
            role="button"
            tabindex="0"
          >
            <div class="report-info">
              <div class="report-name">{report.name}</div>
              <div class="report-meta">
                <span class="modified-date">
                  {formatDate(report.lastModified)}
                </span>
                {#if report.lastExecuted}
                  <span class="executed-badge" title="Last executed">
                    ▶
                  </span>
                {/if}
              </div>
            </div>

            <div class="report-actions">
              <button
                class="action-btn"
                onclick={(e) => handleRename(report.id, report.name, e)}
                title="Rename"
              >
                ✏️
              </button>
              <button
                class="action-btn"
                onclick={(e) => handleDuplicate(report.id, e)}
                title="Duplicate"
              >
                📋
              </button>
              <button
                class="action-btn delete"
                onclick={(e) => handleDelete(report.id, e)}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="list-footer">
    <div class="stats">
      {reportStore.state.reports.length} report{reportStore.state.reports.length !== 1 ? 's' : ''}
    </div>
  </div>
</div>

<style>
  .report-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #1F2937;
    border-right: 1px solid #374151;
  }

  .list-header {
    padding: 1rem;
    border-bottom: 1px solid #374151;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .list-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #D1D5DB;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn-new {
    padding: 0.5rem 0.875rem;
    /* Gemini gradient background */
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 50%, #EC4899 100%);
    border: none;
    border-radius: 1.5rem;
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-new:hover {
    background: linear-gradient(135deg, #3B78E7 0%, #7C4FDB 50%, #D93D85 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
  }

  .btn-new:active {
    transform: translateY(0);
  }

  .list-content {
    flex: 1;
    overflow-y: auto;
  }

  .empty-list {
    padding: 2rem 1rem;
    text-align: center;
    color: #9CA3AF;
  }

  .empty-list p {
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }

  .empty-list .hint {
    font-size: 0.8125rem;
    color: #6B7280;
  }

  .reports {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .report-item {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #374151;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .report-item:hover {
    background-color: #111827;
  }

  .report-item.active {
    /* Gemini gradient background */
    background: linear-gradient(135deg, rgba(66, 133, 244, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
    border-left: 3px solid transparent;
    border-image: linear-gradient(to bottom, #4285F4, #EC4899) 1;
  }

  .report-info {
    flex: 1;
    min-width: 0;
  }

  .report-name {
    font-weight: 500;
    color: #F3F4F6;
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .report-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .modified-date {
    font-size: 0.75rem;
  }

  .executed-badge {
    font-size: 0.625rem;
    color: #22C55E;
  }

  .report-actions {
    display: none;
    gap: 0.25rem;
  }

  .report-item:hover .report-actions {
    display: flex;
    animation: fadeIn 0.15s ease-in-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .action-btn {
    padding: 0.25rem 0.5rem;
    background: #374151;
    border: 1px solid #4B5563;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: linear-gradient(135deg, rgba(66, 133, 244, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%);
    border-color: rgba(66, 133, 244, 0.2);
    transform: translateY(-1px);
  }

  .action-btn.delete:hover {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
    border-color: rgba(239, 68, 68, 0.2);
    color: #991B1B;
  }

  .list-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid #374151;
    background-color: #111827;
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .stats {
    text-align: center;
  }

  /* Scrollbar styling - Dark mode */
  .list-content {
    scrollbar-width: thin;
    scrollbar-color: #4B5563 #1F2937;
  }

  .list-content::-webkit-scrollbar {
    width: 8px;
  }

  .list-content::-webkit-scrollbar-track {
    background: #1F2937;
  }

  .list-content::-webkit-scrollbar-thumb {
    background: #4B5563;
    border-radius: 4px;
  }

  .list-content::-webkit-scrollbar-thumb:hover {
    background: #6B7280;
  }
</style>
