<script lang="ts">
  import type { GridItemConfig } from './types'
  import type { Snippet } from 'svelte'

  interface Props {
    config: GridItemConfig
    children?: Snippet
  }

  let { config, children }: Props = $props()

  // Extract config values reactively
  const col = $derived(config.col || 'auto')
  const row = $derived(config.row || 'auto')
  const colSpan = $derived(config.colSpan || 1)
  const rowSpan = $derived(config.rowSpan || 1)
  const title = $derived(config.title)
  const padding = $derived(config.padding !== false)
</script>

<div
  class="grid-item"
  class:no-padding={!padding}
  style="
    grid-column: {col} / span {colSpan};
    grid-row: {row} / span {rowSpan};
  "
>
  {#if title}
    <div class="grid-item-title">{title}</div>
  {/if}
  <div class="grid-item-content">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  .grid-item {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 1rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .grid-item.no-padding {
    padding: 0;
  }

  .grid-item-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #9CA3AF;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .grid-item-content {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  /* Responsive - stack on mobile */
  @media (max-width: 480px) {
    .grid-item {
      grid-column: 1 / -1 !important;
    }
  }
</style>
