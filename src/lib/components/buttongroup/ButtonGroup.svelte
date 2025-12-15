<script lang="ts">
  import type { ButtonGroupData } from './types'
  import type { InputStore } from '@/lib/stores/report-inputs'

  interface Props {
    data: ButtonGroupData
    inputStore: InputStore
  }

  let { data, inputStore }: Props = $props()

  let currentValue = $state<string | null>(data.config.defaultValue || null)

  function handleClick(value: string) {
    inputStore.setValue(data.config.name, value)
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

<div class="buttongroup-input">
  {#if data.config.title}
    <label class="buttongroup-label">
      {data.config.title}
    </label>
  {/if}

  <div class="button-group">
    {#each data.options as option}
      <button
        type="button"
        class="group-button"
        class:active={currentValue === option.value}
        onclick={() => handleClick(option.value)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .buttongroup-input {
    margin: 1.5rem 0;
  }

  .buttongroup-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
    margin-bottom: 0.5rem;
  }

  .button-group {
    display: inline-flex;
    border-radius: 0.75rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .group-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
    background-color: #1F2937;
    border: 1px solid #4B5563;
    border-right-width: 0;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .group-button:last-child {
    border-right-width: 1px;
  }

  .group-button:hover:not(.active) {
    background-color: #374151;
    color: #F3F4F6;
  }

  .group-button.active {
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 50%, #EC4899 100%);
    color: #ffffff;
    border-color: transparent;
    z-index: 1;
  }

  .group-button:focus {
    outline: none;
    z-index: 2;
    box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.2);
  }
</style>
