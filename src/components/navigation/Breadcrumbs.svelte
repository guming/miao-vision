<!--
  Breadcrumbs Component

  Navigation breadcrumbs showing path from root to current page.
  Auto-generates breadcrumbs from current router path and page tree.
-->
<script lang="ts">
  import { router } from '@core/router/state.svelte'
  import Link from '@core/router/Link.svelte'
  import type { PageTree, PageNode } from '@/types/page-structure'

  interface Props {
    tree: PageTree
  }

  let { tree }: Props = $props()

  interface Breadcrumb {
    path: string
    title: string
  }

  /**
   * Generate breadcrumbs from current path
   */
  let breadcrumbs = $derived.by((): Breadcrumb[] => {
    const currentPath = router.currentPath
    const crumbs: Breadcrumb[] = []

    // Always start with home
    const homeNode = findNodeByPath(tree.root, '/')
    crumbs.push({
      path: '/',
      title: homeNode?.title ?? 'Home'
    })

    // Don't add more crumbs if we're at home
    if (currentPath === '/') {
      return crumbs
    }

    // Build breadcrumbs from path segments
    const parts = currentPath.split('/').filter(Boolean)

    for (let i = 0; i < parts.length; i++) {
      const path = '/' + parts.slice(0, i + 1).join('/')
      const node = findNodeByPath(tree.root, path)

      crumbs.push({
        path,
        title: node?.title ?? parts[i]
      })
    }

    return crumbs
  })

  /**
   * Find node by path in tree (recursive)
   */
  function findNodeByPath(
    nodes: PageNode[],
    path: string
  ): PageNode | null {
    for (const node of nodes) {
      if (node.path === path) {
        return node
      }

      if (node.children?.length > 0) {
        const found = findNodeByPath(node.children, path)
        if (found) return found
      }
    }

    return null
  }
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    {#each breadcrumbs as crumb, i (crumb.path)}
      <li class="breadcrumb-item">
        {#if i > 0}
          <span class="separator" aria-hidden="true">/</span>
        {/if}

        {#if i === breadcrumbs.length - 1}
          <span class="current" aria-current="page">{crumb.title}</span>
        {:else}
          <Link to={crumb.path} class="breadcrumb-link">
            {crumb.title}
          </Link>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .breadcrumbs {
    padding: 0.75rem 1.5rem;
    background: var(--color-surface, #fff);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .breadcrumb-list {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .separator {
    color: var(--color-text-tertiary, #9ca3af);
    user-select: none;
  }

  .breadcrumb-link {
    color: var(--color-text-secondary, #6b7280);
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .breadcrumb-link:hover {
    color: var(--color-primary, #2563eb);
    text-decoration: underline;
  }

  .current {
    color: var(--color-text-primary, #111827);
    font-weight: 600;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .breadcrumbs {
      padding: 0.5rem 1rem;
    }

    .breadcrumb-list {
      font-size: 0.8125rem;
    }
  }
</style>
