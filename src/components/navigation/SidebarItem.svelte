<!--
  Sidebar Item Component

  Recursive sidebar item with expand/collapse support.
  Displays page link with icon, nesting level, and children.
-->
<script lang="ts">
  import { router } from '@core/router/state.svelte'
  import Link from '@core/router/Link.svelte'
  import type { PageNode } from '@/types/page-structure'

  interface Props {
    node: PageNode
    expanded?: boolean
    onToggle?: () => void
    level?: number
  }

  let { node, expanded = false, onToggle, level = 0 }: Props = $props()

  // Check if node has children
  let hasChildren = $derived(
    node.children?.filter(child => !child.metadata?.hidden).length > 0
  )

  // Check if current path matches
  let isActive = $derived(router.currentPath === node.path)

  // Calculate indentation
  let indentStyle = $derived(`padding-left: ${level * 1.25 + 1}rem`)
</script>

<li class="sidebar-item">
  <div class="item-wrapper" style={indentStyle}>
    <!-- Expand/Collapse Button -->
    {#if hasChildren}
      <button
        type="button"
        class="expand-btn"
        class:expanded
        onclick={(e) => {
          e.stopPropagation()
          onToggle?.()
        }}
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.5 3L7.5 6L4.5 9"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    {:else}
      <span class="expand-spacer"></span>
    {/if}

    <!-- Page Link -->
    <Link to={node.path} class="item-link" class:active={isActive}>
      {#if node.icon}
        <span class="item-icon">{node.icon}</span>
      {/if}
      <span class="item-title">
        {node.title}
        {#if node.isTemplate}
          <span class="template-badge">T</span>
        {/if}
      </span>
    </Link>
  </div>

  <!-- Children (recursive) -->
  {#if hasChildren && expanded}
    <ul class="sidebar-children">
      {#each node.children as child (child.id)}
        {#if !child.metadata?.hidden}
          <svelte:self
            node={child}
            level={level + 1}
            expanded={expanded}
            onToggle={onToggle}
          />
        {/if}
      {/each}
    </ul>
  {/if}
</li>

<style>
  .sidebar-item {
    list-style: none;
    margin: 0;
  }

  .item-wrapper {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding-right: 1rem;
    transition: background 0.15s ease;
  }

  .item-wrapper:hover {
    background: var(--color-hover, #f3f4f6);
  }

  /* Expand button */
  .expand-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-tertiary, #9ca3af);
    transition: transform 0.2s ease;
  }

  .expand-btn:hover {
    color: var(--color-text-secondary, #6b7280);
  }

  .expand-btn.expanded {
    transform: rotate(90deg);
  }

  .expand-spacer {
    width: 20px;
    flex-shrink: 0;
  }

  /* Link */
  .item-link {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: var(--color-text-primary, #111827);
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.875rem;
    line-height: 1.25rem;
    transition: all 0.15s ease;
  }

  .item-link:hover {
    background: var(--color-hover, #f3f4f6);
    text-decoration: none;
  }

  .item-link.active {
    background: var(--color-primary-bg, #dbeafe);
    color: var(--color-primary, #2563eb);
    font-weight: 600;
  }

  /* Icon */
  .item-icon {
    flex-shrink: 0;
    font-size: 1rem;
  }

  /* Title */
  .item-title {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Template badge */
  .template-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-size: 0.625rem;
    font-weight: 600;
    color: var(--color-primary, #2563eb);
    background: var(--color-primary-bg, #dbeafe);
    border-radius: 3px;
  }

  /* Children */
  .sidebar-children {
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
