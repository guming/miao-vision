/**
 * PostgreSQL Connector Types
 *
 * Type definitions for PostgreSQL HTTP proxy connector.
 *
 * @module core/connectors/postgresql/types
 */

import type { Logger } from '../types'

/**
 * PostgreSQL connection options
 *
 * These options are sent to the HTTP proxy server
 * which then connects to the actual PostgreSQL database.
 */
export interface PostgreSQLConnectorOptions {
  /**
   * HTTP proxy server URL
   * The proxy handles the actual PostgreSQL connection
   * @example 'http://localhost:3001/api/postgres'
   */
  proxyUrl: string

  /**
   * PostgreSQL host
   * @example 'localhost' or 'db.example.com'
   */
  host: string

  /**
   * PostgreSQL port
   * @default 5432
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
   * SSL mode: 'disable', 'require', 'verify-ca', 'verify-full'
   * @default 'prefer'
   */
  sslMode?: 'disable' | 'require' | 'prefer' | 'verify-ca' | 'verify-full'

  /**
   * Connection timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Schema to use (PostgreSQL schemas)
   * @default 'public'
   */
  schema?: string

  /**
   * Custom headers for proxy requests
   */
  headers?: Record<string, string>
}

/**
 * PostgreSQL connector dependencies
 */
export interface PostgreSQLConnectorDeps {
  /** Logger instance */
  logger?: Logger

  /** Custom fetch implementation (for testing) */
  fetch?: typeof fetch
}

/**
 * PostgreSQL proxy request body
 */
export interface PostgreSQLProxyRequest {
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
    sslMode?: string
  }

  /** Query options */
  options?: {
    timeout?: number
    maxRows?: number
  }
}

/**
 * PostgreSQL proxy response
 */
export interface PostgreSQLProxyResponse {
  /** Success status */
  success: boolean

  /** Query result data */
  data?: Record<string, unknown>[]

  /** Column schema */
  columns?: Array<{
    name: string
    dataTypeID: number
    dataType: string
    nullable?: boolean
  }>

  /** Row count */
  rowCount?: number

  /** Execution time in ms */
  executionTime?: number

  /** Error message if failed */
  error?: string

  /** Error details */
  details?: {
    code?: string
    position?: number
    hint?: string
  }
}

/**
 * PostgreSQL data type mapping to DuckDB types
 */
export const PG_TYPE_MAP: Record<number, string> = {
  16: 'BOOLEAN',      // bool
  20: 'BIGINT',       // int8
  21: 'SMALLINT',     // int2
  23: 'INTEGER',      // int4
  25: 'VARCHAR',      // text
  700: 'REAL',        // float4
  701: 'DOUBLE',      // float8
  1043: 'VARCHAR',    // varchar
  1082: 'DATE',       // date
  1083: 'TIME',       // time
  1114: 'TIMESTAMP',  // timestamp
  1184: 'TIMESTAMPTZ', // timestamptz
  1700: 'DECIMAL',    // numeric
  2950: 'UUID',       // uuid
  3802: 'JSON',       // jsonb
  114: 'JSON',        // json
  1000: 'BOOLEAN[]',  // bool[]
  1005: 'INTEGER[]',  // int2[]
  1007: 'INTEGER[]',  // int4[]
  1009: 'VARCHAR[]',  // text[]
  1016: 'BIGINT[]',   // int8[]
}

/**
 * Map PostgreSQL OID to DuckDB type name
 */
export function pgTypeToString(oid: number): string {
  return PG_TYPE_MAP[oid] || 'VARCHAR'
}
