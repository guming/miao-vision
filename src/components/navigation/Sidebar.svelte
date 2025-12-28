<!--
  Sidebar Component

  Hierarchical navigation sidebar with expand/collapse support.
  Automatically expands current path ancestors.
-->
<script lang="ts">
  import { router } from '@core/router/state.svelte'
  import SidebarItem from './SidebarItem.svelte'
  import type { PageNode } from '@/types/page-structure'

  interface Props {
    tree: PageNode[]
  }

  let { tree }: Props = $props()

  // Track expanded paths
  let expandedPaths = $state(new Set<string>(['/']))

  /**
   * Auto-expand ancestors of current path
   */
  $effect(() => {
    const currentPath = router.currentPath

    // Expand all ancestor paths
    const parts = currentPath.split('/').filter(Boolean)
    for (let i = 1; i <= parts.length; i++) {
      const ancestorPath = '/' + parts.slice(0, i).join('/')
      expandedPaths.add(ancestorPath)
    }

    // Force reactivity update
    expandedPaths = new Set(expandedPaths)
  })

  /**
   * Toggle expand/collapse state
   */
  function toggleExpand(path: string): void {
    if (expandedPaths.has(path)) {
      expandedPaths.delete(path)
    } else {
      expandedPaths.add(path)
    }

    // Force reactivity update
    expandedPaths = new Set(expandedPaths)
  }
</script>

<nav class="sidebar">
  <div class="sidebar-header">
    <h3>Navigation</h3>
  </div>

  <ul class="sidebar-tree">
    {#each tree as node (node.id)}
      {#if !node.metadata?.hidden}
        <SidebarItem
          {node}
          expanded={expandedPaths.has(node.path)}
          onToggle={() => toggleExpand(node.path)}
        />
      {/if}
    {/each}
  </ul>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 260px;
    height: 100vh;
    background: var(--color-surface, #fff);
    border-right: 1px solid var(--color-border, #e5e7eb);
    overflow-y: auto;
  }

  .sidebar-header {
    padding: 1.5rem 1rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary, #6b7280);
  }

  .sidebar-tree {
    list-style: none;
    margin: 0;
    padding: 0.5rem 0;
  }

  /* Scrollbar styling */
  .sidebar::-webkit-scrollbar {
    width: 6px;
  }

  .sidebar::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar::-webkit-scrollbar-thumb {
    background: var(--color-border, #e5e7eb);
    border-radius: 3px;
  }

  .sidebar::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-tertiary, #9ca3af);
  }
</style>
