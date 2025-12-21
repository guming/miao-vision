<script lang="ts">
  import type { SliderData } from './types'
  import type { InputStore } from '@app/stores'
  import { useNumberInput } from '../use-input.svelte'
  import { fmt } from '@core/shared/format'

  interface Props {
    data: SliderData
    inputStore: InputStore
  }

  let { data, inputStore }: Props = $props()

  // Config is captured at mount - this is intentional as config doesn't change
  const config = data.config
  const min = config.min ?? 0
  const max = config.max ?? 100
  const step = config.step ?? 1
  const showValue = config.showValue ?? true
  const showMinMax = config.showMinMax ?? true
  const input = useNumberInput(inputStore, config.name, config.defaultValue ?? min)

  // Calculate fill percentage for styling
  let fillPercent = $derived(
    ((input.value ?? min) - min) / (max - min) * 100
  )

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement
    input.setValue(Number(target.value))
  }

  function formatDisplayValue(value: number): string {
    if (config.format === 'currency') {
      return fmt(value, 'currency')
    }
    if (config.format === 'percent') {
      return fmt(value / 100, 'percent')
    }
    return fmt(value, 'num0')
  }
</script>

<div class="slider-wrapper">
  {#if config.title}
    <div class="slider-header">
      <label class="slider-label" for={config.name}>
        {config.title}
      </label>
      {#if showValue}
        <span class="slider-value">
          {formatDisplayValue(input.value ?? min)}
        </span>
      {/if}
    </div>
  {:else if showValue}
    <div class="slider-header">
      <span class="slider-value">
        {formatDisplayValue(input.value ?? min)}
      </span>
    </div>
  {/if}

  <div class="slider-container">
    <input
      id={config.name}
      name={config.name}
      type="range"
      class="slider-input"
      {min}
      {max}
      {step}
      value={input.value ?? min}
      oninput={handleInput}
      style="--fill-percent: {fillPercent}%"
    />

    {#if showMinMax}
      <div class="slider-ticks">
        <span class="tick-label">{formatDisplayValue(min)}</span>
        <span class="tick-label">{formatDisplayValue(max)}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .slider-wrapper {
    margin: 1.5rem 0;
    max-width: 400px;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .slider-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
  }

  .slider-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #F3F4F6;
    background: #374151;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .slider-container {
    position: relative;
  }

  .slider-input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    background: linear-gradient(
      to right,
      #667eea 0%,
      #667eea var(--fill-percent),
      #374151 var(--fill-percent),
      #374151 100%
    );
    border-radius: 4px;
    outline: none;
    cursor: pointer;
  }

  .slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #667eea;
    border: 2px solid #F3F4F6;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .slider-input::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    background: #764ba2;
  }

  .slider-input::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #667eea;
    border: 2px solid #F3F4F6;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .slider-input::-moz-range-thumb:hover {
    transform: scale(1.1);
    background: #764ba2;
  }

  .slider-input:focus::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
  }

  .slider-ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
  }

  .tick-label {
    font-size: 0.75rem;
    color: #6B7280;
  }
</style>
