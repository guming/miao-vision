/**
 * Chart Data Worker
 *
 * Handles CPU-intensive data processing for charts in background thread.
 * Prevents main thread blocking during large dataset processing.
 *
 * Tasks:
 * - Build SQL INSERT statements from data arrays
 * - Infer column types
 * - Data transformation and validation
 */

export interface ChartDataRequest {
  type: 'buildSQL' | 'inferTypes'
  tableName: string
  data: any[]
  columns: string[]
}

export interface ChartDataResponse {
  type: 'buildSQL' | 'inferTypes'
  success: boolean
  sql?: string
  columnTypes?: Record<string, 'number' | 'string' | 'date' | 'boolean' | 'unknown'>
  error?: string
  processingTime?: number
}

/**
 * Build SQL CREATE TABLE statement from data array
 * This is the CPU-intensive part that blocks main thread
 */
function buildTableSQL(tableName: string, data: any[], columns: string[]): string {
  if (data.length === 0) {
    throw new Error('Cannot create table: no data')
  }

  const startTime = performance.now()

  // Build column definitions
  const columnDefs = columns.map(col => `"${col}"`).join(', ')

  // Build values - this is the expensive part!
  const values = data.map(row => {
    const vals = columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return 'NULL'
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
      return String(val)
    })
    return `(${vals.join(', ')})`
  }).join(', ')

  const sql = `
    CREATE OR REPLACE TABLE "${tableName}" AS
    SELECT * FROM (VALUES ${values}) AS t(${columnDefs})
  `

  const processingTime = performance.now() - startTime
  console.log(`[ChartWorker] SQL built in ${processingTime.toFixed(2)}ms for ${data.length} rows`)

  return sql
}

/**
 * Infer column types from data
 */
function inferColumnTypes(data: any[], columns: string[]): Record<string, 'number' | 'string' | 'date' | 'boolean' | 'unknown'> {
  const types: Record<string, 'number' | 'string' | 'date' | 'boolean' | 'unknown'> = {}

  for (const col of columns) {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined)
    if (values.length === 0) {
      types[col] = 'unknown'
      continue
    }

    const sample = values[0]
    if (typeof sample === 'number') types[col] = 'number'
    else if (typeof sample === 'boolean') types[col] = 'boolean'
    else if (sample instanceof Date) types[col] = 'date'
    else if (typeof sample === 'string') {
      // Check if looks like date
      const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/
      types[col] = datePattern.test(sample) ? 'date' : 'string'
    } else {
      types[col] = 'string'
    }
  }

  return types
}

/**
 * Message handler
 */
self.onmessage = (e: MessageEvent<ChartDataRequest>) => {
  const { type, tableName, data, columns } = e.data
  const startTime = performance.now()

  try {
    let response: ChartDataResponse

    switch (type) {
      case 'buildSQL': {
        const sql = buildTableSQL(tableName, data, columns)
        response = {
          type: 'buildSQL',
          success: true,
          sql,
          processingTime: performance.now() - startTime
        }
        break
      }

      case 'inferTypes': {
        const columnTypes = inferColumnTypes(data, columns)
        response = {
          type: 'inferTypes',
          success: true,
          columnTypes,
          processingTime: performance.now() - startTime
        }
        break
      }

      default:
        throw new Error(`Unknown request type: ${type}`)
    }

    self.postMessage(response)
  } catch (error) {
    const response: ChartDataResponse = {
      type,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: performance.now() - startTime
    }
    self.postMessage(response)
  }
}

// Export for TypeScript
export {}
