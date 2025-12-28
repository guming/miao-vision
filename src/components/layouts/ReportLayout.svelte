<!--
  Report Layout Component

  Main layout for multi-page reports.
  Integrates sidebar navigation, breadcrumbs, and content router.
-->
<script lang="ts">
  import Sidebar from '@/components/navigation/Sidebar.svelte'
  import Breadcrumbs from '@/components/navigation/Breadcrumbs.svelte'
  import Router from '@core/router/Router.svelte'
  import { PageTreeBuilder } from '@core/pages'
  import type { Route } from '@core/router/matcher'
  import type { ReportPage, PageTree } from '@/types/page-structure'

  interface Props {
    routes: Route[]
    pages: ReportPage[]
    fallback?: any
  }

  let { routes, pages, fallback }: Props = $props()

  // Sidebar toggle state
  let sidebarOpen = $state(true)

  // Build page tree from pages
  let pageTree = $derived.by((): PageTree => {
    const builder = new PageTreeBuilder()
    return builder.build(pages)
  })

  /**
   * Toggle sidebar visibility
   */
  function toggleSidebar(): void {
    sidebarOpen = !sidebarOpen
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeydown(e: KeyboardEvent): void {
    // Cmd/Ctrl + B to toggle sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      toggleSidebar()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="report-layout">
  <!-- Sidebar -->
  {#if sidebarOpen}
    <aside class="layout-sidebar">
      <Sidebar tree={pageTree.root} />
    </aside>
  {/if}

  <!-- Main Content Area -->
  <div class="layout-main">
    <!-- Toolbar -->
    <div class="layout-toolbar">
      <button
        type="button"
        class="sidebar-toggle"
        onclick={toggleSidebar}
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        title={sidebarOpen ? 'Hide sidebar (⌘B)' : 'Show sidebar (⌘B)'}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 10H17M3 5H17M3 15H17"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <Breadcrumbs tree={pageTree} />
    </div>

    <!-- Page Content -->
    <div class="layout-content">
      <Router {routes} {fallback} />
    </div>
  </div>
</div>

<style>
  .report-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* Sidebar */
  .layout-sidebar {
    flex-shrink: 0;
    height: 100vh;
    overflow: hidden;
  }

  /* Main Content */
  .layout-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--color-background, #f9fafb);
  }

  /* Toolbar */
  .layout-toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--color-surface, #fff);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    z-index: 10;
  }

  .sidebar-toggle {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin: 0.5rem;
    padding: 0;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--color-text-secondary, #6b7280);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sidebar-toggle:hover {
    background: var(--color-hover, #f3f4f6);
    color: var(--color-text-primary, #111827);
  }

  .sidebar-toggle:active {
    transform: scale(0.95);
  }

  /* Page Content */
  .layout-content {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }

  .layout-content::-webkit-scrollbar {
    width: 8px;
  }

  .layout-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .layout-content::-webkit-scrollbar-thumb {
    background: var(--color-border, #e5e7eb);
    border-radius: 4px;
  }

  .layout-content::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-tertiary, #9ca3af);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .layout-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 20;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    }

    .layout-content {
      padding: 1rem;
    }
  }

  @media (max-width: 640px) {
    .layout-content {
      padding: 0.75rem;
    }
  }
</style>
