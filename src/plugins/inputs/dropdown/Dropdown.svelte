<script lang="ts">
  import type { DropdownData } from './types'
  import type { InputStore } from '@app/stores'
  import { useStringInput } from '../use-input.svelte'

  interface Props {
    data: DropdownData
    inputStore: InputStore
  }

  let { data, inputStore }: Props = $props()

  // Extract config values reactively
  const config = $derived(data.config)
  const options = $derived(data.options)
  const input = $derived.by(() => useStringInput(inputStore, config.name, config.defaultValue ?? undefined))

  function handleChange(event: Event) {
    const select = event.target as HTMLSelectElement
    const newValue = select.value || null
    input.setValue(newValue)
  }
</script>

<div class="dropdown-input">
  {#if config.title}
    <label class="dropdown-label" for={config.name}>
      {config.title}
    </label>
  {/if}

  <select
    id={config.name}
    name={config.name}
    class="dropdown-select"
    value={input.value || ''}
    onchange={handleChange}
    multiple={config.multiple}
  >
    {#if !config.multiple}
      <option value="">
        {config.placeholder || 'Select...'}
      </option>
    {/if}

    {#each options as option}
      <option value={option.value}>
        {option.label}
      </option>
    {/each}
  </select>
</div>

<style>
  .dropdown-input {
    margin: 1.5rem 0;
  }

  .dropdown-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
    margin-bottom: 0.5rem;
  }

  .dropdown-select {
    width: 100%;
    max-width: 300px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #F3F4F6;
    background-color: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 6px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    transition: all 0.15s ease;
    cursor: pointer;
  }

  .dropdown-select:hover {
    border-color: #9CA3AF;
  }

  .dropdown-select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .dropdown-select[multiple] {
    max-width: 100%;
    min-height: 120px;
  }
</style>
