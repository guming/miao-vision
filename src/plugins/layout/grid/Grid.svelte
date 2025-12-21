<script lang="ts">
  import type { GridData } from './types'
  import type { Snippet } from 'svelte'

  interface Props {
    data: GridData
    children?: Snippet
  }

  let { data, children }: Props = $props()

  // Extract config values reactively
  const config = $derived(data.config)
  const columns = $derived(config.columns || 12)
  const gap = $derived(config.gap || '1rem')
  const rowHeight = $derived(config.rowHeight || 'auto')
  const minRowHeight = $derived(config.minRowHeight || '100px')
</script>

<div
  class="dashboard-grid"
  style="
    --columns: {columns};
    --gap: {gap};
    --row-height: {rowHeight};
    --min-row-height: {minRowHeight};
  "
>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(var(--columns, 12), 1fr);
    gap: var(--gap, 1rem);
    grid-auto-rows: minmax(var(--min-row-height, 100px), var(--row-height, auto));
    width: 100%;
    margin: 1.5rem 0;
  }

  /* Responsive breakpoints */
  @media (max-width: 1200px) {
    .dashboard-grid {
      grid-template-columns: repeat(min(var(--columns, 12), 6), 1fr);
    }
  }

  @media (max-width: 768px) {
    .dashboard-grid {
      grid-template-columns: repeat(min(var(--columns, 12), 2), 1fr);
    }
  }

  @media (max-width: 480px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Grid item styling via global styles */
  :global(.dashboard-grid > .grid-item) {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 1rem;
    overflow: hidden;
  }

  :global(.dashboard-grid > .grid-item.no-padding) {
    padding: 0;
  }

  :global(.dashboard-grid > .grid-item-title) {
    font-size: 0.875rem;
    font-weight: 600;
    color: #9CA3AF;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
</style>
