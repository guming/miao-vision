/**
 * WASM Connector Module
 *
 * DuckDB-WASM connector with OPFS persistence support.
 *
 * @module core/connectors/wasm
 */

export { WasmConnector, createWasmConnector, isOPFSSupported } from './connector'

export type {
  WasmConnectorOptions,
  WasmConnectorDeps,
  DuckDBBundle,
  DuckDBBundles,
  FileLoadResult,
  StorageInfo
} from './types'
