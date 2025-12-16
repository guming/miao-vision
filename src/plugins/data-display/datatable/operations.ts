/**
 * DataTable Operations
 *
 * Functions for sorting, searching, and filtering table data
 */

import type { SortState } from './types'

/**
 * Sort data by column
 */
export function sortData(
  data: any[],
  sortState: SortState | null
): any[] {
  if (!sortState) {
    return data
  }

  const { column, direction } = sortState

  return [...data].sort((a, b) => {
    const aVal = a[column]
    const bVal = b[column]

    // Handle null/undefined
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1

    // Compare values
    let comparison = 0

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime()
    } else {
      // String comparison
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      comparison = aStr.localeCompare(bStr)
    }

    return direction === 'asc' ? comparison : -comparison
  })
}

/**
 * Search/filter data by query
 */
export function searchData(
  data: any[],
  query: string,
  columns: string[]
): any[] {
  if (!query || query.trim() === '') {
    return data
  }

  const searchTerm = query.toLowerCase().trim()

  return data.filter(row => {
    return columns.some(col => {
      const value = row[col]
      if (value === null || value === undefined) return false

      const strValue = String(value).toLowerCase()
      return strValue.includes(searchTerm)
    })
  })
}

/**
 * Toggle sort direction for a column
 */
export function toggleSort(
  currentSort: SortState | null,
  column: string
): SortState {
  if (currentSort && currentSort.column === column) {
    return {
      column,
      direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
    }
  }

  return {
    column,
    direction: 'asc'
  }
}

/**
 * Apply search and sort to data
 */
export function processData(
  data: any[],
  searchQuery: string,
  sortState: SortState | null,
  columns: string[]
): any[] {
  let processed = searchData(data, searchQuery, columns)
  processed = sortData(processed, sortState)
  return processed
}

/**
 * Get sort icon for column header
 */
export function getSortIcon(
  column: string,
  currentSort: SortState | null
): string {
  if (!currentSort || currentSort.column !== column) {
    return '⇅'
  }

  return currentSort.direction === 'asc' ? '↑' : '↓'
}
