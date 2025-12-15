/**
 * DataTable Component Module
 */

// Types
export type {
  FormatType,
  SummaryType,
  ConditionalFormat,
  ColumnConfig,
  DataTableConfig,
  ColumnMeta,
  SortState,
  FilterOperator,
  ColumnFilter,
  FilterState,
  DataTableData
} from './types'

// Metadata
export { DataTableMetadata } from './metadata'

// Component registration (adapter layer)
export { dataTableRegistration } from './definition'

// Formatter
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  formatValue,
  inferColumnType
} from './formatter'

// Operations
export { sortData, searchData, toggleSort, processData, getSortIcon } from './operations'

// Export utilities
export { dataToCSV, downloadCSV, copyCSVToClipboard } from './export'

// Component
export { default as DataTable } from './DataTable.svelte'
