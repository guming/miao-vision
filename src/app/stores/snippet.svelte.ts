/**
 * Snippet Store - Svelte 5 Runes
 *
 * Manages SQL snippets with localStorage persistence.
 * Combines built-in snippets with user-created custom snippets.
 *
 * Design Principles:
 * - Follows project's Svelte 5 store pattern
 * - Isolated from report store (no cross-dependencies)
 * - Easy to test (clear state management)
 * - Extensible (easy to add new snippet types)
 *
 * @module app/stores/snippet
 */

import type {
  SQLSnippet,
  SnippetCollection,
  SnippetFilterOptions,
  SnippetStatistics
} from '@/types/snippet'
import { getBuiltInSnippets } from '@core/snippets/built-in-snippets'

/**
 * Storage configuration
 */
const STORAGE_KEY = 'miao-vision:snippets'
const MAX_CUSTOM_SNIPPETS = 100

/**
 * Legacy storage keys for migration
 */
const LEGACY_STORAGE_KEYS = [
  'miaoshou-vision:snippets'
]

/**
 * Snippet Store State
 */
interface SnippetStoreState {
  /** Built-in snippets (read-only) */
  builtInSnippets: SQLSnippet[]

  /** User-created custom snippets */
  customSnippets: SQLSnippet[]

  /** Whether snippets are being loaded */
  isLoading: boolean

  /** Last error message */
  lastError: string | null
}

/**
 * Generate unique ID for custom snippets
 */
function generateSnippetId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Migrate legacy localStorage keys
 */
function migrateLegacyKeys(): void {
  console.log('[SnippetStore] Checking for legacy storage keys...')

  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    try {
      const legacyData = localStorage.getItem(legacyKey)
      if (legacyData) {
        console.log(`[SnippetStore] Found legacy key: ${legacyKey}`)

        // Copy to new key if it doesn't exist
        if (!localStorage.getItem(STORAGE_KEY)) {
          localStorage.setItem(STORAGE_KEY, legacyData)
          console.log(`[SnippetStore] Migrated to: ${STORAGE_KEY}`)
        }

        // Remove legacy key
        localStorage.removeItem(legacyKey)
        console.log(`[SnippetStore] Removed legacy key`)
      }
    } catch (error) {
      console.warn(`[SnippetStore] Failed to migrate ${legacyKey}:`, error)
    }
  }
}

/**
 * Create Snippet Store
 *
 * Factory function following project's store pattern
 */
