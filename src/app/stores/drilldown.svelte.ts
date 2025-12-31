/**
 * DrilldownStore - Drilldown Modal State Management
 *
 * Manages the state for drilldown modal dialogs.
 * Used when a user clicks on a table row to view details.
 */

/**
 * Modal state for displaying row details
 */
export interface DrilldownModalState {
  /** Whether the modal is visible */
  visible: boolean
  /** Modal title */
  title: string
  /** Row data to display */
  rowData: Record<string, unknown>
  /** Specific columns to display (if undefined, show all) */
  displayColumns?: string[]
  /** Source component that triggered the modal */
  sourceComponent?: string
  /** Block ID of the source component */
  blockId?: string
}

/**
 * Create a drilldown store instance
 */
function createDrilldownStore() {
  // Reactive state using Svelte 5 Runes
  let modalState = $state<DrilldownModalState>({
    visible: false,
    title: '',
    rowData: {},
    displayColumns: undefined,
    sourceComponent: undefined,
    blockId: undefined
  })

  /**
   * Show the drilldown modal with row details
   */
  function showModal(
    title: string,
    rowData: Record<string, unknown>,
    options?: {
      displayColumns?: string[]
      sourceComponent?: string
      blockId?: string
    }
  ): void {
    modalState = {
      visible: true,
      title,
      rowData,
      displayColumns: options?.displayColumns,
      sourceComponent: options?.sourceComponent,
      blockId: options?.blockId
    }
  }

  /**
   * Hide the drilldown modal
   */
  function hideModal(): void {
    modalState = {
      ...modalState,
      visible: false
    }
  }

  /**
   * Check if modal is visible
   */
  function isVisible(): boolean {
    return modalState.visible
  }

  /**
   * Get the columns to display
   * If displayColumns is defined, use those. Otherwise, use all keys from rowData.
   */
  function getDisplayColumns(): string[] {
    if (modalState.displayColumns && modalState.displayColumns.length > 0) {
      return modalState.displayColumns
    }
    return Object.keys(modalState.rowData)
  }

  /**
   * Format a value for display
   */
  function formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '—'
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    if (value instanceof Date) {
      return value.toLocaleString()
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return {
    // Reactive state getter
    get state() {
      return modalState
    },

    // Methods
    showModal,
    hideModal,
    isVisible,
    getDisplayColumns,
    formatValue
  }
}

/**
 * Type for the drilldown store instance
 */
export type DrilldownStore = ReturnType<typeof createDrilldownStore>

/**
 * Global drilldown store singleton
 */
export const drilldownStore = createDrilldownStore()
