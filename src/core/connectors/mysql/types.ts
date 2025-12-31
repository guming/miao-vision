/**
 * MySQL Connector Types
 *
 * Type definitions for MySQL HTTP proxy connector.
 *
 * @module core/connectors/mysql/types
 */

import type { Logger } from '../types'

/**
 * MySQL connection options
 *
 * These options are sent to the HTTP proxy server
 * which then connects to the actual MySQL database.
 */
export interface MySQLConnectorOptions {
  /**
   * HTTP proxy server URL
   * The proxy handles the actual MySQL connection
   * @example 'http://localhost:3001/api/mysql'
   */
  proxyUrl: string

  /**
   * MySQL host
   * @example 'localhost' or 'db.example.com'
   */
  host: string

  /**
   * MySQL port
   * @default 3306
   */
  port?: number

  /**
   * Database name
   * @example 'myapp_production'
   */
  database: string

  /**
   * Database user
   */
  username: string

  /**
   * Database password (stored in secrets)
   */
  password?: string

  /**
   * Use SSL connection
   * @default false
   */
  ssl?: boolean

  /**
   * Connection timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Character set
   * @default 'utf8mb4'
   */
  charset?: string

  /**
   * Timezone
   * @example '+00:00' or 'UTC'
   */
  timezone?: string

  /**
   * Custom headers for proxy requests
   */
  headers?: Record<string, string>
}

/**
 * MySQL connector dependencies
 */
export interface MySQLConnectorDeps {
  /** Logger instance */
  logger?: Logger

  /** Custom fetch implementation (for testing) */
  fetch?: typeof fetch
}

/**
 * MySQL proxy request body
 */
export interface MySQLProxyRequest {
  /** SQL query to execute */
  sql: string

  /** Connection parameters */
  connection: {
    host: string
    port: number
    database: string
    user: string
    password: string
    ssl?: boolean
    charset?: string
    timezone?: string
  }

  /** Query options */
  options?: {
    timeout?: number
    maxRows?: number
  }
}

/**
 * MySQL proxy response
 */
export interface MySQLProxyResponse {
  /** Success status */
  success: boolean

  /** Query result data */
  data?: Record<string, unknown>[]

  /** Column schema */
  columns?: Array<{
    name: string
    type: number
    typeName: string
    length?: number
    flags?: number
  }>

  /** Row count */
  rowCount?: number

  /** Affected rows (for INSERT/UPDATE/DELETE) */
  affectedRows?: number

  /** Execution time in ms */
  executionTime?: number

  /** Error message if failed */
  error?: string

  /** Error details */
  details?: {
    code?: string
    errno?: number
    sqlState?: string
  }
}

/**
 * MySQL field type constants
 */
export const MYSQL_TYPES = {
  DECIMAL: 0,
  TINY: 1,
  SHORT: 2,
  LONG: 3,
  FLOAT: 4,
  DOUBLE: 5,
  NULL: 6,
  TIMESTAMP: 7,
  LONGLONG: 8,
  INT24: 9,
  DATE: 10,
  TIME: 11,
  DATETIME: 12,
  YEAR: 13,
  NEWDATE: 14,
  VARCHAR: 15,
  BIT: 16,
  JSON: 245,
  NEWDECIMAL: 246,
  ENUM: 247,
  SET: 248,
  TINY_BLOB: 249,
  MEDIUM_BLOB: 250,
  LONG_BLOB: 251,
  BLOB: 252,
  VAR_STRING: 253,
  STRING: 254,
  GEOMETRY: 255
} as const

/**
 * MySQL type ID to DuckDB type mapping
 */
export const MYSQL_TYPE_MAP: Record<number, string> = {
  [MYSQL_TYPES.DECIMAL]: 'DECIMAL',
  [MYSQL_TYPES.TINY]: 'TINYINT',
  [MYSQL_TYPES.SHORT]: 'SMALLINT',
  [MYSQL_TYPES.LONG]: 'INTEGER',
  [MYSQL_TYPES.FLOAT]: 'REAL',
  [MYSQL_TYPES.DOUBLE]: 'DOUBLE',
  [MYSQL_TYPES.NULL]: 'VARCHAR',
  [MYSQL_TYPES.TIMESTAMP]: 'TIMESTAMP',
  [MYSQL_TYPES.LONGLONG]: 'BIGINT',
  [MYSQL_TYPES.INT24]: 'INTEGER',
  [MYSQL_TYPES.DATE]: 'DATE',
  [MYSQL_TYPES.TIME]: 'TIME',
  [MYSQL_TYPES.DATETIME]: 'TIMESTAMP',
  [MYSQL_TYPES.YEAR]: 'INTEGER',
  [MYSQL_TYPES.NEWDATE]: 'DATE',
  [MYSQL_TYPES.VARCHAR]: 'VARCHAR',
  [MYSQL_TYPES.BIT]: 'BOOLEAN',
  [MYSQL_TYPES.JSON]: 'JSON',
  [MYSQL_TYPES.NEWDECIMAL]: 'DECIMAL',
  [MYSQL_TYPES.ENUM]: 'VARCHAR',
  [MYSQL_TYPES.SET]: 'VARCHAR',
  [MYSQL_TYPES.TINY_BLOB]: 'BLOB',
  [MYSQL_TYPES.MEDIUM_BLOB]: 'BLOB',
  [MYSQL_TYPES.LONG_BLOB]: 'BLOB',
  [MYSQL_TYPES.BLOB]: 'BLOB',
  [MYSQL_TYPES.VAR_STRING]: 'VARCHAR',
  [MYSQL_TYPES.STRING]: 'VARCHAR',
  [MYSQL_TYPES.GEOMETRY]: 'BLOB'
}

/**
 * Map MySQL type ID to DuckDB type name
 */
export function mysqlTypeToString(typeId: number): string {
  return MYSQL_TYPE_MAP[typeId] || 'VARCHAR'
}
