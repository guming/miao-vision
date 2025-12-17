<!--
  ConnectionModal.svelte

  Modal dialog for adding or editing database connections.
  Dark theme matching the Workspace style.
-->
<script lang="ts">
  import { connectionStore } from '@/app/stores/connection.svelte'
  import {
    CONNECTION_SCOPES,
    CONNECTION_ENVIRONMENTS,
    type DatabaseConnection,
    type ConnectionFormData,
    type ConnectionScope,
    type ConnectionEnvironment
  } from '@/types/connection'

  interface Props {
    connection?: DatabaseConnection | null
    onClose: () => void
  }

  let { connection = null, onClose }: Props = $props()

  const isEditing = !!connection

  // Form state
  let name = $state(connection?.name || '')
  let scope = $state<ConnectionScope>(connection?.scope || 'remote')
  let host = $state(connection?.host || '')
  let database = $state(connection?.database || '')
  let environment = $state<ConnectionEnvironment>(connection?.environment || 'DEV')
  let token = $state('')

  let testing = $state(false)
  let testResult = $state<{ success: boolean; message: string } | null>(null)
  let saving = $state(false)
  let error = $state<string | null>(null)

  // Derived validation
  let isValid = $derived(
    name.trim().length > 0 &&
    host.trim().length > 0 &&
    database.trim().length > 0
  )

  async function handleTest() {
    testing = true
    testResult = null
    error = null

    try {
      const formData: ConnectionFormData = {
        name,
        scope,
        host,
        database,
        environment,
        token: token || undefined
      }
      testResult = await connectionStore.testConnection(formData)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Test failed'
    } finally {
      testing = false
    }
  }

  async function handleSave() {
    if (!isValid) return

    saving = true
    error = null

    try {
      const formData: ConnectionFormData = {
        name,
        scope,
        host,
        database,
        environment,
        token: token || undefined
      }

      if (isEditing && connection) {
        connectionStore.updateConnection(connection.id, formData)
      } else {
        connectionStore.addConnection(formData)
      }

      onClose()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save connection'
    } finally {
      saving = false
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick} onkeydown={() => {}} role="dialog">
  <div class="modal">
    <header class="modal-header">
      <h2>{isEditing ? 'Edit Connection' : 'Add Connection'}</h2>
      <button class="close-btn" onclick={onClose}>×</button>
    </header>

    <div class="modal-body">
      <div class="form-group">
        <label for="name">Connection Name</label>
        <input
          id="name"
          type="text"
          class="form-input"
          placeholder="My Database"
          bind:value={name}
        />
      </div>

      <div class="form-group">
        <label>Connection Type</label>
        <div class="scope-selector">
          {#each CONNECTION_SCOPES as scopeOption}
            <button
              type="button"
              class="scope-btn"
              class:active={scope === scopeOption.value}
              onclick={() => scope = scopeOption.value}
              disabled={scopeOption.value === 'wasm'}
            >
              <span class="scope-icon">{scopeOption.icon}</span>
              <span class="scope-label">{scopeOption.label}</span>
              <span class="scope-desc">{scopeOption.description}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="host">Host</label>
          <input
            id="host"
            type="text"
            class="form-input"
            placeholder={scope === 'remote' ? 'localhost:4000' : 'md:database'}
            bind:value={host}
          />
        </div>
        <div class="form-group">
          <label for="database">Database</label>
          <input
            id="database"
            type="text"
            class="form-input"
            placeholder="my_database"
            bind:value={database}
          />
        </div>
      </div>

      <div class="form-group">
        <label for="environment">Environment</label>
        <div class="env-selector">
          {#each CONNECTION_ENVIRONMENTS as env}
            <button
              type="button"
              class="env-btn"
              class:active={environment === env.value}
              style="--env-color: {env.color}"
              onclick={() => environment = env.value}
            >
              {env.label}
            </button>
          {/each}
        </div>
      </div>

      {#if scope === 'remote'}
        <div class="form-group">
          <label for="token">Authentication Token (optional)</label>
          <input
            id="token"
            type="password"
            class="form-input"
            placeholder="Bearer token or API key"
            bind:value={token}
          />
        </div>
      {/if}

      {#if scope === 'motherduck'}
        <div class="form-group">
          <label for="token">MotherDuck API Key</label>
          <input
            id="token"
            type="password"
            class="form-input"
            placeholder="md_xxxxxxxxxxxxxxxx"
            bind:value={token}
          />
        </div>
      {/if}

      {#if testResult}
        <div class="test-result" class:success={testResult.success} class:error={!testResult.success}>
          {testResult.success ? '✓' : '✕'} {testResult.message}
        </div>
      {/if}

      {#if error}
        <div class="error-message">{error}</div>
      {/if}
    </div>

    <footer class="modal-footer">
      <button class="btn btn-secondary" onclick={onClose}>
        Cancel
      </button>
      <button
        class="btn btn-outline"
        onclick={handleTest}
        disabled={!isValid || testing}
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
      <button
        class="btn btn-primary"
        onclick={handleSave}
        disabled={!isValid || saving}
      >
        {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Connection'}
      </button>
    </footer>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: #111827;
    border: 1px solid #1F2937;
    border-radius: 16px;
    width: 90%;
    max-width: 560px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #1F2937;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    font-size: 1.5rem;
    color: #6B7280;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    background: #1F2937;
    color: #F3F4F6;
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #9CA3AF;
  }

  .form-input {
    width: 100%;
    padding: 10px 14px;
    background: #0F172A;
    border: 1px solid #374151;
    border-radius: 8px;
    font-size: 0.875rem;
    color: #F3F4F6;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  .form-input:focus {
    outline: none;
    border-color: #4285F4;
    box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.15);
  }

  .form-input::placeholder {
    color: #4B5563;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .scope-selector {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .scope-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid #374151;
    border-radius: 10px;
    background: #0F172A;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .scope-btn:hover:not(:disabled) {
    border-color: #4285F4;
    background: rgba(66, 133, 244, 0.05);
  }

  .scope-btn.active {
    border-color: #4285F4;
    background: rgba(66, 133, 244, 0.1);
  }

  .scope-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .scope-icon {
    font-size: 1.5rem;
  }

  .scope-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: #F3F4F6;
  }

  .scope-desc {
    flex: 1;
    font-size: 0.75rem;
    color: #6B7280;
  }

  .env-selector {
    display: flex;
    gap: 8px;
  }

  .env-btn {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #374151;
    border-radius: 8px;
    background: #0F172A;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    color: #6B7280;
  }

  .env-btn:hover {
    border-color: var(--env-color);
    color: var(--env-color);
  }

  .env-btn.active {
    border-color: var(--env-color);
    background: color-mix(in srgb, var(--env-color) 10%, transparent);
    color: var(--env-color);
  }

  .test-result {
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-bottom: 16px;
  }

  .test-result.success {
    background: rgba(74, 222, 128, 0.1);
    color: #4ADE80;
    border: 1px solid rgba(74, 222, 128, 0.3);
  }

  .test-result.error {
    background: rgba(239, 68, 68, 0.1);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .error-message {
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #FCA5A5;
    font-size: 0.875rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #1F2937;
    background: #0F172A;
  }

  .btn {
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #1F2937;
    color: #F3F4F6;
    border: 1px solid #374151;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #374151;
  }

  .btn-outline {
    background: transparent;
    border: 1px solid #374151;
    color: #F3F4F6;
  }

  .btn-outline:hover:not(:disabled) {
    border-color: #4285F4;
    color: #4285F4;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4285F4, #8B5CF6);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
  }
</style>
