/**
 * Mosaic Coordinator Initialization
 *
 * Initializes Mosaic/vgplot with a shared DuckDB instance.
 * This ensures both SQL queries and chart rendering use the same database.
 */

import { wasmConnector, coordinator as mosaicCoordinator } from '@uwdata/mosaic-core'
import * as vg from '@uwdata/vgplot'
import { duckDBManager } from './duckdb'

let mosaicInitialized = false
let vgplotContext: any = null

/**
 * Initialize Mosaic with the shared DuckDB instance
 */
export async function initializeMosaic() {
  if (mosaicInitialized) {
    console.log('Mosaic already initialized')
    return vgplotContext
  }

  try {
    // Ensure DuckDB is initialized first
    if (!duckDBManager.isInitialized()) {
      await duckDBManager.initialize()
    }

    // Get the underlying AsyncDuckDB instance from duckDBManager
    const duckdb = duckDBManager.getDB()
    if (!duckdb) {
      throw new Error('DuckDB instance not available')
    }

    // Use Mosaic's wasmConnector with our shared DuckDB instance
    // This ensures both SQL queries and Mosaic charts use the same database
    const connector = wasmConnector({ duckdb })

    // Get the coordinator instance
    const coord = mosaicCoordinator()

    // Set up the coordinator with the shared DuckDB connector
    coord.databaseConnector(connector)

    // Create vgplot API context
    vgplotContext = vg.createAPIContext({ coordinator: coord })

    mosaicInitialized = true
    console.log('Mosaic initialized with shared DuckDB instance')

    return vgplotContext
  } catch (error) {
    console.error('Failed to initialize Mosaic:', error)
    throw error
  }
}

/**
 * Check if Mosaic is initialized
 */
export function isMosaicInitialized(): boolean {
  return mosaicInitialized
}

/**
 * Get the Mosaic coordinator instance
 */
export function coordinator() {
  return mosaicCoordinator()
}

/**
 * Get the vgplot API context
 */
export function getVgplotContext() {
  return vgplotContext
}
