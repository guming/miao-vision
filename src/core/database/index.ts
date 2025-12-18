/**
 * Database Module
 *
 * Unified exports for all database-related functionality.
 *
 * Note: This module now uses the new connector system internally
 * while maintaining backward compatibility with the old API.
 */

// Legacy DuckDB Manager (uses new WasmConnector internally)
// Import the compat layer for backward compatibility
import { duckDBManagerCompat } from '../connectors/compat'

// Re-export as duckDBManager for backward compatibility
export const duckDBManager = duckDBManagerCompat

// Export the legacy class for type compatibility (deprecated)
// New code should use WasmConnector from '@core/connectors'
export { DuckDBManager } from './duckdb'

// Mosaic/vgplot integration
export {
  initializeMosaic,
  isMosaicInitialized,
  coordinator,
  getVgplotContext
} from './mosaic'

// Table loading utilities
export { loadDataIntoTable, dropTable } from './table-loader'

// Re-export new connector system for gradual migration
export {
  WasmConnector,
  createWasmConnector,
  ConnectorRegistry,
  type Connector,
  type ConnectorConfig,
  type QueryResult as ConnectorQueryResult
} from '../connectors'
