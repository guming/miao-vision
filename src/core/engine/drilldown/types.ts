/**
 * Drill-down Types
 *
 * Configuration for click-to-filter functionality across components.
 */

/**
 * Action type for drill-down
 */
export type DrilldownActionType =
  | 'setInput'      // Set an input variable (triggers reactive execution)
  | 'navigate'      // Navigate to another section/page
  | 'modal'         // Show detail modal
  | 'expand'        // Expand inline detail row

/**
 * Column mapping for extracting values from clicked row
 */
export interface DrilldownValueMapping {
  /** Source column name in the data */
  column: string
  /** Target input name to set */
  inputName: string
  /** Optional transformation */
  transform?: 'string' | 'number' | 'date'
}

/**
 * Configuration for setInput action
 */
export interface SetInputAction {
  type: 'setInput'
  /** Map of column names to input names */
  mappings: DrilldownValueMapping[]
  /** Whether to clear other related inputs */
  clearOthers?: string[]
}

/**
 * Configuration for navigate action
 */
export interface NavigateAction {
  type: 'navigate'
  /** Target section/anchor ID */
  target: string
  /** Query params to append (column: paramName) */
  params?: Record<string, string>
}

/**
 * Configuration for modal action
 */
export interface ModalAction {
  type: 'modal'
  /** Template for modal title */
  titleTemplate?: string
  /** Columns to display in modal */
  displayColumns?: string[]
  /** Related query to execute */
  detailQuery?: string
}

/**
 * Configuration for expand action
 */
export interface ExpandAction {
  type: 'expand'
  /** Template/query for expanded content */
  detailQuery?: string
  /** Columns to display in expansion */
  displayColumns?: string[]
}

/**
 * Unified drill-down action
 */
export type DrilldownAction =
  | SetInputAction
  | NavigateAction
  | ModalAction
  | ExpandAction

/**
 * Complete drill-down configuration for a component
 */
export interface DrilldownConfig {
  /** Enable drill-down */
  enabled: boolean
  /** Action to perform on click */
  action: DrilldownAction
  /** Cursor style on hover */
  cursor?: 'pointer' | 'zoom-in'
  /** Highlight style on hover */
  hoverHighlight?: boolean
  /** Tooltip text for drill-down */
  tooltip?: string
}

/**
 * Context passed to drill-down handlers
 */
export interface DrilldownContext {
  /** The clicked row data */
  rowData: Record<string, unknown>
  /** Row index in the data */
  rowIndex: number
  /** Column that was clicked (if applicable) */
  clickedColumn?: string
  /** The source component type */
  sourceComponent: string
  /** The source component's block ID */
  blockId?: string
}

/**
 * Result of a drill-down action
 */
export interface DrilldownResult {
  /** Whether the action was successful */
  success: boolean
  /** Action that was performed */
  action: DrilldownActionType
  /** Any error message */
  error?: string
  /** Updated input names (for setInput) */
  updatedInputs?: string[]
}

/**
 * Drill-down event payload
 */
export interface DrilldownEvent {
  config: DrilldownConfig
  context: DrilldownContext
}
