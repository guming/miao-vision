<script lang="ts">
  import type { DropdownData } from './types'
  import type { InputStore } from '@/lib/stores/report-inputs'

  interface Props {
    data: DropdownData
    inputStore: InputStore
  }

  let { data, inputStore }: Props = $props()

  let currentValue = $state<string | null>(data.config.defaultValue || null)

  function handleChange(event: Event) {
    const select = event.target as HTMLSelectElement
    const newValue = select.value || null
    inputStore.setValue(data.config.name, newValue)
  }

  $effect(() => {
    if (data.config.defaultValue && !inputStore.has(data.config.name)) {
      inputStore.setValue(data.config.name, data.config.defaultValue)
    }
  })

  $effect(() => {
    const unsubscribe = inputStore.subscribe(state => {
      const storeValue = state[data.config.name]
      if (storeValue !== undefined && storeValue !== currentValue) {
        currentValue = storeValue as string | null
      }
    })

    return () => unsubscribe()
  })
</script>

<div class="dropdown-input">
  {#if data.config.title}
    <label class="dropdown-label" for={data.config.name}>
      {data.config.title}
    </label>
  {/if}

  <select
    id={data.config.name}
    name={data.config.name}
    class="dropdown-select"
    value={currentValue || ''}
    onchange={handleChange}
    multiple={data.config.multiple}
  >
    {#if !data.config.multiple}
      <option value="">
        {data.config.placeholder || 'Select...'}
      </option>
    {/if}

    {#each data.options as option}
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
