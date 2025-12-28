<script lang="ts">
  import { connectionStore } from '@/app/stores/connection.svelte'
  import { databaseStore } from '@/app/stores/database.svelte'
  import type { ConnectionScope, ConnectionFormData } from '@/types/connection'

  interface Props {
    onClose: () => void
  }

  let { onClose }: Props = $props()

  // Steps: 'type' | 'form' | 'test'
  let step = $state<'type' | 'form'>('type')
  let selectedType = $state<ConnectionScope | null>(null)

  // Form data
  let name = $state('')
  let token = $state('')
  let database = $state('')
  let endpoint = $state('')
  let apiKey = $state('')

  // Test state
  let isTesting = $state(false)
  let testResult = $state<{ success: boolean; message: string } | null>(null)
  let isSaving = $state(false)

  const connectionTypes = [
    {
      type: 'wasm' as ConnectionScope,
      icon: '🦆',
      name: 'Local DuckDB',
      description: 'In-browser database with WASM'
    },
    {
      type: 'motherduck' as ConnectionScope,
      icon: '🌐',
      name: 'MotherDuck',
      description: 'Cloud-hosted DuckDB'
    },
    {
      type: 'http' as ConnectionScope,
      icon: '🔌',
      name: 'HTTP API',
      description: 'Connect via HTTP endpoint'
    }
  ]

  function selectType(type: ConnectionScope) {
    selectedType = type
    step = 'form'
    // Set default name
    const typeConfig = connectionTypes.find(t => t.type === type)
    name = typeConfig?.name || ''
  }

  function goBack() {
    step = 'type'
    selectedType = null
    testResult = null
  }

  async function testConnection() {
    if (!selectedType) return

    isTesting = true
    testResult = null

    const formData: ConnectionFormData = {
      name,
      scope: selectedType,
      host: selectedType === 'http' ? endpoint : 'localhost',
      database: database || (selectedType === 'wasm' ? 'memory' : 'default'),
      environment: 'DEV',
      token,
      apiKey
    }

    try {
      const result = await connectionStore.testConnection(formData, { token, apiKey })
      testResult = result
    } catch (error) {
      testResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      }
    } finally {
      isTesting = false
    }
  }

  async function saveConnection() {
    if (!selectedType || !name.trim()) return

    isSaving = true

    try {
      const formData: ConnectionFormData = {
        name: name.trim(),
        scope: selectedType,
        host: selectedType === 'http' ? endpoint : 'localhost',
        database: database || (selectedType === 'wasm' ? 'memory' : 'default'),
        environment: 'DEV'
      }

      const connection = connectionStore.addConnection(formData)

      // Save secrets if provided
      if (token || apiKey) {
        connectionStore.saveSecrets(connection.id, { token, apiKey })
      }

      // Connect to the new connection
      await connectionStore.connect(connection.id, { token, apiKey })

      // Refresh database store
      await databaseStore.switchConnection(connection.id)

      onClose()
    } catch (error) {
      testResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save'
      }
    } finally {
      isSaving = false
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose()
    }
    if (event.key === 'Enter' && step === 'form' && canSave) {
      saveConnection()
    }
  }

  const canSave = $derived(
    name.trim().length > 0 &&
    (selectedType === 'wasm' ||
     (selectedType === 'motherduck' && token.trim().length > 0) ||
     (selectedType === 'http' && endpoint.trim().length > 0))
  )
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class="modal-overlay" onclick={onClose} onkeydown={handleKeydown} role="dialog" aria-modal="true" tabindex="-1">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-container" onclick={(e) => e.stopPropagation()} role="document">
    <!-- Header -->
    <div class="modal-header">
      <h2>
        {#if step === 'type'}
          Add Connection
        {:else}
          {connectionTypes.find(t => t.type === selectedType)?.name}
        {/if}
      </h2>
      <button class="close-btn" onclick={onClose} aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="modal-content">
      {#if step === 'type'}
        <!-- Type Selection -->
        <div class="type-grid">
          {#each connectionTypes as ct}
            <button
              class="type-card"
              onclick={() => selectType(ct.type)}
            >
              <span class="type-icon">{ct.icon}</span>
              <span class="type-name">{ct.name}</span>
              <span class="type-desc">{ct.description}</span>
            </button>
          {/each}
        </div>
      {:else}
        <!-- Form -->
        <div class="form-content">
          {#if step === 'form'}
            <button class="back-btn" onclick={goBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          {/if}

          <div class="form-group">
            <label for="conn-name">Connection Name *</label>
            <input
              id="conn-name"
              type="text"
              bind:value={name}
              placeholder="My Connection"
            />
          </div>


          {#if selectedType === 'motherduck'}
            <div class="form-group">
              <label for="conn-token">MotherDuck Token *</label>
              <input
                id="conn-token"
                type="password"
                bind:value={token}
                placeholder="md_xxxxx..."
              />
            </div>
            <div class="form-group">
              <label for="conn-db">Database</label>
              <input
                id="conn-db"
                type="text"
                bind:value={database}
                placeholder="my_db"
              />
            </div>
          {/if}

          {#if selectedType === 'http'}
            <div class="form-group">
              <label for="conn-endpoint">Endpoint *</label>
              <input
                id="conn-endpoint"
                type="text"
                bind:value={endpoint}
                placeholder="https://api.example.com/sql"
              />
            </div>
            <div class="form-group">
              <label for="conn-apikey">API Key</label>
              <input
                id="conn-apikey"
                type="password"
                bind:value={apiKey}
                placeholder="sk_xxxxx..."
              />
            </div>
          {/if}

          <!-- Test Result -->
          {#if testResult}
            <div class="test-result" class:success={testResult.success} class:error={!testResult.success}>
              {#if testResult.success}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              {/if}
              <span>{testResult.message}</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Footer -->
    {#if step === 'form'}
      <div class="modal-footer">
        <button
          class="btn btn-secondary"
          onclick={testConnection}
          disabled={isTesting || !canSave}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          class="btn btn-primary"
          onclick={saveConnection}
          disabled={isSaving || !canSave}
        >
          {isSaving ? 'Saving...' : 'Save & Connect'}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-container {
    width: 100%;
    max-width: 480px;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #1F2937;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #6B7280;
    cursor: pointer;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: #1F2937;
    color: #F3F4F6;
  }

  .modal-content {
    padding: 1.25rem;
  }

  .type-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .type-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .type-card:hover {
    background: #374151;
    border-color: #4B5563;
    transform: translateY(-2px);
  }

  .type-icon {
    font-size: 2rem;
  }

  .type-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #F3F4F6;
    text-align: center;
  }

  .type-desc {
    font-size: 0.6875rem;
    color: #6B7280;
    text-align: center;
    line-height: 1.4;
  }

  .form-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    background: none;
    border: none;
    font-size: 0.8125rem;
    color: #6B7280;
    cursor: pointer;
    margin-bottom: 0.5rem;
  }

  .back-btn:hover {
    color: #F3F4F6;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #9CA3AF;
  }

  .form-group input {
    padding: 10px 12px;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #F3F4F6;
    outline: none;
    transition: border-color 0.15s;
  }

  .form-group input:focus {
    border-color: #4285F4;
  }

  .form-group input::placeholder {
    color: #6B7280;
  }

  .test-result {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 0.8125rem;
  }

  .test-result.success {
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.3);
    color: #4ADE80;
  }

  .test-result.error {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    color: #F87171;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid #1F2937;
  }

  .btn {
    padding: 8px 16px;
    font-size: 0.8125rem;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #374151;
    border: 1px solid #4B5563;
    color: #E5E7EB;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #4B5563;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4285F4, #8B5CF6);
    border: none;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  @media (max-width: 480px) {
    .type-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
