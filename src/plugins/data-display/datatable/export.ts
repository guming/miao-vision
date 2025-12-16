/**
 * DataTable Export Utilities
 *
 * Functions for exporting table data to CSV
 */

import type { ColumnConfig } from './types'

/**
 * Escape CSV value (handle quotes and commas)
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  const str = String(value)

  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Convert data to CSV string
 */
export function dataToCSV(
  data: any[],
  columns: ColumnConfig[]
): string {
  const lines: string[] = []

  // Header row
  const headers = columns.map(col => escapeCSVValue(col.label || col.name))
  lines.push(headers.join(','))

  // Data rows
  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col.name]
      return escapeCSVValue(value)
    })
    lines.push(values.join(','))
  }

  return lines.join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(
  data: any[],
  columns: ColumnConfig[],
  filename: string = 'data.csv'
): void {
  try {
    const csv = dataToCSV(data, columns)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    console.log(`CSV exported: ${filename}`)
  } catch (error) {
    console.error('Failed to export CSV:', error)
    throw error
  }
}

/**
 * Copy CSV to clipboard
 */
export async function copyCSVToClipboard(
  data: any[],
  columns: ColumnConfig[]
): Promise<void> {
  try {
    const csv = dataToCSV(data, columns)
    await navigator.clipboard.writeText(csv)
    console.log('CSV copied to clipboard')
  } catch (error) {
    console.error('Failed to copy CSV to clipboard:', error)
    throw error
  }
}
