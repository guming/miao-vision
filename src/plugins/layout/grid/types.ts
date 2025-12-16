/**
 * Dashboard Grid Component Types
 */

export interface GridItemConfig {
  col?: number        // Column start (1-based)
  row?: number        // Row start (1-based)
  colSpan?: number    // Number of columns to span (default: 1)
  rowSpan?: number    // Number of rows to span (default: 1)
  title?: string      // Optional card title
  padding?: boolean   // Add padding inside card (default: true)
}

export interface GridConfig {
  columns?: number    // Number of columns (default: 12)
  gap?: string        // Gap between items (default: 1rem)
  rowHeight?: string  // Height of each row (default: auto)
  minRowHeight?: string // Minimum row height (default: 100px)
  items?: GridItemConfig[]  // Item configurations
}

export interface GridData {
  config: GridConfig
  items: GridItemConfig[]
}