export function createSnippetStore() {
  // Initialize state with Svelte 5 runes
  let state = $state<SnippetStoreState>({
    builtInSnippets: [],
    customSnippets: [],
    isLoading: false,
    lastError: null
  })

  /**
   * Load snippets from localStorage
   */
  function loadSnippets() {
    state.isLoading = true
    state.lastError = null

    try {
      // Migrate legacy keys first
      migrateLegacyKeys()

      // Load built-in snippets (always fresh)
      state.builtInSnippets = getBuiltInSnippets()
      console.log(`[SnippetStore] Loaded ${state.builtInSnippets.length} built-in snippets`)

      // Load custom snippets from localStorage
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const collection: SnippetCollection = JSON.parse(stored)

        // Parse dates
        state.customSnippets = collection.snippets.map(s => ({
          ...s,
          createdAt: new Date(s.createdAt),
          lastModified: new Date(s.lastModified),
          lastUsed: s.lastUsed ? new Date(s.lastUsed) : undefined
        }))

        console.log(`[SnippetStore] Loaded ${state.customSnippets.length} custom snippets`)
      } else {
        state.customSnippets = []
        console.log('[SnippetStore] No custom snippets found')
      }
    } catch (error) {
      console.error('[SnippetStore] Failed to load snippets:', error)
      state.lastError = 'Failed to load snippets'
      state.customSnippets = []
    } finally {
      state.isLoading = false
    }
  }

  /**
   * Save custom snippets to localStorage
   */
  function saveSnippets() {
    try {
      const collection: SnippetCollection = {
        snippets: state.customSnippets,
        lastSynced: new Date()
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(collection))
      console.log(`[SnippetStore] Saved ${state.customSnippets.length} custom snippets`)
    } catch (error) {
      console.error('[SnippetStore] Failed to save snippets:', error)
      state.lastError = 'Failed to save snippets'
    }
  }

  /**
   * Get all snippets (built-in + custom)
   */
  const allSnippets = $derived([...state.builtInSnippets, ...state.customSnippets])

  /**
   * Get favorite snippets
   */
  const favoriteSnippets = $derived(allSnippets.filter(s => s.isFavorite))

  /**
   * Get recently used snippets (sorted by last used, descending)
   */
  const recentSnippets = $derived(
    allSnippets
      .filter(s => s.lastUsed)
      .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
      .slice(0, 10)
  )

  /**
   * Get popular snippets (sorted by usage count, descending)
   */
  const popularSnippets = $derived(
    allSnippets
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
  )

  /**
   * Add a new custom snippet
   */
  function addSnippet(
    snippet: Omit<SQLSnippet, 'id' | 'createdAt' | 'lastModified' | 'usageCount' | 'isBuiltIn'>
  ): SQLSnippet {
    if (state.customSnippets.length >= MAX_CUSTOM_SNIPPETS) {
      throw new Error(`Maximum ${MAX_CUSTOM_SNIPPETS} custom snippets allowed`)
    }

    const newSnippet: SQLSnippet = {
      ...snippet,
      id: generateSnippetId(),
      isBuiltIn: false,
      usageCount: 0,
      createdAt: new Date(),
      lastModified: new Date()
    }

    state.customSnippets = [...state.customSnippets, newSnippet]
    saveSnippets()

    console.log(`[SnippetStore] Added snippet: ${newSnippet.name}`)
    return newSnippet
  }

  /**
   * Update an existing custom snippet
   */
  function updateSnippet(id: string, updates: Partial<SQLSnippet>): void {
    const index = state.customSnippets.findIndex(s => s.id === id)

    if (index === -1) {
      throw new Error(`Snippet ${id} not found or is built-in`)
    }

    state.customSnippets[index] = {
      ...state.customSnippets[index],
      ...updates,
      id: state.customSnippets[index].id, // Prevent ID change
      isBuiltIn: false, // Prevent changing to built-in
      lastModified: new Date()
    }

    saveSnippets()
    console.log(`[SnippetStore] Updated snippet: ${id}`)
  }

  /**
   * Delete a custom snippet
   */
  function deleteSnippet(id: string): void {
    const snippet = state.customSnippets.find(s => s.id === id)

    if (!snippet) {
      throw new Error(`Snippet ${id} not found or is built-in`)
    }

    state.customSnippets = state.customSnippets.filter(s => s.id !== id)
    saveSnippets()

    console.log(`[SnippetStore] Deleted snippet: ${snippet.name}`)
  }

  /**
   * Toggle favorite status
   */
  function toggleFavorite(id: string): void {
    // Check built-in snippets
    const builtInIndex = state.builtInSnippets.findIndex(s => s.id === id)
    if (builtInIndex !== -1) {
      state.builtInSnippets[builtInIndex] = {
        ...state.builtInSnippets[builtInIndex],
        isFavorite: !state.builtInSnippets[builtInIndex].isFavorite
      }
      // Note: Built-in favorites are stored in memory only
      console.log(`[SnippetStore] Toggled favorite for built-in: ${id}`)
      return
    }

    // Check custom snippets
    const customIndex = state.customSnippets.findIndex(s => s.id === id)
    if (customIndex !== -1) {
      state.customSnippets[customIndex] = {
        ...state.customSnippets[customIndex],
        isFavorite: !state.customSnippets[customIndex].isFavorite
      }
      saveSnippets()
      console.log(`[SnippetStore] Toggled favorite for custom: ${id}`)
    }
  }

  /**
   * Record snippet usage (increment usage count, update last used)
   */
  function recordUsage(id: string): void {
    // Check built-in snippets
    const builtInIndex = state.builtInSnippets.findIndex(s => s.id === id)
    if (builtInIndex !== -1) {
      state.builtInSnippets[builtInIndex] = {
        ...state.builtInSnippets[builtInIndex],
        usageCount: state.builtInSnippets[builtInIndex].usageCount + 1,
        lastUsed: new Date()
      }
      console.log(`[SnippetStore] Recorded usage for built-in: ${id}`)
      return
    }

    // Check custom snippets
    const customIndex = state.customSnippets.findIndex(s => s.id === id)
    if (customIndex !== -1) {
      state.customSnippets[customIndex] = {
        ...state.customSnippets[customIndex],
        usageCount: state.customSnippets[customIndex].usageCount + 1,
        lastUsed: new Date()
      }
      saveSnippets()
      console.log(`[SnippetStore] Recorded usage for custom: ${id}`)
    }
  }

  /**
   * Search snippets by query
   */
  function search(query: string): SQLSnippet[] {
    if (!query.trim()) {
      return allSnippets
    }

    const lowerQuery = query.toLowerCase()
    return allSnippets.filter(s =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      s.trigger?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get snippets by category
   */
  function getByCategory(category: string): SQLSnippet[] {
    return allSnippets.filter(s => s.category === category)
  }

  /**
   * Find snippet by trigger word
   */
  function findByTrigger(trigger: string): SQLSnippet | undefined {
    return allSnippets.find(s => s.trigger === trigger)
  }

  /**
   * Filter snippets with advanced options
   */
  function filter(options: SnippetFilterOptions): SQLSnippet[] {
    let results = allSnippets

    // Filter by category
    if (options.category) {
      results = results.filter(s => s.category === options.category)
    }

    // Filter by search query
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase()
      results = results.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter(s =>
        options.tags!.some(tag => s.tags.includes(tag))
      )
    }

    // Filter by favorites
    if (options.favoritesOnly) {
      results = results.filter(s => s.isFavorite)
    }

    // Filter by custom/built-in
    if (options.customOnly) {
      results = results.filter(s => !s.isBuiltIn)
    }
    if (options.builtInOnly) {
      results = results.filter(s => s.isBuiltIn)
    }

    // Sort results
    if (options.sortBy) {
      results = [...results].sort((a, b) => {
        let comparison = 0

        switch (options.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name)
            break
          case 'usageCount':
            comparison = a.usageCount - b.usageCount
            break
          case 'lastUsed':
            comparison = (a.lastUsed?.getTime() || 0) - (b.lastUsed?.getTime() || 0)
            break
          case 'createdAt':
            comparison = a.createdAt.getTime() - b.createdAt.getTime()
            break
        }

        return options.sortDirection === 'desc' ? -comparison : comparison
      })
    }

    return results
  }

  /**
   * Get snippet statistics
   */
  function getStatistics(): SnippetStatistics {
    const categoryDistribution = allSnippets.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalSnippets: allSnippets.length,
      builtInCount: state.builtInSnippets.length,
      customCount: state.customSnippets.length,
      favoriteCount: favoriteSnippets.length,
      totalUsageCount: allSnippets.reduce((sum, s) => sum + s.usageCount, 0),
      mostPopular: popularSnippets.slice(0, 5).map(s => ({
        snippet: s,
        count: s.usageCount
      })),
      recentlyUsed: recentSnippets.slice(0, 5).map(s => ({
        snippet: s,
        lastUsed: s.lastUsed!
      })),
      categoryDistribution: categoryDistribution as any
    }
  }

  /**
   * Export custom snippets as JSON
   */
  function exportSnippets(): string {
    const collection: SnippetCollection = {
      snippets: state.customSnippets,
      lastSynced: new Date(),
      metadata: {
        version: '1.0',
        description: 'Exported SQL Snippets from Miaoshou Vision'
      }
    }

    return JSON.stringify(collection, null, 2)
  }

  /**
   * Import snippets from JSON string
   */
  function importSnippets(json: string): number {
    try {
      const data = JSON.parse(json)

      if (!data.snippets || !Array.isArray(data.snippets)) {
        throw new Error('Invalid snippet file format')
      }

      const snippets = data.snippets as SQLSnippet[]
      let imported = 0

      for (const snippet of snippets) {
        if (state.customSnippets.length >= MAX_CUSTOM_SNIPPETS) {
          console.warn('[SnippetStore] Reached maximum custom snippets limit')
          break
        }

        // Check for duplicate IDs
        if (!state.customSnippets.find(s => s.id === snippet.id)) {
          const importedSnippet: SQLSnippet = {
            ...snippet,
            isBuiltIn: false, // Force custom
            createdAt: new Date(snippet.createdAt),
            lastModified: new Date(snippet.lastModified),
            lastUsed: snippet.lastUsed ? new Date(snippet.lastUsed) : undefined
          }

          state.customSnippets = [...state.customSnippets, importedSnippet]
          imported++
        }
      }

      if (imported > 0) {
        saveSnippets()
      }

      console.log(`[SnippetStore] Imported ${imported} snippets`)
      return imported
    } catch (error) {
      console.error('[SnippetStore] Failed to import snippets:', error)
      throw new Error('Invalid snippet file format')
    }
  }

  /**
   * Clear all custom snippets (dangerous!)
   */
  function clearCustomSnippets(): void {
    state.customSnippets = []
    saveSnippets()
    console.log('[SnippetStore] Cleared all custom snippets')
  }

  /**
   * Reset to factory defaults (clear everything and reload)
   */
  function reset(): void {
    localStorage.removeItem(STORAGE_KEY)
    loadSnippets()
    console.log('[SnippetStore] Reset to factory defaults')
  }

  // Load snippets on initialization
  loadSnippets()

  // Return public API
  return {
    // State (read-only via getters)
    get isLoading() { return state.isLoading },
    get lastError() { return state.lastError },
    get builtInSnippets() { return state.builtInSnippets },
    get customSnippets() { return state.customSnippets },

    // Derived values
    get allSnippets() { return allSnippets },
    get favoriteSnippets() { return favoriteSnippets },
    get recentSnippets() { return recentSnippets },
    get popularSnippets() { return popularSnippets },

    // Methods
    addSnippet,
    updateSnippet,
    deleteSnippet,
    toggleFavorite,
    recordUsage,
    search,
    getByCategory,
    findByTrigger,
    filter,
    getStatistics,
    exportSnippets,
    importSnippets,
    clearCustomSnippets,
    reset,
    reload: loadSnippets
  }
}

/**
 * Singleton instance
 */
export const snippetStore = createSnippetStore()
