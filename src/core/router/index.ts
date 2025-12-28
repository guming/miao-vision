/**
 * Router Module
 *
 * Lightweight, zero-dependency routing system for Svelte 5.
 */

export { RouteMatcher } from './matcher'
export { router } from './state.svelte'
export { default as Router } from './Router.svelte'
export { default as Link } from './Link.svelte'

export type { RouteParams, RouteMatch, Route } from './matcher'
