<script lang="ts">
/**
 * Snippet Manager Component
 *
 * Modal dialog for browsing, searching, and managing SQL snippets.
 * Provides tabs for different views: Browse, Favorites, Recent, Custom.
 *
 * Design:
 * - Follows project's modal pattern
 * - Integrates with snippetStore
 * - Non-blocking (doesn't affect report functionality)
 * - Easy to test (clear props/events)
 *
 * @module components/sql-workspace/snippets/SnippetManager
 */

import { snippetStore } from '@app/stores/snippet.svelte'
import type { SQLSnippet, SnippetCategory } from '@/types/snippet'
import SnippetCard from './SnippetCard.svelte'

interface Props {
  isOpen: boolean
  onClose: () => void
  onInsert?: (snippet: SQLSnippet, paramValues: Record<string, string>) => void
}

let { isOpen, onClose, onInsert }: Props = $props()

// Tab state
type TabType = 'browse' | 'favorites' | 'recent' | 'custom'
let activeTab = $state<TabType>('browse')

// Filter state
let selectedCategory = $state<SnippetCategory | 'all'>('all')
let searchQuery = $state('')

// Modal state
let showImportExport = $state(false)

// Filtered snippets based on active tab and filters
const filteredSnippets = $derived.by(() => {
  let snippets: SQLSnippet[] = []

  // Get base list by tab
  switch (activeTab) {
    case 'browse':
      snippets = selectedCategory === 'all'
        ? snippetStore.allSnippets
        : snippetStore.getByCategory(selectedCategory)
      break
    case 'favorites':
      snippets = snippetStore.favoriteSnippets
      break
    case 'recent':
      snippets = snippetStore.recentSnippets
      break
    case 'custom':
      snippets = snippetStore.customSnippets
      break
  }

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    snippets = snippets.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.tags.some(t => t.toLowerCase().includes(query)) ||
      s.trigger?.toLowerCase().includes(query)
    )
  }

  return snippets
})

// Category options for dropdown
const categories: { value: SnippetCategory | 'all', label: string, emoji: string }[] = [
  { value: 'all', label: 'All Snippets', emoji: '📚' },
  { value: 'time-series', label: 'Time Series', emoji: '📈' },
  { value: 'window-function', label: 'Window Functions', emoji: '🪟' },
  { value: 'aggregation', label: 'Aggregation', emoji: '📊' },
  { value: 'data-quality', label: 'Data Quality', emoji: '✅' },
  { value: 'statistical', label: 'Statistical', emoji: '📐' },
  { value: 'date-manipulation', label: 'Date Functions', emoji: '📅' },
  { value: 'cohort', label: 'Cohort Analysis', emoji: '👥' },
  { value: 'joins', label: 'Joins', emoji: '🔗' },
  { value: 'formatting', label: 'Formatting', emoji: '✨' },
  { value: 'custom', label: 'Custom', emoji: '⚙️' }
]

/**
 * Handle snippet insertion
 */
function handleInsert(snippet: SQLSnippet, paramValues: Record<string, string>) {
  snippetStore.recordUsage(snippet.id)
  onInsert?.(snippet, paramValues)
  onClose()
}

/**
 * Handle snippet deletion
 */
function handleDelete(snippet: SQLSnippet) {
  if (confirm(`Delete snippet "${snippet.name}"?`)) {
    try {
      snippetStore.deleteSnippet(snippet.id)
    } catch (error) {
      alert('Failed to delete snippet: ' + (error as Error).message)
    }
  }
}

/**
 * Handle export
 */
function handleExport() {
  try {
    const json = snippetStore.exportSnippets()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sql-snippets-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    alert('Failed to export snippets: ' + (error as Error).message)
  }
}

/**
 * Handle import
 */
