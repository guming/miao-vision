<script lang="ts">
  import type { TextInputData } from './types'
  import type { InputStore } from '@app/stores'
  import { useStringInput } from '../use-input.svelte'

  interface Props {
    data: TextInputData
    inputStore: InputStore
  }

  let { data, inputStore }: Props = $props()

  // Extract config values reactively
  const config = $derived(data.config)
  const input = $derived.by(() => useStringInput(inputStore, config.name, config.defaultValue || ''))

  // Local state for debouncing - track user input separately
  let localValue = $state('')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let isUserTyping = $state(false)
  let initialized = $state(false)

  const debounceMs = $derived(config.debounce ?? 300)
  const minLength = $derived(config.minLength ?? 0)

  // Initialize local value on first render
  $effect.pre(() => {
    if (!initialized) {
      localValue = data.config.defaultValue || ''
      initialized = true
    }
  })

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement
    isUserTyping = true
    localValue = target.value

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Debounce the store update
    debounceTimer = setTimeout(() => {
      // Only update if meets minimum length (or is empty to allow clearing)
      if (localValue.length >= minLength || localValue.length === 0) {
        input.setValue(localValue || null)
      }
      isUserTyping = false
    }, debounceMs)
  }

  function handleClear() {
    localValue = ''
    input.setValue(null)
    isUserTyping = false
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Clear on Escape
    if (event.key === 'Escape') {
      handleClear()
    }
    // Immediate submit on Enter
    if (event.key === 'Enter') {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      input.setValue(localValue || null)
      isUserTyping = false
    }
  }

  // Sync with external changes only when not typing
  $effect(() => {
    const storeValue = input.value
    if (!isUserTyping && storeValue !== localValue) {
      localValue = storeValue || ''
    }
  })
</script>

<div class="textinput-wrapper">
  {#if config.title}
    <label class="textinput-label" for={config.name}>
      {config.title}
    </label>
  {/if}

  <div class="textinput-container">
    <input
      id={config.name}
      name={config.name}
      type={config.inputType || 'text'}
      class="textinput-field"
      placeholder={config.placeholder || 'Enter text...'}
      value={localValue}
      maxlength={config.maxLength}
      pattern={config.pattern}
      oninput={handleInput}
      onkeydown={handleKeyDown}
    />

    {#if localValue}
      <button
        type="button"
        class="textinput-clear"
        onclick={handleClear}
        aria-label="Clear input"
      >
        ×
      </button>
    {/if}
  </div>
</div>

<style>
  .textinput-wrapper {
    margin: 1.5rem 0;
  }

  .textinput-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
    margin-bottom: 0.5rem;
  }

  .textinput-container {
    position: relative;
    max-width: 400px;
  }

  .textinput-field {
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 0.75rem;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #F3F4F6;
    background-color: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 6px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    transition: all 0.15s ease;
  }

  .textinput-field::placeholder {
    color: #6B7280;
  }

  .textinput-field:hover {
    border-color: #9CA3AF;
  }

  .textinput-field:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .textinput-clear {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: #9CA3AF;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .textinput-clear:hover {
    background: #374151;
    color: #F3F4F6;
  }

  /* Search input type styling */
  .textinput-field[type="search"]::-webkit-search-cancel-button {
    display: none;
  }
</style>
