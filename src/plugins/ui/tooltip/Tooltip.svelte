<script lang="ts">
  import type { TooltipData } from './types'

  interface Props {
    data: TooltipData
  }

  let { data }: Props = $props()

  // Extract config values reactively
  const config = $derived(data.config)
  const position = $derived(config.position || 'top')
  const delay = $derived(config.delay || 200)

  let visible = $state(false)
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  function showTooltip() {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      visible = true
    }, delay)
  }

  function hideTooltip() {
    if (timeoutId) clearTimeout(timeoutId)
    visible = false
  }
</script>

<span
  class="tooltip-container"
  onmouseenter={showTooltip}
  onmouseleave={hideTooltip}
  onfocus={showTooltip}
  onblur={hideTooltip}
  role="button"
  tabindex="0"
>
  <span class="tooltip-trigger">
    {#if data.icon}
      <span class="trigger-icon">{data.icon}</span>
    {/if}
    <span class="trigger-text">{data.trigger}</span>
  </span>

  <span
    class="tooltip-content position-{position}"
    class:visible
    role="tooltip"
  >
    <span class="tooltip-arrow"></span>
    <span class="tooltip-text">{data.text}</span>
  </span>
</span>

<style>
  .tooltip-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: help;
  }

  .tooltip-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.25rem;
    border-radius: 4px;
    border-bottom: 1px dashed #6B7280;
    transition: background 0.2s;
  }

  .tooltip-trigger:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  .trigger-icon {
    font-size: 0.875rem;
  }

  .trigger-text {
    color: #D1D5DB;
    font-size: inherit;
  }

  .tooltip-content {
    position: absolute;
    z-index: 1000;
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    white-space: nowrap;
    max-width: 300px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s, visibility 0.2s;
    pointer-events: none;
  }

  .tooltip-content.visible {
    opacity: 1;
    visibility: visible;
  }

  .tooltip-text {
    color: #F3F4F6;
    font-size: 0.8125rem;
    line-height: 1.4;
    white-space: normal;
  }

  .tooltip-arrow {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #1F2937;
    border: 1px solid #4B5563;
    transform: rotate(45deg);
  }

  /* Position: Top */
  .position-top {
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
  }

  .position-top .tooltip-arrow {
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    border-top: none;
    border-left: none;
  }

  /* Position: Bottom */
  .position-bottom {
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
  }

  .position-bottom .tooltip-arrow {
    top: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    border-bottom: none;
    border-right: none;
  }

  /* Position: Left */
  .position-left {
    right: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
  }

  .position-left .tooltip-arrow {
    right: -5px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    border-left: none;
    border-bottom: none;
  }

  /* Position: Right */
  .position-right {
    left: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
  }

  .position-right .tooltip-arrow {
    left: -5px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    border-right: none;
    border-top: none;
  }

  /* Responsive - force top position on mobile */
  @media (max-width: 640px) {
    .tooltip-content {
      max-width: 200px;
      font-size: 0.75rem;
    }

    .position-left,
    .position-right {
      left: 50%;
      right: auto;
      top: auto;
      bottom: calc(100% + 8px);
      transform: translateX(-50%);
    }

    .position-left .tooltip-arrow,
    .position-right .tooltip-arrow {
      bottom: -5px;
      left: 50%;
      top: auto;
      right: auto;
      transform: translateX(-50%) rotate(45deg);
      border-top: none;
      border-left: none;
      border-bottom: 1px solid #4B5563;
      border-right: 1px solid #4B5563;
    }
  }
</style>
