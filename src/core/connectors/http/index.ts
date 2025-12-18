/**
 * HTTP Connector Module
 *
 * Generic HTTP-based connector for remote DuckDB instances.
 *
 * @module core/connectors/http
 */

export { HttpConnector, createHttpConnector } from './connector'
export type {
  HttpConnectorOptions,
  HttpConnectorDeps,
  HttpQueryResponse
} from './types'
