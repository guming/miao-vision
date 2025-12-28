/**
 * Database Module
 *
 * Unified exports for all database-related functionality.
 *
 * Note: This module now uses the new connector system internally
 * while maintaining backward compatibility with the old API.
 */

// Export DuckDB Manager and instances
// Note: Now using real DuckDBManager with schema isolation support
export {
  DuckDBManager,
  workspaceDB,
  duckDBManager,  // Alias for workspaceDB (with schema methods)
  createReportDB,
  WORKSPACE_DB_PATH,
  WORKSPACE_ATTACH_NAME
} from './duckdb'

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
