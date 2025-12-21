<script lang="ts">
  import type { NoteData, NoteType } from './types'

  interface Props {
    data: NoteData
  }

  let { data }: Props = $props()

  // Extract config values reactively
  const config = $derived(data.config)
  const type = $derived(config.type ?? 'note')
  const collapsible = $derived(config.collapsible ?? false)

  let isOpen = $state(true)
  let initialized = $state(false)

  $effect.pre(() => {
    if (!initialized) {
      isOpen = data.config.defaultOpen !== false
      initialized = true
    }
  })

  // Type configurations
  const typeConfig: Record<NoteType, { icon: string; label: string }> = {
    note: { icon: '📝', label: 'Note' },
    tip: { icon: '💡', label: 'Tip' },
    important: { icon: '❗', label: 'Important' },
    warning: { icon: '⚠️', label: 'Warning' },
    caution: { icon: '🔴', label: 'Caution' }
  }

  const icon = $derived(typeConfig[type].icon)
  const label = $derived(typeConfig[type].label)
  const title = $derived(config.title ?? label)

  function toggle() {
    if (collapsible) {
      isOpen = !isOpen
    }
  }
</script>

<div class="note note-{type}" class:collapsible>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="note-header"
    class:clickable={collapsible}
    onclick={toggle}
    role={collapsible ? 'button' : undefined}
    tabindex={collapsible ? 0 : undefined}
    onkeydown={collapsible ? (e) => (e.key === 'Enter' || e.key === ' ') && toggle() : undefined}
  >
    <span class="note-icon">{icon}</span>
    <span class="note-title">{title}</span>
    {#if collapsible}
      <span class="note-toggle" class:open={isOpen}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    {/if}
  </div>

  {#if !collapsible || isOpen}
    <div class="note-content">
      {@html data.content}
    </div>
  {/if}
</div>

<style>
  .note {
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
  }

  .note-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .note-header.clickable {
    cursor: pointer;
    user-select: none;
  }

  .note-header.clickable:hover {
    opacity: 0.9;
  }

  .note-icon {
    font-size: 1rem;
  }

  .note-title {
    flex: 1;
  }

  .note-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    transition: transform 0.2s ease;
  }

  .note-toggle svg {
    width: 16px;
    height: 16px;
  }

  .note-toggle.open {
    transform: rotate(90deg);
  }

  .note-content {
    padding: 0.75rem 1rem 1rem 1rem;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .note-content :global(p) {
    margin: 0 0 0.5rem 0;
  }

  .note-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .note-content :global(ul),
  .note-content :global(ol) {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }

  .note-content :global(li) {
    margin: 0.25rem 0;
  }

  .note-content :global(code) {
    background: rgba(0, 0, 0, 0.2);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.8125rem;
  }

  /* Note (default - blue) */
  .note-note {
    background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%);
    border-left: 4px solid #3b82f6;
  }
  .note-note .note-header {
    color: #60a5fa;
  }
  .note-note .note-content {
    color: #bfdbfe;
  }

  /* Tip (green) */
  .note-tip {
    background: linear-gradient(135deg, #14532d 0%, #1e293b 100%);
    border-left: 4px solid #22c55e;
  }
  .note-tip .note-header {
    color: #4ade80;
  }
  .note-tip .note-content {
    color: #bbf7d0;
  }

  /* Important (purple) */
  .note-important {
    background: linear-gradient(135deg, #3b0764 0%, #1e293b 100%);
    border-left: 4px solid #a855f7;
  }
  .note-important .note-header {
    color: #c084fc;
  }
  .note-important .note-content {
    color: #e9d5ff;
  }

  /* Warning (amber) */
  .note-warning {
    background: linear-gradient(135deg, #451a03 0%, #1e293b 100%);
    border-left: 4px solid #f59e0b;
  }
  .note-warning .note-header {
    color: #fbbf24;
  }
  .note-warning .note-content {
    color: #fde68a;
  }

  /* Caution (red) */
  .note-caution {
    background: linear-gradient(135deg, #450a0a 0%, #1e293b 100%);
    border-left: 4px solid #ef4444;
  }
  .note-caution .note-header {
    color: #f87171;
  }
  .note-caution .note-content {
    color: #fecaca;
  }
</style>
