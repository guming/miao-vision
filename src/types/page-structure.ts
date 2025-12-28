/**
 * Page Structure Types
 *
 * Type definitions for page tree structure used in multi-page reports.
 */

/**
 * Page node in the navigation tree
 */
export interface PageNode {
  /** Unique identifier */
  id: string

  /** Display name */
  name: string

  /** URL path */
  path: string

  /** Page title */
  title: string

  /** Icon name or emoji */
  icon?: string

  /** Sort order (lower = first) */
  order: number

  /** Child pages */
  children: PageNode[]

  /** Whether this is a template page (dynamic route) */
  isTemplate: boolean

  /** Template parameter name (for dynamic routes like [id]) */
  templateParam?: string

  /** Metadata */
  metadata?: {
    /** Whether to hide from navigation */
    hidden?: boolean

    /** Group name for organizing pages */
    group?: string

    /** Custom data */
    [key: string]: any
  }
}

/**
 * Page tree structure
 */
export interface PageTree {
  /** Root level pages */
  root: PageNode[]
}

/**
 * Report page definition (input to tree builder)
 */
export interface ReportPage {
  /** URL path */
  path: string

  /** Page title */
  title?: string

  /** Icon */
  icon?: string

  /** Sort order */
  order?: number

  /** Hidden from navigation */
  hidden?: boolean

  /** Group name */
  group?: string

  /** Component to render */
  component?: any

  /** Lazy load function */
  load?: () => Promise<any>

  /** Additional metadata */
  [key: string]: any
}
