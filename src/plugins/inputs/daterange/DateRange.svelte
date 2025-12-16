<script lang="ts">
  import type { DateRangeData, DateRangePreset } from './types'
  import type { InputStore } from '@app/stores'
  import { useStringInput } from '../use-input.svelte'

  interface Props {
    data: DateRangeData
    inputStore: InputStore
  }

  let { data, inputStore }: Props = $props()

  const config = data.config
  const presets = data.presets

  // Create two inputs: one for start, one for end
  const startInput = useStringInput(
    inputStore,
    `${config.name}_start`,
    config.startDefault || getDefaultStart()
  )

  const endInput = useStringInput(
    inputStore,
    `${config.name}_end`,
    config.endDefault || getDefaultEnd()
  )

  // Also store the combined value for convenience
  const combinedInput = useStringInput(
    inputStore,
    config.name,
    `${config.startDefault || getDefaultStart()}:${config.endDefault || getDefaultEnd()}`
  )

  function getDefaultStart(): string {
    // Default to 30 days ago
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  }

  function getDefaultEnd(): string {
    return new Date().toISOString().split('T')[0]
  }

  function handleStartChange(event: Event) {
    const target = event.target as HTMLInputElement
    startInput.setValue(target.value)
    updateCombined(target.value, endInput.value || '')
  }

  function handleEndChange(event: Event) {
    const target = event.target as HTMLInputElement
    endInput.setValue(target.value)
    updateCombined(startInput.value || '', target.value)
  }

  function updateCombined(start: string, end: string) {
    combinedInput.setValue(`${start}:${end}`)
  }

  function applyPreset(preset: DateRangePreset) {
    const start = typeof preset.start === 'function' ? preset.start() : preset.start
    const end = typeof preset.end === 'function' ? preset.end() : preset.end

    startInput.setValue(start)
    endInput.setValue(end)
    updateCombined(start, end)
  }

  // Track active preset
  let activePreset = $derived(() => {
    const start = startInput.value
    const end = endInput.value

    for (const preset of presets) {
      const presetStart = typeof preset.start === 'function' ? preset.start() : preset.start
      const presetEnd = typeof preset.end === 'function' ? preset.end() : preset.end

      if (start === presetStart && end === presetEnd) {
        return preset.value
      }
    }
    return null
  })
</script>

<div class="daterange-wrapper">
  {#if config.title}
    <label class="daterange-label">
      {config.title}
    </label>
  {/if}

  <!-- Presets -->
  {#if presets.length > 0}
    <div class="daterange-presets">
      {#each presets as preset}
        <button
          type="button"
          class="preset-btn"
          class:active={activePreset() === preset.value}
          onclick={() => applyPreset(preset)}
        >
          {preset.label}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Date Inputs -->
  <div class="daterange-inputs">
    <div class="date-field">
      <span class="date-label">From</span>
      <input
        type="date"
        class="date-input"
        value={startInput.value || ''}
        min={config.minDate}
        max={endInput.value || config.maxDate}
        onchange={handleStartChange}
      />
    </div>

    <span class="date-separator">→</span>

    <div class="date-field">
      <span class="date-label">To</span>
      <input
        type="date"
        class="date-input"
        value={endInput.value || ''}
        min={startInput.value || config.minDate}
        max={config.maxDate}
        onchange={handleEndChange}
      />
    </div>
  </div>
</div>

<style>
  .daterange-wrapper {
    margin: 1.5rem 0;
  }

  .daterange-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
    margin-bottom: 0.75rem;
  }

  .daterange-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .preset-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #D1D5DB;
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .preset-btn:hover {
    background: #374151;
    border-color: #6B7280;
  }

  .preset-btn.active {
    background: #667eea;
    border-color: #667eea;
    color: white;
  }

  .daterange-inputs {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .date-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .date-label {
    font-size: 0.75rem;
    color: #6B7280;
  }

  .date-input {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    color: #F3F4F6;
    background-color: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .date-input:hover {
    border-color: #9CA3AF;
  }

  .date-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  /* Dark mode calendar icon */
  .date-input::-webkit-calendar-picker-indicator {
    filter: invert(0.8);
    cursor: pointer;
  }

  .date-separator {
    color: #6B7280;
    font-size: 1.25rem;
    margin-top: 1.25rem;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .daterange-inputs {
      flex-direction: column;
      align-items: stretch;
    }

    .date-separator {
      display: none;
    }

    .date-input {
      width: 100%;
    }
  }
</style>
