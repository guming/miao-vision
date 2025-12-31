/**
 * MVR (MiaoVision Report) Format Types
 *
 * A portable report format that bundles:
 * - Markdown content
 * - SQL queries
 * - Embedded data snapshots
 * - Input configurations
 *
 * @module core/export/mvr-types
 */

/**
 * MVR File Version
 */
export const MVR_VERSION = '1.0'

/**
 * MVR File Extension
 */
export const MVR_EXTENSION = '.mvr'

/**
 * Input configuration in MVR format
 */
export interface MVRInputConfig {
  type: 'dropdown' | 'buttongroup' | 'textinput' | 'slider' | 'checkbox' | 'daterange'
  name: string
  label?: string
  defaultValue?: string | number | boolean
  options?: string[] | { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
}

/**
 * Data block embedded in MVR
 */
export interface MVRDataBlock {
  /** Query name (matches SQL block name) */
  name: string
  /** Original SQL query */
  sql?: string
  /** Snapshot of query results */
  data: Record<string, unknown>[]
  /** Column metadata */
  columns?: MVRColumnMeta[]
  /** Timestamp when data was captured */
  capturedAt: string
}

/**
 * Column metadata for data blocks
 */
export interface MVRColumnMeta {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'unknown'
  nullable?: boolean
}

/**
 * MVR Report Metadata (YAML frontmatter)
 */
export interface MVRMetadata {
  /** Report name */
  name: string
  /** Report description */
  description?: string
  /** MVR format version */
  version: string
  /** Creation timestamp */
  created: string
  /** Last modified timestamp */
  modified?: string
  /** Author information */
  author?: string
  /** Tags for categorization */
  tags?: string[]
  /** Source database info (sanitized, no credentials) */
  source?: {
    type: 'wasm' | 'motherduck' | 'http' | 'unknown'
    database?: string
  }
}

/**
 * Complete MVR Report Structure
 */
export interface MVRReport {
  /** Report metadata */
  metadata: MVRMetadata
  /** Input configurations */
  inputs: MVRInputConfig[]
  /** Markdown content (with SQL blocks) */
  content: string
  /** Embedded data snapshots */
  data: MVRDataBlock[]
}

/**
 * MVR Parse Result
 */
export interface MVRParseResult {
  success: boolean
  report?: MVRReport
  errors?: string[]
}

/**
 * MVR Export Options
 */
export interface MVRExportOptions {
  /** Include SQL queries in output */
  includeSql?: boolean
  /** Include data snapshots */
  includeData?: boolean
  /** Compress data (remove whitespace) */
  compressData?: boolean
  /** Maximum rows per data block (default: 10000) */
  maxRowsPerBlock?: number
  /** Include column metadata */
  includeColumnMeta?: boolean
}

/**
 * MVR Import Options
 */
export interface MVRImportOptions {
  /** Load embedded data into DuckDB tables */
  loadDataToTables?: boolean
  /** Table name prefix for imported data */
  tablePrefix?: string
  /** Overwrite existing tables */
  overwriteTables?: boolean
  /** Merge with existing report */
  mergeMode?: 'replace' | 'merge' | 'append'
}

/**
 * MVR Import Result
 */
export interface MVRImportResult {
  success: boolean
  report?: MVRReport
  tablesCreated?: string[]
  errors?: string[]
  warnings?: string[]
}

/**
 * Data marker patterns for parsing
 */
export const MVR_DATA_MARKERS = {
  /** Start of data block: <!-- @data:queryName --> */
  START: /<!--\s*@data:(\w+)\s*-->/,
  /** End of data block: <!-- @end:queryName --> */
  END: /<!--\s*@end:(\w+)\s*-->/,
  /** SQL marker: <!-- @sql:queryName --> */
  SQL: /<!--\s*@sql:(\w+)\s*-->/
} as const
