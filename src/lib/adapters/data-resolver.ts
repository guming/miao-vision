/**
 * DataResolver - Unified Data Source Resolution Layer
 *
 * Eliminates duplicate SQL block lookup and data extraction logic across all component parsers.
 * Provides a consistent API for resolving data from SQL query results.
 */

import type { ReportBlock } from '@/types/report'
import type { QueryResult } from '@/types/database'

/**
 * Data resolution result
 */
export interface ResolveResult<T> {
  /** Whether resolution succeeded */
  success: boolean
  /** Resolved data (null if failed) */
  data: T | null
  /** Error message if failed */
  error?: string
  /** The source block that provided the data */
  sourceBlock?: ReportBlock
}

/**
 * Options for resolving select options (dropdowns, button groups)
 */
export interface SelectResolveOptions {
  /** Column name for option values */
  valueColumn: string
  /** Column name for option labels (defaults to valueColumn) */
  labelColumn?: string
  /** Maximum number of options to return */
  limit?: number
}

/**
 * Generic select option type
 */
export interface SelectOption {
  value: string
  label: string
}

/**
 * Options for resolving single values
 */
export interface SingleValueOptions {
  /** Column name to extract */
  column: string
  /** Row index to extract from (default: 0) */
  rowIndex?: number
}

/**
 * Table data structure
 */
export interface TableData {
  columns: string[]
  rows: Array<Record<string, unknown>>
  totalRows: number
}

/**
 * Data source status
 */
export type DataSourceStatus =
  | 'not_found'   // Block doesn't exist
  | 'pending'     // Block exists but not executed
  | 'executing'   // Block is currently executing
  | 'ready'       // Block has results
  | 'error'       // Block execution failed

/**
 * DataResolver class - handles all data source resolution
 */
export class DataResolver {
  /**
   * Find a SQL block by name or ID
   */
  findBlock(identifier: string, blocks: ReportBlock[]): ReportBlock | undefined {
    return blocks.find(
      (b) =>
        b.type === 'sql' &&
        (b.metadata?.name === identifier || b.id === identifier)
    )
  }

  /**
   * Get the raw query result from a SQL block
   */
  getQueryResult(
    identifier: string,
    blocks: ReportBlock[]
  ): ResolveResult<QueryResult> {
    const block = this.findBlock(identifier, blocks)

    if (!block) {
      return {
        success: false,
        data: null,
        error: `SQL block not found: "${identifier}"`
      }
    }

    if (block.error) {
      return {
        success: false,
        data: null,
        error: `SQL block "${identifier}" has error: ${block.error}`,
        sourceBlock: block
      }
    }

    if (!block.sqlResult) {
      return {
        success: false,
        data: null,
        error: `SQL block "${identifier}" has no result (not executed yet)`,
        sourceBlock: block
      }
    }

    return {
      success: true,
      data: block.sqlResult,
      sourceBlock: block
    }
  }

  /**
   * Resolve select options from a SQL query result
   * Used by Dropdown, ButtonGroup, etc.
   */
  resolveSelectOptions(
    identifier: string,
    blocks: ReportBlock[],
    options: SelectResolveOptions
  ): ResolveResult<SelectOption[]> {
    const result = this.getQueryResult(identifier, blocks)

    if (!result.success || !result.data) {
      return {
        success: false,
        data: null,
        error: result.error,
        sourceBlock: result.sourceBlock
      }
    }

    const { columns, data } = result.data
    const valueCol = options.valueColumn
    const labelCol = options.labelColumn || options.valueColumn

    // Validate columns exist
    if (!columns.includes(valueCol)) {
      return {
        success: false,
        data: null,
        error: `Column "${valueCol}" not found in query result. Available columns: ${columns.join(', ')}`,
        sourceBlock: result.sourceBlock
      }
    }

    if (labelCol !== valueCol && !columns.includes(labelCol)) {
      return {
        success: false,
        data: null,
        error: `Label column "${labelCol}" not found in query result. Available columns: ${columns.join(', ')}`,
        sourceBlock: result.sourceBlock
      }
    }

    // Extract options
    const selectOptions: SelectOption[] = []
    const limit = options.limit ?? Infinity

    for (let i = 0; i < Math.min(data.length, limit); i++) {
      const row = data[i]
      const value = row[valueCol]
      const label = row[labelCol]

      if (value !== null && value !== undefined) {
        selectOptions.push({
          value: String(value),
          label: String(label ?? value)
        })
      }
    }

    return {
      success: true,
      data: selectOptions,
      sourceBlock: result.sourceBlock
    }
  }

