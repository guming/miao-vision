<script lang="ts">
  import type { ChartConfig, ChartType, ColumnInfo } from '@/types/chart'
  import { CHART_TYPES, DEFAULT_CHART_CONFIG } from '@/types/chart'

  interface Props {
    availableColumns?: ColumnInfo[]
    availableTables?: string[]
    onGenerate?: (config: ChartConfig) => void
  }

  let {
    availableColumns = [],
    availableTables = [],
    onGenerate
  }: Props = $props()

  // Configuration state
  let selectedType = $state<ChartType>('bar')
  let selectedTable = $state<string>('')
  let selectedX = $state<string>('')
  let selectedY = $state<string>('')
  let selectedGroup = $state<string>('')

  let chartWidth = $state(680)
  let chartHeight = $state(400)
  let chartTitle = $state('')
  let xLabel = $state('')
  let yLabel = $state('')

  // Computed properties
  let canGenerate = $derived(
    selectedTable && selectedX && selectedY
  )

  let categoricalColumns = $derived(
    availableColumns.filter(col => col.type === 'string' || col.type === 'date')
  )

  // Select first table by default
  $effect(() => {
    if (availableTables.length > 0 && !selectedTable) {
      selectedTable = availableTables[0]
    }
  })

  function handleGenerate() {
    if (!canGenerate || !onGenerate) return

    const config: ChartConfig = {
      type: selectedType,
      data: {
        table: selectedTable,
        x: selectedX,
        y: selectedY,
        group: selectedGroup || undefined
      },
      options: {
        width: chartWidth,
        height: chartHeight,
        title: chartTitle || undefined,
        xLabel: xLabel || undefined,
        yLabel: yLabel || undefined,
        grid: true,
        tooltip: true
      }
    }

    onGenerate(config)
  }

  function handleReset() {
    selectedType = 'bar'
    selectedX = ''
    selectedY = ''
    selectedGroup = ''
    chartWidth = DEFAULT_CHART_CONFIG.options?.width || 680
    chartHeight = DEFAULT_CHART_CONFIG.options?.height || 400
    chartTitle = ''
    xLabel = ''
    yLabel = ''
  }
</script>

<div class="config-panel">
  <h3>Chart Configuration</h3>

  <!-- Chart Type Selection -->
  <div class="form-group">
    <label for="chart-type">Chart Type</label>
    <select id="chart-type" bind:value={selectedType}>
      {#each CHART_TYPES as chartType}
        <option value={chartType.type}>
          {chartType.icon} {chartType.label}
        </option>
      {/each}
    </select>
    <small class="hint">
      {CHART_TYPES.find(t => t.type === selectedType)?.description}
    </small>
  </div>

  <!-- Table Selection -->
  {#if availableTables.length > 0}
    <div class="form-group">
      <label for="table">Data Source</label>
      <select id="table" bind:value={selectedTable}>
        {#each availableTables as table}
          <option value={table}>{table}</option>
        {/each}
      </select>
    </div>
  {/if}

  <!-- X Axis -->
  <div class="form-group">
    <label for="x-axis">X Axis</label>
    <select id="x-axis" bind:value={selectedX} disabled={availableColumns.length === 0}>
      <option value="">Select column...</option>
      {#each availableColumns as col}
        <option value={col.name}>
          {col.name} ({col.type})
        </option>
      {/each}
    </select>
  </div>

  <!-- Y Axis -->
  <div class="form-group">
    <label for="y-axis">Y Axis</label>
    <select id="y-axis" bind:value={selectedY} disabled={availableColumns.length === 0}>
      <option value="">Select column...</option>
      {#each availableColumns as col}
        <option value={col.name}>
          {col.name} ({col.type})
        </option>
      {/each}
    </select>
  </div>

  <!-- Group/Color (Optional) -->
  <div class="form-group">
    <label for="group">Group By (Optional)</label>
    <select id="group" bind:value={selectedGroup}>
      <option value="">None</option>
      {#each categoricalColumns as col}
        <option value={col.name}>
          {col.name}
        </option>
      {/each}
    </select>
    <small class="hint">Color by category</small>
  </div>

  <!-- Dimensions -->
  <div class="form-row">
    <div class="form-group">
      <label for="width">Width (px)</label>
      <input
        id="width"
        type="number"
        bind:value={chartWidth}
        min="300"
        max="1200"
        step="10"
      />
    </div>
    <div class="form-group">
      <label for="height">Height (px)</label>
      <input
        id="height"
        type="number"
        bind:value={chartHeight}
        min="200"
        max="800"
        step="10"
      />
    </div>
  </div>

  <!-- Optional Labels -->
  <details class="advanced">
    <summary>Advanced Options</summary>

    <div class="form-group">
      <label for="title">Chart Title</label>
      <input
        id="title"
        type="text"
        bind:value={chartTitle}
        placeholder="Optional title..."
      />
    </div>

    <div class="form-group">
      <label for="x-label">X Axis Label</label>
      <input
        id="x-label"
        type="text"
        bind:value={xLabel}
        placeholder="Optional label..."
      />
    </div>

    <div class="form-group">
      <label for="y-label">Y Axis Label</label>
      <input
        id="y-label"
        type="text"
        bind:value={yLabel}
        placeholder="Optional label..."
      />
    </div>
  </details>

  <!-- Actions -->
  <div class="actions">
    <button
      class="btn btn-primary"
      onclick={handleGenerate}
      disabled={!canGenerate}
    >
      📊 Generate Chart
    </button>
    <button class="btn btn-secondary" onclick={handleReset}>
      Reset
    </button>
  </div>

  {#if !canGenerate && availableColumns.length === 0}
    <div class="info-message">
      <p>💡 Upload data and run a query to create charts</p>
    </div>
  {/if}
</div>

<style>
  .config-panel {
    padding: 1.5rem;
    background: #1F2937;
    border-radius: 16px;
    border: 1px solid #374151;
  }

  h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
  }

  select,
  input[type="text"],
  input[type="number"] {
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    color: #F3F4F6;
    font-size: 0.875rem;
    transition: border-color 0.2s ease;
  }

  select:focus,
  input:focus {
    outline: none;
    border-color: #4285F4;
  }

  select:disabled,
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .hint {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    opacity: 0.6;
  }

  .advanced {
    margin: 1.5rem 0;
    padding: 1rem;
    background: #111827;
    border-radius: 8px;
    border: 1px solid #374151;
  }

  .advanced summary {
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 1rem;
    color: #F3F4F6;
  }

  .advanced summary:hover {
    color: #4285F4;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .btn {
    flex: 1;
    padding: 0.625rem 1rem;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #3B78E7 0%, #7C4FDB 100%);
    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #374151;
    color: #F3F4F6;
    border: 1px solid #4B5563;
  }

  .btn-secondary:hover {
    background: #4B5563;
    border-color: #6B7280;
  }

  .info-message {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(66, 133, 244, 0.1);
    border: 1px solid rgba(66, 133, 244, 0.3);
    border-radius: 8px;
    text-align: center;
  }

  .info-message p {
    margin: 0;
    font-size: 0.875rem;
    color: #9CA3AF;
  }
</style>
