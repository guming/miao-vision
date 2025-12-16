/**
 * DimensionGrid Input Types
 *
 * Multi-dimensional grid selection component for filtering
 */

export interface DimensionGridConfig {
  /** Input name for value binding */
  name: string
  /** Grid title */
  title?: string
  /** Number of columns in the grid */
  columns?: number
  /** Grid items - can be static or from query */
  items?: DimensionGridItem[]
  /** Query name for dynamic items */
  query?: string
  /** Column name for item labels */
  labelColumn?: string
  /** Column name for item values (defaults to labelColumn) */
  valueColumn?: string
  /** Column name for item icons */
  iconColumn?: string
  /** Column name for item counts */
  countColumn?: string
  /** Allow multiple selections */
  multiple?: boolean
  /** Default selected values */
  defaultValue?: string | string[]
  /** Show item counts */
  showCounts?: boolean
  /** Gap between items */
  gap?: string
}

export interface DimensionGridItem {
  /** Display label */
  label: string
  /** Value when selected */
  value: string
  /** Optional icon */
  icon?: string
  /** Optional count to display */
  count?: number
  /** Optional color */
  color?: string
}

export interface DimensionGridData {
  type: 'dimensiongrid'
  config: DimensionGridConfig
}
