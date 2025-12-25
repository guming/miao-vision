/**
 * Chart Worker Hook
 *
 * Provides a clean API for using the chart data worker.
 * Handles worker lifecycle, message passing, and error handling.
 */

import type { ChartDataRequest, ChartDataResponse } from './chart-data.worker'

// Singleton worker instance
let workerInstance: Worker | null = null
let isWorkerSupported = true

/**
 * Get or create worker instance
 */
function getWorker(): Worker | null {
  if (!isWorkerSupported) return null

  try {
    if (!workerInstance) {
      // Vite will bundle this as a separate chunk
      workerInstance = new Worker(
        new URL('./chart-data.worker.ts', import.meta.url),
        { type: 'module' }
      )
      console.log('[ChartWorker] Worker initialized')
    }
    return workerInstance
  } catch (error) {
    console.error('[ChartWorker] Failed to create worker:', error)
    isWorkerSupported = false
    return null
  }
}

/**
 * Send request to worker and wait for response
 */
function sendWorkerRequest(request: ChartDataRequest): Promise<ChartDataResponse> {
  const worker = getWorker()

  if (!worker) {
    // Fallback: return error
    return Promise.resolve({
      type: request.type,
      success: false,
      error: 'Worker not supported'
    })
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Worker timeout'))
    }, 30000) // 30s timeout

    const handleMessage = (e: MessageEvent<ChartDataResponse>) => {
      clearTimeout(timeout)
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)

      if (e.data.success) {
        resolve(e.data)
      } else {
        reject(new Error(e.data.error || 'Worker failed'))
      }
    }

    const handleError = (error: ErrorEvent) => {
      clearTimeout(timeout)
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      reject(error)
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage(request)
  })
}

/**
 * Build SQL in worker (non-blocking)
 */
export async function buildTableSQLInWorker(
  tableName: string,
  data: any[],
  columns: string[]
): Promise<string> {
  try {
    const response = await sendWorkerRequest({
      type: 'buildSQL',
      tableName,
      data,
      columns
    })

    if (!response.sql) {
      throw new Error('Worker returned no SQL')
    }

    console.log(`[ChartWorker] SQL built in ${response.processingTime?.toFixed(2)}ms`)
    return response.sql
  } catch (error) {
    console.error('[ChartWorker] Failed to build SQL in worker:', error)
    throw error
  }
}

/**
 * Infer column types in worker (non-blocking)
 */
export async function inferColumnTypesInWorker(
  data: any[],
  columns: string[]
): Promise<Record<string, 'number' | 'string' | 'date' | 'boolean' | 'unknown'>> {
  try {
    const response = await sendWorkerRequest({
      type: 'inferTypes',
      tableName: '', // Not needed for type inference
      data,
      columns
    })

    if (!response.columnTypes) {
      throw new Error('Worker returned no column types')
    }

    return response.columnTypes
  } catch (error) {
    console.error('[ChartWorker] Failed to infer types in worker:', error)
    throw error
  }
}

/**
 * Check if worker is available
 */
export function isChartWorkerAvailable(): boolean {
  return isWorkerSupported
}

/**
 * Terminate worker (cleanup)
 */
export function terminateChartWorker(): void {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
    console.log('[ChartWorker] Worker terminated')
  }
}
