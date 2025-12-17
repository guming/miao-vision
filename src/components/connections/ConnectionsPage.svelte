<!--
  ConnectionsPage.svelte

  Displays and manages database connections.
  Dark theme matching the Workspace style.
-->
<script lang="ts">
  import { connectionStore } from '@/app/stores/connection.svelte'
  import { databaseStore } from '@/app/stores/database.svelte'
  import { CONNECTION_SCOPES, CONNECTION_ENVIRONMENTS } from '@/types/connection'
  import type { DatabaseConnection } from '@/types/connection'
  import ConnectionModal from './ConnectionModal.svelte'

  let showModal = $state(false)
  let editingConnection = $state<DatabaseConnection | null>(null)

  function getStatusColor(status: string): string {
    switch (status) {
      case 'connected': return '#4ADE80'
      case 'connecting': return '#FBBF24'
      case 'error': return '#F87171'
      default: return '#6B7280'
    }
  }

  function getEnvironmentColor(env: string): string {
    const envConfig = CONNECTION_ENVIRONMENTS.find(e => e.value === env)
    return envConfig?.color || '#6B7280'
  }

  function getScopeIcon(scope: string): string {
    const scopeConfig = CONNECTION_SCOPES.find(s => s.value === scope)
    return scopeConfig?.icon || '?'
  }

  async function handleConnect(connection: DatabaseConnection) {
    if (connection.status === 'connected') {
      await connectionStore.disconnect(connection.id)
    } else {
      await databaseStore.switchConnection(connection.id)
    }
  }

  function handleEdit(connection: DatabaseConnection) {
    editingConnection = connection
    showModal = true
  }

  function handleDelete(connection: DatabaseConnection) {
    if (confirm(`Delete connection "${connection.name}"?`)) {
      connectionStore.deleteConnection(connection.id)
    }
  }

  function handleAddNew() {
    editingConnection = null
    showModal = true
  }

  function handleModalClose() {
    showModal = false
    editingConnection = null
  }
</script>

<div class="connections-page">
  <header class="page-header">
    <div class="header-content">
      <h1>Database Connections</h1>
      <p class="subtitle">Manage your database connections</p>
    </div>
    <button class="btn btn-primary" onclick={handleAddNew}>
      <span class="btn-icon">+</span>
      Add Connection
    </button>
  </header>

  <div class="connections-table-container">
    <table class="connections-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Host</th>
          <th>Database</th>
          <th>Environment</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each connectionStore.state.connections as connection (connection.id)}
          <tr class:active={connection.isActive}>
            <td class="name-cell">
              <span class="scope-icon">{getScopeIcon(connection.scope)}</span>
              <span class="connection-name">{connection.name}</span>
              {#if connection.isActive}
                <span class="active-badge">Active</span>
              {/if}
            </td>
            <td>
              <span class="scope-badge">{connection.scope.toUpperCase()}</span>
            </td>
            <td class="host-cell">{connection.host}</td>
            <td class="database-cell">{connection.database}</td>
            <td>
              <span
                class="env-badge"
                style="--env-color: {getEnvironmentColor(connection.environment)}"
              >
                {connection.environment}
              </span>
            </td>
            <td>
              <span
                class="status-indicator"
                style="--status-color: {getStatusColor(connection.status)}"
              >
                <span class="status-dot"></span>
                {connection.status}
              </span>
            </td>
            <td class="actions-cell">
              <button
                class="action-btn connect-btn"
                onclick={() => handleConnect(connection)}
                title={connection.status === 'connected' ? 'Disconnect' : 'Connect'}
              >
                {connection.status === 'connected' ? '⏹' : '▶'}
              </button>
              <button
                class="action-btn edit-btn"
                onclick={() => handleEdit(connection)}
                title="Edit"
                disabled={connection.id === 'wasm-local'}
              >
                ✏️
              </button>
              <button
                class="action-btn delete-btn"
                onclick={() => handleDelete(connection)}
                title="Delete"
                disabled={connection.id === 'wasm-local'}
              >
                🗑️
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if connectionStore.state.error}
    <div class="error-message">
      {connectionStore.state.error}
      <button class="dismiss-btn" onclick={() => connectionStore.clearError()}>×</button>
    </div>
  {/if}
</div>

{#if showModal}
  <ConnectionModal
    connection={editingConnection}
    onClose={handleModalClose}
  />
{/if}

<style>
  .connections-page {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
    background: #030712;
    min-height: 100%;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .header-content h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .subtitle {
    margin: 4px 0 0;
    font-size: 0.8125rem;
    color: #6B7280;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4285F4, #8B5CF6);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
  }

  .btn-icon {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .connections-table-container {
    background: #111827;
    border-radius: 12px;
    border: 1px solid #1F2937;
    overflow: hidden;
  }

  .connections-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .connections-table th {
    text-align: left;
    padding: 14px 16px;
    background: #0F172A;
    font-weight: 600;
    color: #6B7280;
    border-bottom: 1px solid #1F2937;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .connections-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #1F2937;
    color: #F3F4F6;
  }

  .connections-table tbody tr:last-child td {
    border-bottom: none;
  }

  .connections-table tbody tr:hover {
    background: #1F2937;
  }

  .connections-table tbody tr.active {
    background: rgba(66, 133, 244, 0.1);
  }

  .name-cell {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
  }

  .scope-icon {
    font-size: 1.125rem;
  }

  .connection-name {
    flex: 1;
  }

  .active-badge {
    font-size: 0.625rem;
    padding: 2px 6px;
    background: rgba(74, 222, 128, 0.15);
    color: #4ADE80;
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .scope-badge {
    font-size: 0.6875rem;
    padding: 3px 8px;
    background: #1F2937;
    color: #9CA3AF;
    border: 1px solid #374151;
    border-radius: 4px;
    font-weight: 600;
  }

  .host-cell,
  .database-cell {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .env-badge {
    font-size: 0.6875rem;
    padding: 3px 8px;
    background: color-mix(in srgb, var(--env-color) 15%, transparent);
    color: var(--env-color);
    border: 1px solid color-mix(in srgb, var(--env-color) 30%, transparent);
    border-radius: 4px;
    font-weight: 600;
  }

  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8125rem;
    text-transform: capitalize;
    color: var(--status-color);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--status-color);
    box-shadow: 0 0 8px var(--status-color);
  }

  .actions-cell {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #374151;
    border-radius: 6px;
    background: #1F2937;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.875rem;
  }

  .action-btn:hover:not(:disabled) {
    background: #374151;
    border-color: #4B5563;
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .connect-btn:hover:not(:disabled) {
    border-color: #4ADE80;
    color: #4ADE80;
  }

  .edit-btn:hover:not(:disabled) {
    border-color: #4285F4;
  }

  .delete-btn:hover:not(:disabled) {
    border-color: #F87171;
  }

  .error-message {
    margin-top: 16px;
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #FCA5A5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
  }

  .dismiss-btn {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: #F87171;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .dismiss-btn:hover {
    color: #FCA5A5;
  }
</style>
