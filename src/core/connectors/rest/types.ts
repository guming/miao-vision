/**
 * REST API Connector Types
 *
 * @module core/connectors/rest/types
 */

import type { Logger } from '../types'

/**
 * Authentication method
 */
export type AuthMethod = 'none' | 'bearer' | 'apiKey' | 'basic'

/**
 * HTTP method
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * REST API connector options
 */
export interface RestApiConnectorOptions {
  /** Base URL of the API */
  baseUrl: string

  /** Authentication method */
  authMethod?: AuthMethod

  /** Authentication token (for Bearer or API Key auth) */
  token?: string

  /** API key header name (for API Key auth, default: 'X-API-Key') */
  apiKeyHeader?: string

  /** Basic auth username */
  username?: string

  /** Basic auth password */
  password?: string

  /** Custom headers to include in all requests */
  headers?: Record<string, string>

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number

  /** Path to JSON data in response (dot notation, e.g., 'data.items') */
  dataPath?: string

  /** Enable pagination */
  pagination?: {
    /** Pagination type */
    type: 'offset' | 'page' | 'cursor'
    /** Page size */
    pageSize: number
    /** Offset parameter name (default: 'offset') */
    offsetParam?: string
    /** Limit parameter name (default: 'limit') */
    limitParam?: string
    /** Page parameter name (default: 'page') */
    pageParam?: string
    /** Cursor parameter name (default: 'cursor') */
    cursorParam?: string
    /** Path to next cursor in response (dot notation) */
    nextCursorPath?: string
    /** Maximum pages to fetch (default: 10) */
    maxPages?: number
  }

  /** Rate limiting */
  rateLimit?: {
    /** Max requests per window */
    maxRequests: number
    /** Window duration in milliseconds */
    windowMs: number
  }
}

/**
 * REST API endpoint configuration
 */
export interface RestApiEndpoint {
  /** Endpoint path (appended to baseUrl) */
  path: string

  /** HTTP method (default: GET) */
  method?: HttpMethod

  /** Query parameters */
  params?: Record<string, string | number | boolean>

  /** Request body (for POST/PUT/PATCH) */
  body?: object

  /** Table name to load data into */
  tableName: string

  /** Override default options for this endpoint */
  options?: Partial<RestApiConnectorOptions>
}

/**
 * REST API response
 */
export interface RestApiResponse {
  /** Response status code */
  status: number

  /** Response data (parsed JSON) */
  data: unknown

  /** Response headers */
  headers: Headers
}

/**
 * REST API connector dependencies
 */
export interface RestApiConnectorDeps {
  /** Logger instance */
  logger?: Logger

  /** Custom fetch implementation */
  fetch?: typeof fetch

  /** DuckDB WASM connector instance (for data loading) */
  wasmConnector?: any
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  /** Request timestamps in current window */
  requests: number[]

  /** Window start time */
  windowStart: number
}
