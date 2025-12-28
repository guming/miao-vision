/**
 * Router State Management
 *
 * Svelte 5 Runes-based router state with browser History API integration.
 */

import { RouteMatcher, type RouteMatch, type RouteParams, type Route } from './matcher'

/**
 * Router State
 *
 * Manages current route, navigation, and browser history integration.
 */
class RouterState {
  // Current path
  currentPath = $state<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  )

  // Current route match
  currentMatch = $state<RouteMatch | null>(null)

  // Route parameters (derived from currentMatch)
  params = $derived<RouteParams>(this.currentMatch?.params ?? {})

  // Query parameters
  query = $state<URLSearchParams>(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  )

  // Hash
  hash = $state<string>(
    typeof window !== 'undefined' ? window.location.hash : ''
  )

  // Navigation state
  isNavigating = $state(false)

  // Navigation history
  history = $state<string[]>([])

  // Route matcher
  private matcher = new RouteMatcher()

  constructor() {
    // Setup browser event listeners (only in browser)
    if (typeof window !== 'undefined') {
      this.setupPopStateListener()
      this.updateMatch()
      this.history.push(this.currentPath)
    }
  }

  /**
   * Setup popstate listener for browser back/forward buttons
   */
  private setupPopStateListener(): void {
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname
      this.query = new URLSearchParams(window.location.search)
      this.hash = window.location.hash
      this.updateMatch()
    })
  }

  /**
   * Register a route
   */
  register(pattern: string, component?: any, load?: () => Promise<any>): void {
    this.matcher.register({ pattern, component, load })
  }

  /**
   * Navigate to a path
   *
   * @example
   * router.navigate('/users/123')
   * router.navigate('/posts', { replace: true })
   */
  navigate(path: string, options?: { replace?: boolean; state?: any }): void {
    if (path === this.currentPath) return

    this.isNavigating = true

    // Update browser history
    if (options?.replace) {
      window.history.replaceState(options?.state ?? null, '', path)
    } else {
      window.history.pushState(options?.state ?? null, '', path)
    }

    // Update state
    this.currentPath = path
    this.query = new URLSearchParams(window.location.search)
    this.hash = window.location.hash

    // Add to history
    if (!options?.replace) {
      this.history.push(path)
    }

    this.updateMatch()
    this.isNavigating = false
  }

  /**
   * Go back in history
   */
  back(): void {
    window.history.back()
  }

  /**
   * Go forward in history
   */
  forward(): void {
    window.history.forward()
  }

  /**
   * Update current route match
   */
  private updateMatch(): void {
    this.currentMatch = this.matcher.match(this.currentPath)
  }

  /**
   * Build a path from pattern and params
   */
  buildPath(pattern: string, params: RouteParams): string {
    return this.matcher.buildPath(pattern, params)
  }

  /**
   * Get all registered routes
   */
  getRoutes(): Route[] {
    return this.matcher.getRoutes()
  }
}

/**
 * Global router instance
 */
export const router = new RouterState()
