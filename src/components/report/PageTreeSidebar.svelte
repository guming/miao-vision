<script lang="ts">
  import type { ReportPage } from '@/types/report'

  interface Props {
    pages: ReportPage[]
    currentPageId?: string
    onSelectPage: (pageId: string) => void
    onAddPage: () => void
    onEditPage?: (pageId: string) => void
    onDeletePage?: (pageId: string) => void
  }

  let { pages, currentPageId, onSelectPage, onAddPage, onEditPage, onDeletePage }: Props = $props()

  // Build tree structure from flat pages array
  interface PageNode {
    page: ReportPage
    children: PageNode[]
    level: number
  }

  function buildTree(pages: ReportPage[]): PageNode[] {
    const roots: PageNode[] = []
    const nodeMap = new Map<string, PageNode>()

    // Create nodes
    pages.forEach(page => {
      nodeMap.set(page.id, { page, children: [], level: 0 })
    })

    // Build hierarchy
    pages.forEach(page => {
      const node = nodeMap.get(page.id)!
      if (page.parentId) {
        const parent = nodeMap.get(page.parentId)
        if (parent) {
          node.level = parent.level + 1
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    // Sort children by order
    function sortChildren(node: PageNode) {
      node.children.sort((a, b) => a.page.order - b.page.order)
      node.children.forEach(sortChildren)
    }
    roots.forEach(sortChildren)

    return roots
  }

  let tree = $derived(buildTree(pages))

  let expandedNodes = $state<Set<string>>(new Set(pages.map(p => p.id)))

  function toggleExpand(nodeId: string) {
    if (expandedNodes.has(nodeId)) {
      expandedNodes.delete(nodeId)
    } else {
      expandedNodes.add(nodeId)
    }
    expandedNodes = new Set(expandedNodes) // Trigger reactivity
  }

  function handleSelect(pageId: string) {
    onSelectPage(pageId)
  }

  function handleContextMenu(event: MouseEvent, pageId: string) {
    event.preventDefault()
    // TODO: Show context menu with edit/delete options
    console.log('Context menu for page:', pageId)
  }
</script>

<div class="page-tree-sidebar">
  <div class="sidebar-header">
    <h3>Pages</h3>
    <button class="btn-add" onclick={onAddPage} title="Add Page">
      + Add
    </button>
  </div>

  <div class="tree-content">
    {#each tree as node}
      {@render pageNode(node)}
    {/each}
  </div>
</div>

{#snippet pageNode(node: PageNode)}
  <div class="page-node" style="padding-left: {node.level * 1.25}rem">
    <div
      class="page-item"
      class:active={currentPageId === node.page.id}
      onclick={() => handleSelect(node.page.id)}
      oncontextmenu={(e) => handleContextMenu(e, node.page.id)}
      role="button"
      tabindex="0"
    >
      {#if node.children.length > 0}
        <button
          class="expand-btn"
          onclick={(e) => {
            e.stopPropagation()
            toggleExpand(node.page.id)
          }}
        >
          {expandedNodes.has(node.page.id) ? '▼' : '▶'}
        </button>
      {:else}
        <span class="expand-placeholder"></span>
      {/if}

      <span class="page-icon">📄</span>
      <span class="page-title">{node.page.title}</span>
    </div>

    {#if expandedNodes.has(node.page.id)}
      {#each node.children as child}
        {@render pageNode(child)}
      {/each}
    {/if}
  </div>
{/snippet}

<style>
  .page-tree-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #1F2937;
    border-right: 1px solid #374151;
    width: 250px;
    flex-shrink: 0;
  }

  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid #374151;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #D1D5DB;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn-add {
    padding: 0.375rem 0.75rem;
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 50%, #EC4899 100%);
    border: none;
    border-radius: 1rem;
    color: white;
    font-weight: 500;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-add:hover {
    background: linear-gradient(135deg, #3B78E7 0%, #7C4FDB 50%, #D93D85 100%);
    transform: translateY(-1px);
  }

  .tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  }

  .page-node {
    position: relative;
  }

  .page-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    color: #F3F4F6;
    font-size: 0.875rem;
  }

  .page-item:hover {
    background-color: #111827;
  }

  .page-item.active {
    background: linear-gradient(135deg, rgba(66, 133, 244, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%);
    border-left: 3px solid transparent;
    border-image: linear-gradient(to bottom, #4285F4, #EC4899) 1;
    font-weight: 500;
  }

  .expand-btn {
    background: none;
    border: none;
    color: #9CA3AF;
    cursor: pointer;
    padding: 0;
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    transition: color 0.2s;
  }

  .expand-btn:hover {
    color: #F3F4F6;
  }

  .expand-placeholder {
    width: 1rem;
    height: 1rem;
  }

  .page-icon {
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .page-title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Scrollbar styling */
  .tree-content {
    scrollbar-width: thin;
    scrollbar-color: #4B5563 #1F2937;
  }

  .tree-content::-webkit-scrollbar {
    width: 6px;
  }

  .tree-content::-webkit-scrollbar-track {
    background: #1F2937;
  }

  .tree-content::-webkit-scrollbar-thumb {
    background: #4B5563;
    border-radius: 3px;
  }

  .tree-content::-webkit-scrollbar-thumb:hover {
    background: #6B7280;
  }
</style>
