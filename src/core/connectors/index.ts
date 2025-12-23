/**
 * Connectors Module
 *
 * Pluggable connector system for multiple data sources.
 *
 * @module core/connectors
 *
 * @example
 * ```typescript
 * import {
 *   ConnectorRegistry,
 *   type Connector,
 *   type ConnectorConfig,
 *   ok, err, isOk
 * } from '@core/connectors'
 *
 * // Register connectors
 * ConnectorRegistry.register('wasm', createWasmConnector, 'DuckDB-WASM')
 *
 * // Create and use
 * const result = await ConnectorRegistry.createAndConnect({
 *   id: 'local',
 *   name: 'Local DB',
 *   type: 'wasm',
 *   options: { persist: true }
 * })
 *
 * if (isOk(result)) {
 *   const queryResult = await result.value.query('SELECT * FROM users')
 * }
 * ```
 */

// Types
export type {
  ConnectorType,
  ConnectionStatus,
  ConnectorConfig,
  ConnectorCapabilities,
  ColumnInfo,
  TableInfo,
  QueryResult,
  QueryOptions,
  TestResult,
  Connector,
  WasmConnectorInterface,
  ConnectorConstructor,
  ConnectorDeps,
  Logger,
  StorageProvider
} from './types'

// Errors
export type {
  ConnectorErrorCode,
  QueryErrorCode,
  BaseError,
  ConnectorError,
  QueryError
} from './errors'

export {
  connectorError,
  queryError,
  isConnectorError,
  isQueryError,
  toConnectorError,
  toQueryError
} from './errors'

// Result utilities
export type { Result } from './result'

export {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  andThen,
  andThenAsync,
  tryAsync,
  trySync,
  combine
} from './result'

// Registry
export type { ConnectorFactory } from './registry'
import { ConnectorRegistry } from './registry'
export { ConnectorRegistry }

// WASM Connector
export { WasmConnector, createWasmConnector, isOPFSSupported } from './wasm'
export type {
  WasmConnectorOptions,
  WasmConnectorDeps
} from './wasm'

// MotherDuck Connector
export { MotherDuckConnector, createMotherDuckConnector } from './motherduck'
export type {
  MotherDuckConnectorOptions,
  MotherDuckConnectorDeps
} from './motherduck'

// HTTP Connector
export { HttpConnector, createHttpConnector } from './http'
export type {
  HttpConnectorOptions,
  HttpConnectorDeps,
  HttpQueryResponse
} from './http'

// REST API Connector
export { RestApiConnector, createRestApiConnector } from './rest'
export type {
  RestApiConnectorOptions,
  RestApiConnectorDeps,
  RestApiEndpoint,
  RestApiResponse,
  AuthMethod,
  HttpMethod
} from './rest'

// Secrets Manager
export {
  secretsManager,
  createSecretsManager,
  type ConnectionSecrets
} from './secrets'

// Connector Manager
export {
  connectorManager,
  createConnectorManager,
  type ConnectionData
} from './manager'

// Compatibility layer (for gradual migration)
export {
  duckDBManagerCompat,
  createLegacyManager,
  type LegacyDuckDBManager
} from './compat'

// =============================================================================
// Auto-register connectors
// =============================================================================
// This ensures connectors are available when the module is imported.
// Registration happens once when the module is first loaded.

import { createWasmConnector } from './wasm'
import { createMotherDuckConnector } from './motherduck'
import { createHttpConnector } from './http'

// Register all built-in connectors
ConnectorRegistry.register('wasm', createWasmConnector, 'DuckDB-WASM (Browser)')
ConnectorRegistry.register('motherduck', createMotherDuckConnector, 'MotherDuck Cloud')
ConnectorRegistry.register('http', createHttpConnector, 'HTTP API')
