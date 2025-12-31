<script lang="ts">
  /**
   * DrilldownModal - Row Details Modal
   *
   * Displays detailed information about a clicked table row.
   * Supports custom column selection and formatting.
   */
  import { drilldownStore } from '@app/stores/drilldown.svelte'

  // Reactive state from store
  let visible = $derived(drilldownStore.state.visible)
  let title = $derived(drilldownStore.state.title)
  let rowData = $derived(drilldownStore.state.rowData)
  let displayColumns = $derived(drilldownStore.getDisplayColumns())

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && visible) {
      drilldownStore.hideModal()
    }
  }

  // Handle backdrop click
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      drilldownStore.hideModal()
    }
  }

  // Format column name for display
  function formatColumnName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  // Copy value to clipboard
  async function copyValue(value: unknown) {
    const text = drilldownStore.formatValue(value)
    await navigator.clipboard.writeText(text)
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="drilldown-title"
    tabindex="-1"
  >
    <div class="modal-container">
      <header class="modal-header">
        <h2 id="drilldown-title" class="modal-title">{title}</h2>
        <button
          class="close-button"
          onclick={() => drilldownStore.hideModal()}
          aria-label="Close modal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div class="modal-body">
        <dl class="details-list">
          {#each displayColumns as column}
            {@const value = rowData[column]}
            <div class="detail-item">
              <dt class="detail-label">{formatColumnName(column)}</dt>
              <dd class="detail-value">
                <span class="value-text">{drilldownStore.formatValue(value)}</span>
                <button
                  class="copy-button"
                  onclick={() => copyValue(value)}
                  title="Copy to clipboard"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </dd>
            </div>
          {/each}
        </dl>
      </div>

      <footer class="modal-footer">
        <button
          class="btn-secondary"
          onclick={() => drilldownStore.hideModal()}
        >
          Close
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-container {
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-card, #1F2937);
    border: 1px solid var(--border-color, #374151);
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-color, #374151);
  }

  .modal-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary, #F3F4F6);
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    color: var(--text-secondary, #9CA3AF);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary, #F3F4F6);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
  }

  .details-list {
    margin: 0;
    padding: 0;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-color, #374151);
  }

  .detail-item:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary, #9CA3AF);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-value {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin: 0;
  }

  .value-text {
    flex: 1;
    font-size: 0.9375rem;
    color: var(--text-primary, #F3F4F6);
    font-family: 'JetBrains Mono', monospace;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .copy-button {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    color: var(--text-muted, #6B7280);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s, color 0.15s;
  }

  .detail-item:hover .copy-button {
    opacity: 1;
  }

  .copy-button:hover {
    background: rgba(59, 130, 246, 0.2);
    color: #60A5FA;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border-color, #374151);
  }

  .btn-secondary {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--border-color, #374151);
    border-radius: 0.375rem;
    color: var(--text-secondary, #9CA3AF);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--text-secondary, #9CA3AF);
    color: var(--text-primary, #F3F4F6);
  }
</style>
