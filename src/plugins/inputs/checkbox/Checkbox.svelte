<script lang="ts">
  import type { CheckboxData } from './types'
  import type { InputStore } from '@app/stores'
  import { useBooleanInput } from '../use-input.svelte'

  interface Props {
    data: CheckboxData
    inputStore: InputStore
  }

  let { data, inputStore }: Props = $props()

  // Extract config values reactively
  const config = $derived(data.config)
  const input = $derived.by(() => useBooleanInput(inputStore, config.name, config.defaultValue ?? false))

  function handleClick() {
    input.setValue(!input.value)
  }
</script>

<div class="checkbox-container">
  <button
    type="button"
    class="checkbox-button"
    class:checked={input.value}
    onclick={handleClick}
    aria-pressed={input.value}
  >
    <span class="checkbox-box">
      {#if input.value}
        <svg class="check-icon" viewBox="0 0 12 10" fill="none">
          <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    </span>
    {#if config.label}
      <span class="checkbox-label">{config.label}</span>
    {/if}
  </button>
  {#if config.description}
    <p class="checkbox-description">{config.description}</p>
  {/if}
</div>

<style>
  .checkbox-container {
    margin: 1rem 0;
  }

  .checkbox-button {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    user-select: none;
  }

  .checkbox-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #1F2937;
    border: 2px solid #4B5563;
    border-radius: 4px;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .checkbox-button:hover .checkbox-box {
    border-color: #6B7280;
  }

  .checkbox-button.checked .checkbox-box {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: #667eea;
  }

  .checkbox-button:focus {
    outline: none;
  }

  .checkbox-button:focus .checkbox-box {
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
  }

  .check-icon {
    width: 12px;
    height: 10px;
    color: white;
  }

  .checkbox-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #F3F4F6;
  }

  .checkbox-description {
    margin: 0.5rem 0 0 2rem;
    font-size: 0.75rem;
    color: #9CA3AF;
  }
</style>
