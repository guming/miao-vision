/**
 * Pagination Service
 *
 * Handles paginated queries for large datasets using SQL LIMIT/OFFSET.
 * Supports both offset-based and cursor-based pagination.
 *
 * @module core/database/pagination
 */

import type { QueryResult } from '@/types/database'

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Current page number (1-indexed) */
  page: number
  /** Number of rows per page */
  pageSize: number
  /** Sort column */
  sortColumn?: string
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
}

/**
 * Paginated query result
 */
export interface PaginatedResult<T = Record<string, unknown>> {
  /** Data for current page */
  data: T[]
  /** Column names */
  columns: string[]
  /** Total rows (before pagination) */
  totalRows: number
  /** Total pages */
  totalPages: number
  /** Current page (1-indexed) */
  currentPage: number
  /** Page size */
  pageSize: number
  /** Has more pages */
  hasNextPage: boolean
  /** Has previous pages */
  hasPreviousPage: boolean
  /** Execution time in ms */
  executionTime: number
}

/**
 * Cursor-based pagination options
 */
export interface CursorPaginationOptions {
  /** Cursor value (last value of sort column from previous page) */
  cursor?: string | number | null
  /** Number of rows to fetch */
  limit: number
  /** Sort column (required for cursor pagination) */
  sortColumn: string
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
}

/**
 * Cursor-based paginated result
 */
export interface CursorPaginatedResult<T = Record<string, unknown>> {
  /** Data for current page */
  data: T[]
  /** Column names */
  columns: string[]
  /** Row count for this page */
  rowCount: number
  /** Next cursor value (null if no more pages) */
  nextCursor: string | number | null
  /** Has more pages */
  hasMore: boolean
  /** Execution time in ms */
  executionTime: number
}

/**
 * Query executor interface
 */
export interface QueryExecutor {
  query(sql: string): Promise<QueryResult>
}

/**
 * Wrap a query with pagination (LIMIT/OFFSET)
 */
export function wrapWithPagination(
  sql: string,
  options: PaginationOptions
): string {
  const { page, pageSize, sortColumn, sortDirection } = options
  const offset = (page - 1) * pageSize

  // Remove trailing semicolon if present
  const cleanSql = sql.trim().replace(/;$/, '')

  // Build the paginated query
  let paginatedSql = `SELECT * FROM (${cleanSql}) AS _paginated`

  if (sortColumn) {
    const direction = sortDirection?.toUpperCase() || 'ASC'
    paginatedSql += ` ORDER BY "${sortColumn}" ${direction}`
  }

  paginatedSql += ` LIMIT ${pageSize} OFFSET ${offset}`

  return paginatedSql
}

/**
 * Wrap a query with cursor-based pagination
 */
export function wrapWithCursorPagination(
  sql: string,
  options: CursorPaginationOptions
): string {
  const { cursor, limit, sortColumn, sortDirection = 'asc' } = options

  // Remove trailing semicolon if present
  const cleanSql = sql.trim().replace(/;$/, '')

  const direction = sortDirection.toUpperCase()
  const operator = direction === 'ASC' ? '>' : '<'

  let paginatedSql = `SELECT * FROM (${cleanSql}) AS _cursor_paginated`

  if (cursor !== null && cursor !== undefined) {
    const cursorValue = typeof cursor === 'string' ? `'${cursor}'` : cursor
    paginatedSql += ` WHERE "${sortColumn}" ${operator} ${cursorValue}`
  }

  paginatedSql += ` ORDER BY "${sortColumn}" ${direction}`
  paginatedSql += ` LIMIT ${limit + 1}` // Fetch one extra to check if more exist

  return paginatedSql
}

/**
 * Get total row count for a query
 */
export function wrapWithCount(sql: string): string {
  // Remove trailing semicolon if present
  const cleanSql = sql.trim().replace(/;$/, '')

  return `SELECT COUNT(*) AS _total_count FROM (${cleanSql}) AS _count_subquery`
}

/**
 * Pagination Service
 */
export class PaginationService {
  constructor(private executor: QueryExecutor) {}

  /**
   * Execute a paginated query (offset-based)
   */
  async executePaginated(
    sql: string,
    options: PaginationOptions
  ): Promise<PaginatedResult> {
    const startTime = performance.now()

    // Execute count query and data query in parallel
    const [countResult, dataResult] = await Promise.all([
      this.executor.query(wrapWithCount(sql)),
      this.executor.query(wrapWithPagination(sql, options))
    ])

    const totalRows = Number(countResult.data[0]?._total_count || 0)
    const totalPages = Math.ceil(totalRows / options.pageSize)

    const executionTime = performance.now() - startTime

    return {
      data: dataResult.data,
      columns: dataResult.columns,
      totalRows,
      totalPages,
      currentPage: options.page,
      pageSize: options.pageSize,
      hasNextPage: options.page < totalPages,
      hasPreviousPage: options.page > 1,
      executionTime
    }
  }

  /**
   * Execute a cursor-based paginated query
   * More efficient for large offsets
   */
  async executeCursorPaginated(
    sql: string,
    options: CursorPaginationOptions
  ): Promise<CursorPaginatedResult> {
    const startTime = performance.now()

    const result = await this.executor.query(
      wrapWithCursorPagination(sql, options)
    )

    // Check if we have more results (we fetched limit + 1)
    const hasMore = result.data.length > options.limit
    const data = hasMore ? result.data.slice(0, options.limit) : result.data

    // Get next cursor value
    let nextCursor: string | number | null = null
    if (hasMore && data.length > 0) {
      const lastRow = data[data.length - 1]
      nextCursor = lastRow[options.sortColumn] as string | number
    }

    const executionTime = performance.now() - startTime

    return {
      data,
      columns: result.columns.filter(c => c !== '_cursor_paginated'),
      rowCount: data.length,
      nextCursor,
      hasMore,
      executionTime
    }
  }

  /**
   * Get estimated row count (faster but approximate)
   * Uses EXPLAIN to estimate without full scan
   */
  async getEstimatedCount(tableName: string): Promise<number> {
    try {
      // Try to get from DuckDB statistics
      const result = await this.executor.query(
        `SELECT estimated_size FROM duckdb_tables() WHERE table_name = '${tableName}'`
      )
      if (result.data.length > 0 && result.data[0].estimated_size != null) {
        return Number(result.data[0].estimated_size)
      }
    } catch {
      // Fallback to actual count
    }

    const result = await this.executor.query(
      `SELECT COUNT(*) as cnt FROM "${tableName}"`
    )
    return Number(result.data[0]?.cnt || 0)
  }

  /**
   * Check if a query would benefit from pagination
   */
  async shouldPaginate(sql: string, threshold = 10000): Promise<boolean> {
    try {
      const countResult = await this.executor.query(wrapWithCount(sql))
      const count = Number(countResult.data[0]?._total_count || 0)
      return count > threshold
    } catch {
      return false
    }
  }
}

/**
 * Default page sizes
 */
export const PAGE_SIZES = [25, 50, 100, 250, 500, 1000] as const

/**
 * Default pagination options
 */
export const DEFAULT_PAGINATION: PaginationOptions = {
  page: 1,
  pageSize: 100
}

/**
 * Create pagination service
 */
export function createPaginationService(
  executor: QueryExecutor
): PaginationService {
  return new PaginationService(executor)
}
