/**
 * PostgreSQL Connector Module
 *
 * HTTP proxy-based connector for PostgreSQL databases.
 *
 * @module core/connectors/postgresql
 */

export { PostgreSQLConnector, createPostgreSQLConnector } from './connector'
export type {
  PostgreSQLConnectorOptions,
  PostgreSQLConnectorDeps,
  PostgreSQLProxyRequest,
  PostgreSQLProxyResponse
} from './types'
export { pgTypeToString, PG_TYPE_MAP } from './types'
