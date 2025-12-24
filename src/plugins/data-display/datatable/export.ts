/**
 * DataTable Export Utilities
 *
 * Functions for exporting table data to CSV and Excel
 * Supports formatted values, HTML cleaning, and special column types
 */

import type { ColumnConfig } from './types'
import * as XLSX from 'xlsx'

/**
 * Strip HTML tags from string
 */
function stripHTML(html: string): string {
  // Create a temporary div to parse HTML
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

/**
 * Get exportable value for a cell
 * Handles formatting, HTML cleaning, and special column types
 */
function getExportValue(
  row: any,
  column: ColumnConfig,
  formatter?: (row: any, column: ColumnConfig) => string
): any {
  const rawValue = row[column.name]

  // Handle null/undefined
  if (rawValue === null || rawValue === undefined) {
    return ''
  }

  // Handle HTML columns - strip HTML tags
  if (column.contentType === 'html') {
    return stripHTML(String(rawValue))
  }

  // Handle image columns - export URL
  if (column.contentType === 'image') {
    return String(rawValue)
  }

  // Use formatter if provided (for formatted values like currency, dates, etc.)
  if (formatter) {
    try {
      return formatter(row, column)
    } catch {
      // Fallback to raw value if formatter fails
      return rawValue
    }
  }

  return rawValue
}

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
 * @param data - Array of data rows
 * @param columns - Column configurations
 * @param formatter - Optional formatter function for formatted values
 */
export function dataToCSV(
  data: any[],
  columns: ColumnConfig[],
  formatter?: (row: any, column: ColumnConfig) => string
): string {
  const lines: string[] = []

  // Header row
  const headers = columns.map(col => escapeCSVValue(col.label || col.name))
  lines.push(headers.join(','))

  // Data rows
  for (const row of data) {
    const values = columns.map(col => {
      const value = getExportValue(row, col, formatter)
      return escapeCSVValue(value)
    })
    lines.push(values.join(','))
  }

  return lines.join('\n')
}

/**
 * Download CSV file
 * @param data - Array of data rows
 * @param columns - Column configurations
 * @param filename - Output filename
 * @param formatter - Optional formatter function for formatted values
 */
export function downloadCSV(
  data: any[],
  columns: ColumnConfig[],
  filename: string = 'data.csv',
  formatter?: (row: any, column: ColumnConfig) => string
): void {
  try {
    const csv = dataToCSV(data, columns, formatter)
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
 * @param data - Array of data rows
 * @param columns - Column configurations
 * @param formatter - Optional formatter function for formatted values
 */
export async function copyCSVToClipboard(
  data: any[],
  columns: ColumnConfig[],
  formatter?: (row: any, column: ColumnConfig) => string
): Promise<void> {
  try {
    const csv = dataToCSV(data, columns, formatter)
    await navigator.clipboard.writeText(csv)
    console.log('CSV copied to clipboard')
  } catch (error) {
    console.error('Failed to copy CSV to clipboard:', error)
    throw error
  }
}

/**
 * Convert data to Excel workbook
 * @param data - Array of data rows
 * @param columns - Column configurations
 * @param sheetName - Sheet name
 * @param formatter - Optional formatter function for formatted values
 */
export function dataToWorkbook(
  data: any[],
  columns: ColumnConfig[],
  sheetName: string = 'Data',
  formatter?: (row: any, column: ColumnConfig) => string
): XLSX.WorkBook {
  // Prepare data with headers
  const headers = columns.map(col => col.label || col.name)
  const rows = data.map(row =>
    columns.map(col => getExportValue(row, col, formatter))
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
 * @param data - Array of data rows
 * @param columns - Column configurations
 * @param filename - Output filename
 * @param sheetName - Sheet name
 * @param formatter - Optional formatter function for formatted values
 */
export function downloadExcel(
  data: any[],
  columns: ColumnConfig[],
  filename: string = 'data.xlsx',
  sheetName: string = 'Data',
  formatter?: (row: any, column: ColumnConfig) => string
): void {
  try {
    const wb = dataToWorkbook(data, columns, sheetName, formatter)

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
 * @param data - Array of data rows
 * @param columns - Column configurations
 * @param format - Export format (csv or xlsx)
 * @param baseFilename - Base filename (timestamp will be appended)
 * @param formatter - Optional formatter function for formatted values
 */
export function downloadData(
  data: any[],
  columns: ColumnConfig[],
  format: ExportFormat,
  baseFilename: string = 'data',
  formatter?: (row: any, column: ColumnConfig) => string
): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${baseFilename}_${timestamp}`

  if (format === 'xlsx') {
    downloadExcel(data, columns, `${filename}.xlsx`, 'Data', formatter)
  } else {
    downloadCSV(data, columns, `${filename}.csv`, formatter)
  }
}