  /**
   * Resolve a single value from a SQL query result
   * Used by BigValue, Value components
   */
  resolveSingleValue<T = unknown>(
    identifier: string,
    blocks: ReportBlock[],
    options: SingleValueOptions
  ): ResolveResult<T> {
    const result = this.getQueryResult(identifier, blocks)

    if (!result.success || !result.data) {
      return {
        success: false,
        data: null,
        error: result.error,
        sourceBlock: result.sourceBlock
      }
    }

    const { columns, data } = result.data
    const { column, rowIndex = 0 } = options

    // Validate column exists
    if (!columns.includes(column)) {
      return {
        success: false,
        data: null,
        error: `Column "${column}" not found in query result. Available columns: ${columns.join(', ')}`,
        sourceBlock: result.sourceBlock
      }
    }

    // Validate row exists
    if (data.length === 0) {
      return {
        success: false,
        data: null,
        error: 'Query returned no rows',
        sourceBlock: result.sourceBlock
      }
    }

    if (rowIndex >= data.length) {
      return {
        success: false,
        data: null,
        error: `Row index ${rowIndex} out of bounds (query returned ${data.length} rows)`,
        sourceBlock: result.sourceBlock
      }
    }

    return {
      success: true,
      data: data[rowIndex][column] as T,
      sourceBlock: result.sourceBlock
    }
  }

  /**
   * Resolve table data from a SQL query result
   * Used by DataTable component
   */
  resolveTableData(
    identifier: string,
    blocks: ReportBlock[],
    options?: { limit?: number }
  ): ResolveResult<TableData> {
    const result = this.getQueryResult(identifier, blocks)

    if (!result.success || !result.data) {
      return {
        success: false,
        data: null,
        error: result.error,
        sourceBlock: result.sourceBlock
      }
    }

    const { columns, data, rowCount } = result.data
    const limit = options?.limit ?? Infinity

    return {
      success: true,
      data: {
        columns,
        rows: limit < Infinity ? data.slice(0, limit) : data,
        totalRows: rowCount
      },
      sourceBlock: result.sourceBlock
    }
  }

  /**
   * Resolve multiple values from a single row
   * Useful for components that need multiple columns
   */
  resolveRow(
    identifier: string,
    blocks: ReportBlock[],
    rowIndex: number = 0
  ): ResolveResult<Record<string, unknown>> {
    const result = this.getQueryResult(identifier, blocks)

    if (!result.success || !result.data) {
      return {
        success: false,
        data: null,
        error: result.error,
        sourceBlock: result.sourceBlock
      }
    }

    const { data } = result.data

    if (data.length === 0) {
      return {
        success: false,
        data: null,
        error: 'Query returned no rows',
        sourceBlock: result.sourceBlock
      }
    }

    if (rowIndex >= data.length) {
      return {
        success: false,
        data: null,
        error: `Row index ${rowIndex} out of bounds (query returned ${data.length} rows)`,
        sourceBlock: result.sourceBlock
      }
    }

    return {
      success: true,
      data: data[rowIndex],
      sourceBlock: result.sourceBlock
    }
  }

  /**
   * Check if a data source is available (has results)
   */
  isAvailable(identifier: string, blocks: ReportBlock[]): boolean {
    const block = this.findBlock(identifier, blocks)
    return !!block?.sqlResult
  }

  /**
   * Get the status of a data source
   */
  getStatus(identifier: string, blocks: ReportBlock[]): DataSourceStatus {
    const block = this.findBlock(identifier, blocks)

    if (!block) return 'not_found'
    if (block.error) return 'error'
    if (block.status === 'executing') return 'executing'
    if (block.sqlResult) return 'ready'
    return 'pending'
  }

  /**
   * Get column names from a query result
   */
  getColumns(identifier: string, blocks: ReportBlock[]): string[] | null {
    const result = this.getQueryResult(identifier, blocks)
    return result.success && result.data ? result.data.columns : null
  }

  /**
   * Get row count from a query result
   */
  getRowCount(identifier: string, blocks: ReportBlock[]): number | null {
    const result = this.getQueryResult(identifier, blocks)
    return result.success && result.data ? result.data.rowCount : null
  }

  /**
   * Validate that required columns exist in a query result
   */
  validateColumns(
    identifier: string,
    blocks: ReportBlock[],
    requiredColumns: string[]
  ): { valid: boolean; missing: string[] } {
    const columns = this.getColumns(identifier, blocks)

    if (!columns) {
      return { valid: false, missing: requiredColumns }
    }

    const missing = requiredColumns.filter((col) => !columns.includes(col))
    return {
      valid: missing.length === 0,
      missing
    }
  }
}

/**
 * Singleton instance
 */
export const dataResolver = new DataResolver()