function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const count = snippetStore.importSnippets(text)
      alert(`Successfully imported ${count} snippet(s)`)
    } catch (error) {
      alert('Failed to import snippets: ' + (error as Error).message)
    }
  }
  input.click()
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyDown(event: KeyboardEvent) {
  // Escape to close
  if (event.key === 'Escape') {
    onClose()
  }
  // Ctrl/Cmd + F to focus search
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault()
    document.querySelector<HTMLInputElement>('.snippet-search-input')?.focus()
  }
}
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="snippet-manager-overlay"
    onclick={(e) => e.target === e.currentTarget && onClose()}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="snippet-manager-title"
  >
    <div class="snippet-manager-container">
      <!-- Header -->
      <header class="manager-header">
        <div class="header-left">
          <h2 id="snippet-manager-title" class="manager-title">
            SQL Snippets
          </h2>
          <span class="snippet-count">
            {filteredSnippets.length} snippet{filteredSnippets.length === 1 ? '' : 's'}
          </span>
        </div>

        <div class="header-actions">
          <button
            class="icon-btn"
            onclick={() => showImportExport = !showImportExport}
            title="Import/Export"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>

          <button class="icon-btn" onclick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Import/Export Panel (collapsible) -->
      {#if showImportExport}
        <div class="import-export-panel">
          <button class="action-btn" onclick={handleExport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Export Snippets
          </button>
          <button class="action-btn" onclick={handleImport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Import Snippets
          </button>
        </div>
      {/if}

      <!-- Tabs -->
      <nav class="manager-tabs" role="tablist">
        <button
          class="tab"
          class:active={activeTab === 'browse'}
          onclick={() => activeTab = 'browse'}
          role="tab"
          aria-selected={activeTab === 'browse'}
        >
          📚 Browse
        </button>
        <button
          class="tab"
          class:active={activeTab === 'favorites'}
          onclick={() => activeTab = 'favorites'}
          role="tab"
          aria-selected={activeTab === 'favorites'}
        >
          ⭐ Favorites
          {#if snippetStore.favoriteSnippets.length > 0}
            <span class="badge">{snippetStore.favoriteSnippets.length}</span>
          {/if}
        </button>
        <button
          class="tab"
          class:active={activeTab === 'recent'}
          onclick={() => activeTab = 'recent'}
          role="tab"
          aria-selected={activeTab === 'recent'}
        >
          🕐 Recent
        </button>
        <button
          class="tab"
          class:active={activeTab === 'custom'}
          onclick={() => activeTab = 'custom'}
          role="tab"
          aria-selected={activeTab === 'custom'}
        >
          ✏️ Custom
          {#if snippetStore.customSnippets.length > 0}
            <span class="badge">{snippetStore.customSnippets.length}</span>
          {/if}
        </button>
      </nav>

      <!-- Filters -->
      <div class="manager-filters">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            class="snippet-search-input"
            placeholder="Search snippets... (Ctrl+F)"
            bind:value={searchQuery}
          />
          {#if searchQuery}
            <button class="clear-btn" onclick={() => searchQuery = ''} title="Clear search">×</button>
          {/if}
        </div>

        {#if activeTab === 'browse'}
          <select class="category-select" bind:value={selectedCategory}>
            {#each categories as cat}
              <option value={cat.value}>
                {cat.emoji} {cat.label}
              </option>
            {/each}
          </select>
        {/if}
      </div>

      <!-- Snippet List -->
      <div class="snippet-list" role="list">
        {#if filteredSnippets.length === 0}
          <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <p class="empty-title">No snippets found</p>
            {#if searchQuery}
              <p class="empty-hint">Try a different search term</p>
            {:else if activeTab === 'custom'}
              <p class="empty-hint">Create your first custom snippet!</p>
            {:else if activeTab === 'favorites'}
              <p class="empty-hint">Mark snippets as favorites to see them here</p>
            {/if}
          </div>
        {:else}
          {#each filteredSnippets as snippet (snippet.id)}
            <SnippetCard
              {snippet}
              onInsert={(paramValues) => handleInsert(snippet, paramValues)}
              onToggleFavorite={() => snippetStore.toggleFavorite(snippet.id)}
              onDelete={snippet.isBuiltIn ? undefined : () => handleDelete(snippet)}
            />
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .snippet-manager-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .snippet-manager-container {
    width: 95vw;
    max-width: 1200px;
    height: 90vh;
    max-height: 900px;
    background: #0F172A;
    border: 1px solid #1F2937;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Header */
  .manager-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #1F2937;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }

  .manager-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .snippet-count {
    font-size: 0.875rem;
    color: #6B7280;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #9CA3AF;
    cursor: pointer;
    transition: all 0.15s;
  }

  .icon-btn:hover {
    background: #374151;
    border-color: #4B5563;
    color: #F3F4F6;
  }

  /* Import/Export Panel */
  .import-export-panel {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    background: #1F2937;
    border-bottom: 1px solid #374151;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #374151;
    border: 1px solid #4B5563;
    border-radius: 6px;
    color: #E5E7EB;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background: #4B5563;
    color: #F3F4F6;
  }

  /* Tabs */
  .manager-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.75rem 1.5rem 0;
    border-bottom: 1px solid #1F2937;
  }

  .tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #9CA3AF;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab:hover {
    color: #E5E7EB;
    background: rgba(31, 41, 55, 0.5);
  }

  .tab.active {
    color: #4285F4;
    border-bottom-color: #4285F4;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    background: #374151;
    border-radius: 10px;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #9CA3AF;
  }

  .tab.active .badge {
    background: rgba(66, 133, 244, 0.2);
    color: #93C5FD;
  }

  /* Filters */
  .manager-filters {
    display: flex;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #1F2937;
  }

  .search-box {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 1rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    transition: border-color 0.15s;
  }

  .search-box:focus-within {
    border-color: #4285F4;
  }

  .search-box svg {
    color: #6B7280;
    flex-shrink: 0;
  }

  .snippet-search-input {
    flex: 1;
    background: none;
    border: none;
    color: #F3F4F6;
    font-size: 0.875rem;
    outline: none;
    min-width: 0;
  }

  .snippet-search-input::placeholder {
    color: #6B7280;
  }

  .clear-btn {
    padding: 0;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    color: #6B7280;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    transition: color 0.15s;
  }

  .clear-btn:hover {
    color: #F3F4F6;
  }

  .category-select {
    min-width: 200px;
    padding: 0.625rem 1rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #E5E7EB;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .category-select:hover {
    border-color: #4B5563;
  }

  .category-select:focus {
    outline: none;
    border-color: #4285F4;
  }

  /* Snippet List */
  .snippet-list {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .snippet-list::-webkit-scrollbar {
    width: 8px;
  }

  .snippet-list::-webkit-scrollbar-track {
    background: #0F172A;
  }

  .snippet-list::-webkit-scrollbar-thumb {
    background: #374151;
    border-radius: 4px;
  }

  .snippet-list::-webkit-scrollbar-thumb:hover {
    background: #4B5563;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
    color: #6B7280;
  }

  .empty-state svg {
    opacity: 0.3;
  }

  .empty-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 500;
    color: #9CA3AF;
  }

  .empty-hint {
    margin: 0;
    font-size: 0.875rem;
    color: #6B7280;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .snippet-manager-container {
      width: 100vw;
      height: 100vh;
      max-height: none;
      border-radius: 0;
    }

    .manager-header {
      padding: 1rem;
    }

    .manager-title {
      font-size: 1.25rem;
    }

    .manager-filters {
      flex-direction: column;
      gap: 0.75rem;
    }

    .category-select {
      width: 100%;
    }
  }
</style>
