<script lang="ts">
  import type { DimensionGridData, DimensionGridItem } from './types'
  import type { InputStore } from '@app/stores'
  import { useStringInput, useArrayInput } from '../use-input.svelte'

  interface Props {
    data: DimensionGridData
    inputStore: InputStore
  }

  let { data, inputStore }: Props = $props()
  const config = data.config

  // Determine if multiple selection is allowed
  const isMultiple = config.multiple ?? false

  // Use appropriate input type based on multiple selection
  const singleInput = isMultiple ? null : useStringInput(
    inputStore,
    config.name,
    typeof config.defaultValue === 'string' ? config.defaultValue : ''
  )

  const multiInput = isMultiple ? useArrayInput(
    inputStore,
    config.name,
    Array.isArray(config.defaultValue) ? config.defaultValue : []
  ) : null

  // Get items from static config
  let items = $state<DimensionGridItem[]>(config.items || [])

  // Grid columns
  const columns = config.columns || 4
  const gap = config.gap || '0.75rem'

  function isSelected(value: string): boolean {
    if (isMultiple && multiInput) {
      return multiInput.value.includes(value)
    } else if (singleInput) {
      return singleInput.value === value
    }
    return false
  }

  function handleSelect(value: string) {
    if (isMultiple && multiInput) {
      const current = multiInput.value
      if (current.includes(value)) {
        multiInput.setValue(current.filter(v => v !== value))
      } else {
        multiInput.setValue([...current, value])
      }
    } else if (singleInput) {
      // Toggle: click same value to deselect
      if (singleInput.value === value) {
        singleInput.setValue('')
      } else {
        singleInput.setValue(value)
      }
    }
  }

  function handleClearAll() {
    if (isMultiple && multiInput) {
      multiInput.setValue([])
    } else if (singleInput) {
      singleInput.setValue('')
    }
  }

  // Calculate selected count for header
  let selectedCount = $derived(() => {
    if (isMultiple && multiInput) {
      return multiInput.value.length
    } else if (singleInput && singleInput.value) {
      return 1
    }
    return 0
  })
</script>

<div class="dimension-grid-container">
  {#if config.title}
    <div class="dimension-grid-header">
      <span class="title">{config.title}</span>
      {#if selectedCount() > 0}
        <button type="button" class="clear-btn" onclick={handleClearAll}>
          Clear ({selectedCount()})
        </button>
      {/if}
    </div>
  {/if}

  <div
    class="dimension-grid"
    style="grid-template-columns: repeat({columns}, 1fr); gap: {gap};"
  >
    {#each items as item}
      <button
        type="button"
        class="grid-item"
        class:selected={isSelected(item.value)}
        onclick={() => handleSelect(item.value)}
        title={item.label}
      >
        {#if item.icon}
          <span class="item-icon">{item.icon}</span>
        {/if}
        <span class="item-label">{item.label}</span>
        {#if config.showCounts && item.count !== undefined}
          <span class="item-count">{item.count.toLocaleString()}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .dimension-grid-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .dimension-grid-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.25rem;
  }

  .title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary, #E5E7EB);
  }

  .clear-btn {
    font-size: 0.75rem;
    color: var(--text-muted, #9CA3AF);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .clear-btn:hover {
    color: var(--text-primary, #E5E7EB);
    background: rgba(255, 255, 255, 0.1);
  }

  .dimension-grid {
    display: grid;
  }

  .grid-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.75rem 0.5rem;
    background: var(--bg-card, #1F2937);
    border: 1px solid var(--border-color, #374151);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 70px;
  }

  .grid-item:hover {
    background: var(--bg-hover, #374151);
    border-color: var(--border-hover, #4B5563);
  }

  .grid-item.selected {
    background: var(--bg-selected, rgba(99, 102, 241, 0.2));
    border-color: var(--primary-color, #6366F1);
    box-shadow: 0 0 0 1px var(--primary-color, #6366F1);
  }

  .item-icon {
    font-size: 1.25rem;
  }

  .item-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-primary, #E5E7EB);
    text-align: center;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .item-count {
    font-size: 0.65rem;
    color: var(--text-muted, #9CA3AF);
  }
</style>
