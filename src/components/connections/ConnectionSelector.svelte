<script lang="ts">
  import { connectionStore } from '@/app/stores/connection.svelte'
  import { CONNECTION_SCOPES } from '@/types/connection'
  import ConnectionSelectorItem from './ConnectionSelectorItem.svelte'
  import AddConnectionModal from './AddConnectionModal.svelte'

  interface Props {
    onConnectionChange?: () => void
  }

  let { onConnectionChange }: Props = $props()

  let isOpen = $state(false)
  let showAddModal = $state(false)

  const activeConnection = $derived(connectionStore.getActiveConnection())

  function getScopeIcon(scope: string): string {
    const scopeConfig = CONNECTION_SCOPES.find(s => s.value === scope)
    return scopeConfig?.icon || '?'
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'connected': return '#4ADE80'
      case 'connecting': return '#FBBF24'
      case 'error': return '#F87171'
      default: return '#6B7280'
    }
  }

  function toggleDropdown() {
    isOpen = !isOpen
  }

  function closeDropdown() {
    isOpen = false
  }

  async function selectConnection(id: string) {
    closeDropdown()
    if (id !== connectionStore.state.activeConnectionId) {
      await connectionStore.connect(id)
      onConnectionChange?.()
    }
  }

  function openAddModal() {
    closeDropdown()
    showAddModal = true
  }

  function handleAddModalClose() {
    showAddModal = false
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('.connection-selector')) {
      closeDropdown()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeDropdown()
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="connection-selector">
  <button
    class="selector-trigger"
    onclick={toggleDropdown}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  >
    {#if activeConnection}
      <span class="trigger-icon">{getScopeIcon(activeConnection.scope)}</span>
      <span class="trigger-name">{activeConnection.name}</span>
      <span
        class="trigger-status"
        style="--status-color: {getStatusColor(activeConnection.status)}"
      ></span>
    {:else}
      <span class="trigger-name">No Connection</span>
    {/if}
    <span class="trigger-arrow" class:open={isOpen}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </span>
  </button>

  {#if isOpen}
    <div class="selector-dropdown" role="listbox">
      <div class="dropdown-list">
        {#each connectionStore.state.connections as connection (connection.id)}
          <ConnectionSelectorItem
            {connection}
            isActive={connection.id === connectionStore.state.activeConnectionId}
            onClick={() => selectConnection(connection.id)}
          />
        {/each}
      </div>
      <div class="dropdown-footer">
        <button class="add-btn" onclick={openAddModal}>
          <span class="add-icon">+</span>
          <span>Add Connection</span>
        </button>
      </div>
    </div>
  {/if}
</div>

{#if showAddModal}
  <AddConnectionModal onClose={handleAddModalClose} />
{/if}

<style>
  .connection-selector {
    position: relative;
  }

  .selector-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    max-width: 200px;
  }

  .selector-trigger:hover {
    background: #374151;
    border-color: #4B5563;
  }

  .trigger-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .trigger-name {
    flex: 1;
    font-size: 0.8125rem;
    color: #E5E7EB;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  .trigger-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--status-color);
    flex-shrink: 0;
  }

  .trigger-arrow {
    display: flex;
    align-items: center;
    color: #6B7280;
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .trigger-arrow.open {
    transform: rotate(180deg);
  }

  .selector-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 220px;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 100;
    overflow: hidden;
  }

  .dropdown-list {
    max-height: 240px;
    overflow-y: auto;
  }

  .dropdown-footer {
    border-top: 1px solid #374151;
    padding: 4px;
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8125rem;
    color: #60A5FA;
    transition: background 0.15s;
  }

  .add-btn:hover {
    background: rgba(96, 165, 250, 0.1);
  }

  .add-icon {
    font-size: 1rem;
    font-weight: 600;
  }
</style>
