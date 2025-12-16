/**
 * DataTable Export Utilities
 *
 * Functions for exporting table data to CSV and Excel
 */

import type { ColumnConfig } from './types'
import * as XLSX from 'xlsx'

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

/**
 * Convert data to Excel workbook
 */
export function dataToWorkbook(
  data: any[],
  columns: ColumnConfig[],
  sheetName: string = 'Data'
): XLSX.WorkBook {
  // Prepare data with headers
  const headers = columns.map(col => col.label || col.name)
  const rows = data.map(row =>
    columns.map(col => row[col.name])
  )

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Set column widths based on content
  const colWidths = columns.map((col, idx) => {
    const headerLen = (col.label || col.name).length
    const maxDataLen = Math.max(...rows.map(row => {
      const val = row[idx]
      return val ? String(val).length : 0
    }))
    return { wch: Math.min(50, Math.max(10, headerLen, maxDataLen)) }
  })
  ws['!cols'] = colWidths

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  return wb
}

/**
 * Download Excel file (.xlsx)
 */
export function downloadExcel(
  data: any[],
  columns: ColumnConfig[],
  filename: string = 'data.xlsx',
  sheetName: string = 'Data'
): void {
  try {
    const wb = dataToWorkbook(data, columns, sheetName)

    // Write and download
    XLSX.writeFile(wb, filename)

    console.log(`Excel exported: ${filename}`)
  } catch (error) {
    console.error('Failed to export Excel:', error)
    throw error
  }
}

/**
 * Export type options
 */
export type ExportFormat = 'csv' | 'xlsx'

/**
 * Download data in specified format
 */
export function downloadData(
  data: any[],
  columns: ColumnConfig[],
  format: ExportFormat,
  baseFilename: string = 'data'
): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${baseFilename}_${timestamp}`

  if (format === 'xlsx') {
    downloadExcel(data, columns, `${filename}.xlsx`)
  } else {
    downloadCSV(data, columns, `${filename}.csv`)
  }
}
