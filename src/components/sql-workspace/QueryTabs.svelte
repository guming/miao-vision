<script lang="ts">
  import { queryWorkspaceStore } from '@app/stores/query-workspace.svelte'

  let editingTabId = $state<string | null>(null)
  let editingName = $state('')

  function startRename(tabId: string, currentName: string, e: MouseEvent) {
    e.stopPropagation()
    editingTabId = tabId
    editingName = currentName
  }

  function finishRename() {
    if (editingTabId && editingName.trim()) {
      queryWorkspaceStore.renameTab(editingTabId, editingName)
    }
    editingTabId = null
    editingName = ''
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      finishRename()
    } else if (e.key === 'Escape') {
      editingTabId = null
      editingName = ''
    }
  }
</script>

<div class="query-tabs">
  <div class="tabs-container">
    {#each queryWorkspaceStore.state.tabs as tab (tab.id)}
      <div
        class="tab"
        class:active={tab.id === queryWorkspaceStore.state.activeTabId}
        class:executing={tab.isExecuting}
        class:error={tab.error}
        role="tab"
        tabindex="0"
        onclick={() => queryWorkspaceStore.setActiveTab(tab.id)}
        ondblclick={(e) => startRename(tab.id, tab.name, e)}
        onkeydown={(e) => e.key === 'Enter' && queryWorkspaceStore.setActiveTab(tab.id)}
      >
        {#if editingTabId === tab.id}
          <input
            type="text"
            class="tab-name-input"
            bind:value={editingName}
            onblur={finishRename}
            onkeydown={handleKeydown}
            onclick={(e) => e.stopPropagation()}
          />
        {:else}
          <span class="tab-name">{tab.name}</span>
        {/if}

        {#if tab.isExecuting}
          <span class="tab-status executing">●</span>
        {:else if tab.error}
          <span class="tab-status error">●</span>
        {:else if tab.result}
          <span class="tab-status success">●</span>
        {/if}

        <button
          class="tab-close"
          onclick={(e) => {
            e.stopPropagation()
            queryWorkspaceStore.closeTab(tab.id)
          }}
          title="Close tab"
        >
          ×
        </button>
      </div>
    {/each}
  </div>

  <button
    class="btn-new-tab"
    onclick={() => queryWorkspaceStore.createTab()}
    title="New query (Ctrl+T)"
  >
    +
  </button>
</div>

<style>
  .query-tabs {
    display: flex;
    align-items: center;
    background: #0F172A;
    border-bottom: 1px solid #1F2937;
    padding: 0 0.5rem;
    height: 2.5rem;
    gap: 0.25rem;
  }

  .tabs-container {
    display: flex;
    flex: 1;
    overflow-x: auto;
    gap: 0.125rem;
    scrollbar-width: none;
  }

  .tabs-container::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: 6px 6px 0 0;
    color: #9CA3AF;
    font-size: 0.8125rem;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    min-width: 0;
    max-width: 12rem;
  }

  .tab:hover {
    background: #1F2937;
    color: #E5E7EB;
  }

  .tab.active {
    background: #111827;
    color: #F3F4F6;
    border-bottom: 2px solid #4285F4;
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tab-name-input {
    width: 6rem;
    padding: 0.125rem 0.25rem;
    background: #1F2937;
    border: 1px solid #4285F4;
    border-radius: 3px;
    color: #F3F4F6;
    font-size: 0.8125rem;
  }

  .tab-name-input:focus {
    outline: none;
  }

  .tab-status {
    font-size: 0.5rem;
    line-height: 1;
  }

  .tab-status.executing {
    color: #FBBF24;
    animation: pulse 1s infinite;
  }

  .tab-status.error {
    color: #EF4444;
  }

  .tab-status.success {
    color: #22C55E;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .tab-close {
    padding: 0;
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 3px;
    color: #6B7280;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s;
  }

  .tab:hover .tab-close {
    opacity: 1;
  }

  .tab-close:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #EF4444;
  }

  .btn-new-tab {
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #9CA3AF;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .btn-new-tab:hover {
    background: #1F2937;
    border-color: #4285F4;
    color: #F3F4F6;
  }
</style>
