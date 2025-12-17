<script lang="ts">
  /**
   * ColumnSelector Component
   *
   * Dropdown for selecting which columns to show/hide in the results table.
   * Features:
   * - Select all / Deselect all
   * - Search columns
   * - Column type indicators
   */

  import type { ColumnVisibility } from './types'

  interface Props {
    columns: ColumnVisibility[]
    onChange: (columns: ColumnVisibility[]) => void
  }

  let { columns, onChange }: Props = $props()

  let isOpen = $state(false)
  let searchQuery = $state('')

  // Filtered columns based on search
  const filteredColumns = $derived(
    searchQuery
      ? columns.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : columns
  )

  // Count of visible columns
  const visibleCount = $derived(columns.filter(c => c.visible).length)

  function toggleColumn(columnName: string) {
    const updated = columns.map(c =>
      c.name === columnName ? { ...c, visible: !c.visible } : c
    )
    onChange(updated)
  }

  function selectAll() {
    onChange(columns.map(c => ({ ...c, visible: true })))
  }

  function deselectAll() {
    onChange(columns.map(c => ({ ...c, visible: false })))
  }

  function getTypeIcon(type?: string): string {
    if (!type) return '?'
    const t = type.toLowerCase()
    if (t.includes('int') || t.includes('float') || t.includes('number') || t.includes('decimal')) return '#'
    if (t.includes('varchar') || t.includes('text') || t.includes('string') || t.includes('char')) return 'T'
    if (t.includes('date') || t.includes('time')) return 'D'
    if (t.includes('bool')) return 'B'
    return '?'
  }
</script>

<div class="column-selector">
  <button
    class="selector-trigger"
    onclick={() => isOpen = !isOpen}
    title="Select columns to display"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
    Columns
    <span class="count">{visibleCount}/{columns.length}</span>
  </button>

  {#if isOpen}
    <div class="selector-dropdown">
      <div class="dropdown-header">
        <input
          type="text"
          placeholder="Search columns..."
          bind:value={searchQuery}
          class="search-input"
        />
      </div>

      <div class="dropdown-actions">
        <button class="action-btn" onclick={selectAll}>Select All</button>
        <button class="action-btn" onclick={deselectAll}>Clear All</button>
      </div>

      <div class="columns-list">
        {#each filteredColumns as column}
          <label class="column-item">
            <input
              type="checkbox"
              checked={column.visible}
              onchange={() => toggleColumn(column.name)}
            />
            <span class="type-badge">{getTypeIcon(column.type)}</span>
            <span class="column-name">{column.name}</span>
          </label>
        {/each}

        {#if filteredColumns.length === 0}
          <div class="no-results">No columns match "{searchQuery}"</div>
        {/if}
      </div>
    </div>

    <!-- Backdrop to close dropdown -->
    <div
      class="backdrop"
      role="button"
      tabindex="-1"
      aria-label="Close"
      onclick={() => isOpen = false}
      onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
    ></div>
  {/if}
</div>

<style>
  .column-selector {
    position: relative;
  }

  .selector-trigger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #E5E7EB;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .selector-trigger:hover {
    background: #374151;
    border-color: #4B5563;
  }

  .count {
    padding: 0.125rem 0.375rem;
    background: #374151;
    border-radius: 4px;
    font-size: 0.6875rem;
    color: #9CA3AF;
  }

  .selector-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    width: 16rem;
    max-height: 20rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    overflow: hidden;
  }

  .dropdown-header {
    padding: 0.5rem;
    border-bottom: 1px solid #374151;
  }

  .search-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #F3F4F6;
    font-size: 0.75rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #4285F4;
  }

  .search-input::placeholder {
    color: #6B7280;
  }

  .dropdown-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    border-bottom: 1px solid #374151;
  }

  .action-btn {
    flex: 1;
    padding: 0.25rem 0.5rem;
    background: #374151;
    border: none;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.6875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background: #4B5563;
    color: #F3F4F6;
  }

  .columns-list {
    max-height: 14rem;
    overflow-y: auto;
    padding: 0.25rem 0;
  }

  .column-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .column-item:hover {
    background: #374151;
  }

  .column-item input[type="checkbox"] {
    width: 0.875rem;
    height: 0.875rem;
    accent-color: #4285F4;
    cursor: pointer;
  }

  .type-badge {
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #374151;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    color: #9CA3AF;
  }

  .column-name {
    flex: 1;
    font-size: 0.75rem;
    color: #E5E7EB;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .no-results {
    padding: 1rem;
    text-align: center;
    color: #6B7280;
    font-size: 0.75rem;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
  }
</style>
