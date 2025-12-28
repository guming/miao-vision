/**
 * Route Matcher
 *
 * Lightweight route matching system with support for:
 * - Static routes: /users/list
 * - Dynamic parameters: /users/:id
 * - Wildcard: /files/*
 */

/**
 * Route parameters extracted from URL
 */
export interface RouteParams {
  [key: string]: string
}

/**
 * Route match result
 */
export interface RouteMatch {
  pattern: string
  params: RouteParams
  path: string
}

/**
 * Route definition
 */
export interface Route {
  pattern: string
  component?: any
  load?: () => Promise<any>
}

/**
 * Route Matcher
 *
 * Matches URL paths against route patterns and extracts parameters.
 */
export class RouteMatcher {
  private routes: Route[] = []

  /**
   * Register a route
   */
  register(route: Route): void {
    this.routes.push(route)
  }

  /**
   * Match a path against registered routes
   *
   * @example
   * matcher.match('/users/123')
   * // → { pattern: '/users/:id', params: { id: '123' }, path: '/users/123' }
   */
  match(path: string): RouteMatch | null {
    for (const route of this.routes) {
      const params = this.matchPattern(route.pattern, path)
      if (params !== null) {
        return {
          pattern: route.pattern,
          params,
          path
        }
      }
    }
    return null
  }

  /**
   * Match a single pattern against a path
   *
   * @example
   * matchPattern('/users/:id', '/users/123')
   * // → { id: '123' }
   *
   * matchPattern('/posts/:category/:slug', '/posts/tech/hello-world')
   * // → { category: 'tech', slug: 'hello-world' }
   *
   * matchPattern('/files/*', '/files/docs/readme.md')
   * // → { '*': 'docs/readme.md' }
   */
  private matchPattern(pattern: string, path: string): RouteParams | null {
    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = path.split('/').filter(Boolean)

    // Different length and no wildcard - no match
    if (patternParts.length !== pathParts.length) {
      // Check if pattern has wildcard
      const hasWildcard = patternParts.some(part => part === '*')
      if (!hasWildcard) {
        return null
      }
    }

    const params: RouteParams = {}

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i]
      const pathPart = pathParts[i]

      // Wildcard - match rest of path
      if (patternPart === '*') {
        params['*'] = pathParts.slice(i).join('/')
        break
      }

      // Dynamic parameter
      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1)
        params[paramName] = decodeURIComponent(pathPart)
      }
      // Static segment - must match exactly
      else if (patternPart !== pathPart) {
        return null
      }
    }

    return params
  }

  /**
   * Build a path from a pattern and parameters
   *
   * @example
   * buildPath('/users/:id', { id: '123' })
   * // → '/users/123'
   *
   * buildPath('/posts/:category/:slug', { category: 'tech', slug: 'hello' })
   * // → '/posts/tech/hello'
   */
  buildPath(pattern: string, params: RouteParams): string {
    let path = pattern

    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(value))
    }

    return path
  }

  /**
   * Get all registered routes
   */
  getRoutes(): Route[] {
    return this.routes
  }

  /**
   * Clear all routes
   */
  clear(): void {
    this.routes = []
  }
}
