/**
 * MySQL Connector Module
 *
 * HTTP proxy-based connector for MySQL databases.
 *
 * @module core/connectors/mysql
 */

export { MySQLConnector, createMySQLConnector } from './connector'
export type {
  MySQLConnectorOptions,
  MySQLConnectorDeps,
  MySQLProxyRequest,
  MySQLProxyResponse
} from './types'
export { mysqlTypeToString, MYSQL_TYPE_MAP, MYSQL_TYPES } from './types'
