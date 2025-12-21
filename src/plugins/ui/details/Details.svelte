<script lang="ts">
  import type { DetailsData } from './types'

  interface Props {
    data: DetailsData
  }

  let { data }: Props = $props()

  // Extract config values reactively
  const config = $derived(data.config)
  const bordered = $derived(config.bordered !== false)

  let isOpen = $state(false)
  let initialized = $state(false)

  $effect.pre(() => {
    if (!initialized) {
      isOpen = data.config.defaultOpen ?? false
      initialized = true
    }
  })

  function toggle() {
    isOpen = !isOpen
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
  }
</script>

<div class="details-container" class:bordered class:open={isOpen}>
  <button
    class="details-header"
    onclick={toggle}
    onkeydown={handleKeyDown}
    aria-expanded={isOpen}
  >
    <div class="header-content">
      {#if config.icon}
        <span class="header-icon">{config.icon}</span>
      {/if}
      <span class="header-title">{config.title}</span>
    </div>
    <span class="expand-icon" class:rotated={isOpen}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  </button>

  <div class="details-content" class:visible={isOpen}>
    <div class="content-inner">
      {@html data.content}
    </div>
  </div>
</div>

<style>
  .details-container {
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
  }

  .details-container.bordered {
    border: 1px solid #4B5563;
  }

  .details-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    background: #1F2937;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
  }

  .details-header:hover {
    background: #374151;
  }

  .details-container.open .details-header {
    background: #374151;
  }

  .details-header:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px rgba(102, 126, 234, 0.5);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-icon {
    font-size: 1rem;
  }

  .header-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #F3F4F6;
  }

  .expand-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: #9CA3AF;
    transition: transform 0.2s ease;
  }

  .expand-icon svg {
    width: 16px;
    height: 16px;
  }

  .expand-icon.rotated {
    transform: rotate(90deg);
  }

  .details-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
    background: #111827;
  }

  .details-content.visible {
    max-height: 2000px;
    transition: max-height 0.5s ease-in;
  }

  .content-inner {
    padding: 1rem;
    color: #D1D5DB;
    line-height: 1.6;
    font-size: 0.875rem;
  }

  .content-inner :global(p) {
    margin: 0 0 0.75rem 0;
  }

  .content-inner :global(p:last-child) {
    margin-bottom: 0;
  }

  .content-inner :global(ul),
  .content-inner :global(ol) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .content-inner :global(li) {
    margin: 0.25rem 0;
  }

  .content-inner :global(code) {
    background: #374151;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.8125rem;
  }

  .content-inner :global(pre) {
    background: #374151;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0.75rem 0;
  }

  .content-inner :global(pre code) {
    background: none;
    padding: 0;
  }

  /* Not bordered variant */
  .details-container:not(.bordered) {
    background: #1F2937;
  }

  .details-container:not(.bordered) .details-content {
    background: #1F2937;
    border-top: 1px solid #374151;
  }
</style>
