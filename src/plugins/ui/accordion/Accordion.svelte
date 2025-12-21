<script lang="ts">
  import type { AccordionData } from './types'

  interface Props {
    data: AccordionData
  }

  let { data }: Props = $props()

  // Extract config values reactively
  const config = $derived(data.config)
  const multiple = $derived(config.multiple ?? false)
  const bordered = $derived(config.bordered !== false)
  const compact = $derived(config.compact ?? false)

  // Track expanded state for each item
  let expandedItems = $state<Set<number>>(new Set())
  let initialized = $state(false)

  // Initialize expanded items on first render
  $effect.pre(() => {
    if (!initialized) {
      const initialExpanded = new Set(
        data.items
          .map((item, idx) => item.expanded ? idx : -1)
          .filter(idx => idx >= 0)
      )
      // If defaultExpanded is set and no items are expanded, expand that one
      if (initialExpanded.size === 0 && data.config.defaultExpanded !== undefined) {
        initialExpanded.add(data.config.defaultExpanded)
      }
      expandedItems = initialExpanded
      initialized = true
    }
  })

  function toggleItem(index: number) {
    const newExpanded = new Set(expandedItems)

    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      if (!multiple) {
        // Single mode: close all others
        newExpanded.clear()
      }
      newExpanded.add(index)
    }

    expandedItems = newExpanded
  }

  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleItem(index)
    }
  }

  function isExpanded(index: number): boolean {
    return expandedItems.has(index)
  }
</script>

<div class="accordion-container" class:bordered class:compact>
  {#each data.items as item, index}
    <div class="accordion-item" class:expanded={isExpanded(index)}>
      <button
        class="accordion-header"
        onclick={() => toggleItem(index)}
        onkeydown={(e) => handleKeyDown(e, index)}
        aria-expanded={isExpanded(index)}
        aria-controls={`accordion-content-${index}`}
      >
        <div class="header-content">
          {#if item.icon}
            <span class="header-icon">{item.icon}</span>
          {/if}
          <span class="header-title">{item.title}</span>
        </div>
        <span class="expand-icon" class:rotated={isExpanded(index)}>
          ▶
        </span>
      </button>

      <div
        class="accordion-content"
        id={`accordion-content-${index}`}
        class:visible={isExpanded(index)}
        role="region"
        aria-labelledby={`accordion-header-${index}`}
      >
        <div class="content-inner">
          {@html item.content}
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  .accordion-container {
    margin: 1.5rem 0;
  }

  .accordion-container.bordered {
    border: 1px solid #4B5563;
    border-radius: 8px;
    overflow: hidden;
  }

  .accordion-item {
    border-bottom: 1px solid #374151;
  }

  .accordion-item:last-child {
    border-bottom: none;
  }

  .accordion-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: #1F2937;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
  }

  .compact .accordion-header {
    padding: 0.75rem 1rem;
  }

  .accordion-header:hover {
    background: #374151;
  }

  .accordion-item.expanded .accordion-header {
    background: #374151;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-icon {
    font-size: 1.25rem;
  }

  .compact .header-icon {
    font-size: 1rem;
  }

  .header-title {
    font-size: 0.9375rem;
    font-weight: 500;
    color: #F3F4F6;
  }

  .compact .header-title {
    font-size: 0.875rem;
  }

  .expand-icon {
    font-size: 0.75rem;
    color: #9CA3AF;
    transition: transform 0.3s ease;
  }

  .expand-icon.rotated {
    transform: rotate(90deg);
  }

  .accordion-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
    background: #111827;
  }

  .accordion-content.visible {
    max-height: 1000px;
    transition: max-height 0.5s ease-in;
  }

  .content-inner {
    padding: 1rem 1.25rem;
    color: #D1D5DB;
    line-height: 1.6;
  }

  .compact .content-inner {
    padding: 0.75rem 1rem;
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

  /* Not bordered variant */
  .accordion-container:not(.bordered) .accordion-item {
    border-radius: 8px;
    margin-bottom: 0.5rem;
    overflow: hidden;
  }

  .accordion-container:not(.bordered) .accordion-item:last-child {
    margin-bottom: 0;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .accordion-header {
      padding: 0.875rem 1rem;
    }

    .header-title {
      font-size: 0.875rem;
    }

    .content-inner {
      padding: 0.875rem 1rem;
      font-size: 0.875rem;
    }
  }
</style>
