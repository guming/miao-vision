/**
 * REST API Connector
 *
 * @module core/connectors/rest
 */

export { RestApiConnector, createRestApiConnector } from './connector'
export type {
  RestApiConnectorOptions,
  RestApiConnectorDeps,
  RestApiEndpoint,
  RestApiResponse,
  AuthMethod,
  HttpMethod
} from './types'
