<script lang="ts">
  import type { DatabaseConnection } from '@/types/connection'
  import { CONNECTION_SCOPES } from '@/types/connection'

  interface Props {
    connection: DatabaseConnection
    isActive?: boolean
    onClick: () => void
  }

  let { connection, isActive = false, onClick }: Props = $props()

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
</script>

<button
  class="connection-item"
  class:active={isActive}
  onclick={onClick}
>
  <span class="item-icon">{getScopeIcon(connection.scope)}</span>
  <span class="item-name">{connection.name}</span>
  <span
    class="item-status"
    style="--status-color: {getStatusColor(connection.status)}"
  ></span>
</button>

<style>
  .connection-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }

  .connection-item:hover {
    background: #374151;
  }

  .connection-item.active {
    background: rgba(66, 133, 244, 0.15);
  }

  .item-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .item-name {
    flex: 1;
    font-size: 0.8125rem;
    color: #E5E7EB;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--status-color);
    flex-shrink: 0;
  }
</style>
