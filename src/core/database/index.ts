/**
 * Database Module
 *
 * Unified exports for all database-related functionality.
 */

// DuckDB Manager
export { duckDBManager, DuckDBManager } from './duckdb'

// Mosaic/vgplot integration
export {
  initializeMosaic,
  isMosaicInitialized,
  coordinator,
  getVgplotContext
} from './mosaic'

// Table loading utilities
export { loadDataIntoTable, dropTable } from './table-loader'
