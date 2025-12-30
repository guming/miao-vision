/**
 * Hybrid GNode Types
 *
 * Type definitions for the hybrid DuckDB + Perspective-style GNode system
 */

export type NodeType = 'table' | 'view'

export type AggregateFunction = 'sum' | 'avg' | 'count' | 'min' | 'max'

export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE'

export interface SchemaDefinition {
  [columnName: string]: string  // column name -> DuckDB type
}

export interface ViewConfig {
  source: string              // Source table/view ID
  rowPivots?: string[]        // Group by columns
  columnPivots?: string[]     // Column pivots (for 2D pivot tables)
  aggregates: {               // Aggregation specs
    [column: string]: AggregateFunction
  }
  filters?: FilterSpec[]      // WHERE conditions
  sort?: SortSpec[]           // ORDER BY
}

export interface FilterSpec {
  column: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN'
  value: any
}

export interface SortSpec {
  column: string
  direction: 'asc' | 'desc'
}

export interface GNodeDescriptor {
  id: string
  type: NodeType

  // Dependency tracking (Perspective-style)
  dependencies: Set<string>   // IDs this node depends on
  dependents: Set<string>     // IDs that depend on this node

  // Dirty marking
  dirty: boolean
  dirtyRows: Set<number>

  // DuckDB metadata
  duckdbTable: string

  // View-specific config
  viewConfig?: ViewConfig

  // Incremental state cache
  incrementalState?: IncrementalState
}

export interface IncrementalState {
  // In-memory aggregate cache
  aggregates: Map<string, AggregateValue>

  // Version tracking
  lastVersion: number

  // Refresh status
  needsRefresh: boolean
  lastRefreshTime: number
}

export interface AggregateValue {
  // For sum/count
  sum?: number
  count?: number

  // For avg (need both sum and count)
  avg?: number

  // For min/max
  min?: number
  max?: number

  // Group key (for debugging)
  groupKey?: string
}

export interface Delta {
  version: number
  timestamp: Date
  operations: DeltaOperation[]
}

export interface DeltaOperation {
  rowId: number
  opType: OperationType
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
}

export interface QueryResult {
  columns: string[]
  rows: any[]
  rowCount: number
  executionTime: number
}

export type UpdateCallback = (delta: Delta) => void
