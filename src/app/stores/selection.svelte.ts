/**
 * SelectionStore - Cross-View Linking State Management
 *
 * Manages selection state for cross-chart filtering within a Report.
 * Implements AND logic for multi-selection filtering.
 *
 * @example
 * ```typescript
 * const store = createSelectionStore()
 *
 * // Toggle selection (click on bar)
 * store.toggle('category', 'Electronics')
 *
 * // Check if value is selected
 * store.isSelected('category', 'Electronics') // true
 *
 * // Filter data based on selections
 * const filtered = store.filterData(rows, { category: 'category' })
 *
 * // Clear all selections
 * store.clear()
 * ```
 */

/**
 * Represents a single field's selection state
 */
export interface FieldSelection {
  /** Field name being filtered (e.g., 'category', 'region') */
  field: string
  /** Set of selected values */
  values: Set<string>
  /** ID of the chart that triggered this selection */
  sourceChartId?: string
}

/**
 * Selection change event
 */
export interface SelectionChangeEvent {
  field: string
  values: string[]
  action: 'add' | 'remove' | 'clear' | 'set'
  sourceChartId?: string
}

/**
 * Selection store state
 */
export interface SelectionState {
  /** Map of field name to selection */
  selections: Map<string, FieldSelection>
  /** Listeners for selection changes */
  listeners: Set<(event: SelectionChangeEvent) => void>
}

/**
 * Create a new SelectionStore instance
 * Each Report should have its own store instance
 */
export function createSelectionStore() {
  // Reactive state using Svelte 5 Runes
  let selections = $state<Map<string, FieldSelection>>(new Map())
  let listeners = new Set<(event: SelectionChangeEvent) => void>()

  /**
   * Notify all listeners of a selection change
   */
  function notifyListeners(event: SelectionChangeEvent) {
    for (const listener of listeners) {
      try {
        listener(event)
      } catch (err) {
        console.error('Selection listener error:', err)
      }
    }
  }

  /**
   * Toggle a value's selection state
   * If already selected, remove it. If not selected, add it.
   */
  function toggle(field: string, value: string, sourceChartId?: string): void {
    const current = selections.get(field)

    if (current) {
      const newValues = new Set(current.values)
      if (newValues.has(value)) {
        // Remove value
        newValues.delete(value)
        if (newValues.size === 0) {
          // Remove entire field selection if empty
          const newSelections = new Map(selections)
          newSelections.delete(field)
          selections = newSelections
        } else {
          const newSelections = new Map(selections)
          newSelections.set(field, { ...current, values: newValues })
          selections = newSelections
        }
        notifyListeners({ field, values: Array.from(newValues), action: 'remove', sourceChartId })
      } else {
        // Add value
        newValues.add(value)
        const newSelections = new Map(selections)
        newSelections.set(field, { ...current, values: newValues, sourceChartId })
        selections = newSelections
        notifyListeners({ field, values: Array.from(newValues), action: 'add', sourceChartId })
      }
    } else {
      // Create new selection for field
      const newSelections = new Map(selections)
      newSelections.set(field, {
        field,
        values: new Set([value]),
        sourceChartId
      })
      selections = newSelections
      notifyListeners({ field, values: [value], action: 'add', sourceChartId })
    }
  }

  /**
   * Set selection to specific values (replaces existing)
   */
  function set(field: string, values: string[], sourceChartId?: string): void {
    if (values.length === 0) {
      clear(field)
      return
    }

    const newSelections = new Map(selections)
    newSelections.set(field, {
      field,
      values: new Set(values),
      sourceChartId
    })
    selections = newSelections
    notifyListeners({ field, values, action: 'set', sourceChartId })
  }

  /**
   * Clear selection for a specific field, or all selections
   */
  function clear(field?: string): void {
    if (field) {
      if (selections.has(field)) {
        const newSelections = new Map(selections)
        newSelections.delete(field)
        selections = newSelections
        notifyListeners({ field, values: [], action: 'clear' })
      }
    } else {
      // Clear all
      const fields = Array.from(selections.keys())
      selections = new Map()
      for (const f of fields) {
        notifyListeners({ field: f, values: [], action: 'clear' })
      }
    }
  }

  /**
   * Check if a specific value is selected
   */
  function isSelected(field: string, value: string): boolean {
    return selections.get(field)?.values.has(value) ?? false
  }

  /**
   * Check if any value is selected for a field
   */
  function hasSelection(field?: string): boolean {
    if (field) {
      const sel = selections.get(field)
      return sel ? sel.values.size > 0 : false
    }
    return selections.size > 0
  }

  /**
   * Get selected values for a field
   */
  function getSelectedValues(field: string): string[] {
    return Array.from(selections.get(field)?.values ?? [])
  }

  /**
   * Get all active selections
   */
  function getActiveSelections(): FieldSelection[] {
    return Array.from(selections.values())
  }

  /**
   * Filter data based on current selections (AND logic)
   *
   * @param data - Array of data rows
   * @param fieldMapping - Maps selection field names to data field names
   *                       e.g., { category: 'product_category', region: 'sales_region' }
   * @returns Filtered data array
   */
  function filterData<T extends Record<string, unknown>>(
    data: T[],
    fieldMapping: Record<string, string>
  ): T[] {
    if (selections.size === 0) {
      return data
    }

    return data.filter(row => {
      // AND logic: row must match ALL selections
      for (const [selectionField, selection] of selections) {
        const dataField = fieldMapping[selectionField] || selectionField
        const rowValue = String(row[dataField] ?? '')

        if (!selection.values.has(rowValue)) {
          return false
        }
      }
      return true
    })
  }

  /**
   * Subscribe to selection changes
   */
  function subscribe(listener: (event: SelectionChangeEvent) => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  /**
   * Get reactive selections state (for Svelte components)
   */
  function getSelections(): Map<string, FieldSelection> {
    return selections
  }

  return {
    // State getter
    get selections() {
      return selections
    },

    // Methods
    toggle,
    set,
    clear,
    isSelected,
    hasSelection,
    getSelectedValues,
    getActiveSelections,
    filterData,
    subscribe,
    getSelections
  }
}

/**
 * Type for the selection store instance
 */
export type SelectionStore = ReturnType<typeof createSelectionStore>

/**
 * Global selection store for the current Report context
 * This will be set by the Report renderer
 */
let currentStore: SelectionStore | null = null

/**
 * Set the current selection store (called by Report renderer)
 */
export function setCurrentSelectionStore(store: SelectionStore): void {
  currentStore = store
}

/**
 * Get the current selection store
 */
export function getCurrentSelectionStore(): SelectionStore | null {
  return currentStore
}

/**
 * Clear the current selection store (called when Report unmounts)
 */
export function clearCurrentSelectionStore(): void {
  currentStore?.clear()
  currentStore = null
}
