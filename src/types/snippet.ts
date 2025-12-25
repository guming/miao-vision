/**
 * SQL Snippets Type Definitions
 *
 * This module defines types for the SQL snippets feature, which helps BI analysts
 * reuse common SQL patterns with parameter substitution.
 *
 * Design Principles:
 * - Immutable data structures
 * - Clear separation of concerns
 * - Easy to test (pure types, no logic)
 * - AI-friendly with comprehensive documentation
 * - Extensible without modifying existing code
 *
 * @module types/snippet
 */

/**
 * Parameter type definitions for snippet templates
 *
 * These types help validate and provide autocomplete for parameter values
 * when users insert snippets.
 */
export type SnippetParameterType =
  | 'string'   // Free-form text (e.g., table names, filter conditions)
  | 'number'   // Numeric values (e.g., limits, thresholds)
  | 'column'   // Column names (could enable autocomplete from schema)
  | 'table'    // Table names (could enable autocomplete from loaded tables)
  | 'date'     // Date values (could show date picker)
  | 'enum'     // Predefined options (e.g., 'asc' | 'desc')

/**
 * Parameter definition for a snippet template
 *
 * Each parameter represents a placeholder in the snippet's SQL template
 * that needs to be filled in by the user.
 *
 * @example
 * ```typescript
 * const param: SnippetParameter = {
 *   name: 'metric',
 *   description: 'The metric column to calculate',
 *   type: 'column',
 *   placeholder: 'revenue',
 *   required: true
 * }
 * // Template: "SELECT SUM(${metric}) FROM sales"
 * // User fills: metric = "revenue"
 * // Result: "SELECT SUM(revenue) FROM sales"
 * ```
 */
export interface SnippetParameter {
  /** Parameter identifier (must match ${name} in template) */
  name: string

  /** Human-readable description shown in UI */
  description: string

  /** Parameter type for validation and UI hints */
  type: SnippetParameterType

  /** Default value if not provided by user */
  defaultValue?: string

  /** Placeholder text shown in input field */
  placeholder?: string

  /** Whether this parameter must be provided */
  required?: boolean

  /** For 'enum' type: list of valid options */
  options?: string[]

  /** Validation regex pattern (optional) */
  pattern?: string

  /** Custom validation error message */
  validationMessage?: string
}

/**
 * Snippet category for organization and filtering
 *
 * Categories help users find relevant snippets quickly.
 * Each category represents a common BI analysis pattern.
 */
export type SnippetCategory =
  | 'time-series'       // WoW, MoM, YoY, Moving Average, Trends
  | 'aggregation'       // SUM, AVG, COUNT with GROUP BY
  | 'window-function'   // ROW_NUMBER, RANK, LAG, LEAD, Running Total
  | 'cohort'            // User retention, Revenue cohort analysis
  | 'statistical'       // Percentiles, Z-score, Correlation, Distribution
  | 'joins'             // Common JOIN patterns and relationships
  | 'date-manipulation' // Date arithmetic, truncation, formatting
  | 'data-quality'      // NULL checks, Duplicate detection, Validation
  | 'formatting'        // CASE statements, String manipulation
  | 'custom'            // User-defined snippets

/**
 * SQL Snippet - A reusable SQL template with parameters
 *
 * Snippets allow BI analysts to quickly insert common SQL patterns
 * by filling in parameters instead of writing SQL from scratch.
 *
 * @example
 * ```typescript
 * const snippet: SQLSnippet = {
 *   id: 'builtin-wow',
 *   name: 'Week over Week Growth',
 *   description: 'Calculate WoW % change',
 *   category: 'time-series',
 *   tags: ['growth', 'wow', 'comparison'],
 *   trigger: 'wow',
 *   template: 'SELECT ... ${metric} ... ${table} ...',
 *   parameters: [
 *     { name: 'metric', type: 'column', required: true },
 *     { name: 'table', type: 'table', required: true }
 *   ],
 *   isBuiltIn: true,
 *   isFavorite: false,
 *   usageCount: 0,
 *   createdAt: new Date(),
 *   lastModified: new Date()
 * }
 * ```
 */
export interface SQLSnippet {
  /** Unique identifier */
  id: string

  /** Display name shown in UI */
  name: string

  /** Detailed description of what this snippet does */
  description: string

  /** Category for organization */
  category: SnippetCategory

  /** Tags for search and filtering */
  tags: string[]

  /**
   * SQL template with parameter placeholders
   *
   * Use ${paramName} syntax for parameters.
   * Example: "SELECT ${column} FROM ${table} WHERE ${condition}"
   */
  template: string

  /**
   * Parameter definitions for this snippet
   *
   * Order matters: parameters are presented to user in this order
   */
  parameters: SnippetParameter[]

  /**
   * Optional trigger word for autocomplete
   *
   * When user types this word followed by Tab, the snippet expands.
   * Example: "wow" → expands to Week-over-Week template
   */
  trigger?: string

  /**
   * Optional author information
   *
   * For custom snippets, tracks who created it
   */
  author?: string

  /** Whether this is a built-in snippet (cannot be deleted) */
  isBuiltIn: boolean

  /** Whether user marked this as favorite */
  isFavorite: boolean

  /** Number of times this snippet has been used */
  usageCount: number

  /** When this snippet was created */
  createdAt: Date

  /** When this snippet was last modified */
  lastModified: Date

  /** When this snippet was last used (optional) */
  lastUsed?: Date
}

/**
 * Collection of snippets for import/export
 *
 * Used when sharing snippets between users or backing up custom snippets.
 */
export interface SnippetCollection {
  /** List of snippets in this collection */
  snippets: SQLSnippet[]

  /** When this collection was last synchronized (optional) */
  lastSynced?: Date

  /** Optional metadata about the collection */
  metadata?: {
    version?: string
    author?: string
    description?: string
    tags?: string[]
  }
}

/**
 * Context for snippet insertion
 *
 * Contains all information needed to insert a snippet into the editor,
 * including resolved parameter values.
 */
export interface SnippetInsertionContext {
  /** The snippet being inserted */
  snippet: SQLSnippet

  /** User-provided values for each parameter */
  parameterValues: Record<string, string>

  /** Current cursor position in the editor */
  cursorPosition: number

  /** Optional: Selected text to replace */
  selectedText?: string
}

/**
 * Snippet validation result
 *
 * Used to validate snippet definitions before saving.
 */
export interface SnippetValidationResult {
  /** Whether the snippet is valid */
  valid: boolean

  /** List of validation errors (empty if valid) */
  errors: SnippetValidationError[]
}

/**
 * Validation error for a snippet
 */
export interface SnippetValidationError {
  /** Field that has the error */
  field: keyof SQLSnippet | string

  /** Error message */
  message: string

  /** Error severity */
  severity: 'error' | 'warning'
}

/**
 * Snippet filter options for searching/filtering
 *
 * Used in the Snippet Manager UI to filter displayed snippets.
 */
export interface SnippetFilterOptions {
  /** Filter by category (undefined = all categories) */
  category?: SnippetCategory

  /** Search query (searches name, description, tags) */
  searchQuery?: string

  /** Filter by tags */
  tags?: string[]

  /** Show only favorites */
  favoritesOnly?: boolean

  /** Show only custom snippets */
  customOnly?: boolean

  /** Show only built-in snippets */
  builtInOnly?: boolean

  /** Sort by field */
  sortBy?: 'name' | 'usageCount' | 'lastUsed' | 'createdAt'

  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
}

/**
 * Snippet statistics for analytics
 *
 * Tracks usage patterns to help improve the snippet library.
 */
export interface SnippetStatistics {
  /** Total number of snippets */
  totalSnippets: number

  /** Number of built-in snippets */
  builtInCount: number

  /** Number of custom snippets */
  customCount: number

  /** Number of favorite snippets */
  favoriteCount: number

  /** Total usage count across all snippets */
  totalUsageCount: number

  /** Most popular snippets (by usage count) */
  mostPopular: Array<{ snippet: SQLSnippet; count: number }>

  /** Recently used snippets */
  recentlyUsed: Array<{ snippet: SQLSnippet; lastUsed: Date }>

  /** Snippets by category distribution */
  categoryDistribution: Record<SnippetCategory, number>
}

/**
 * Type guard to check if a value is a valid SQLSnippet
 *
 * Useful for runtime validation when importing snippets.
 *
 * @param value - Value to check
 * @returns True if value is a valid SQLSnippet
 *
 * @example
 * ```typescript
 * const data = JSON.parse(importedJson)
 * if (isSQLSnippet(data)) {
 *   snippetStore.addSnippet(data)
 * } else {
 *   console.error('Invalid snippet format')
 * }
 * ```
 */
export function isSQLSnippet(value: unknown): value is SQLSnippet {
  if (!value || typeof value !== 'object') return false

  const snippet = value as Partial<SQLSnippet>

  return (
    typeof snippet.id === 'string' &&
    typeof snippet.name === 'string' &&
    typeof snippet.description === 'string' &&
    typeof snippet.category === 'string' &&
    Array.isArray(snippet.tags) &&
    typeof snippet.template === 'string' &&
    Array.isArray(snippet.parameters) &&
    typeof snippet.isBuiltIn === 'boolean' &&
    typeof snippet.isFavorite === 'boolean' &&
    typeof snippet.usageCount === 'number' &&
    snippet.createdAt instanceof Date &&
    snippet.lastModified instanceof Date
  )
}

/**
 * Type guard to check if a value is a valid SnippetParameter
 *
 * @param value - Value to check
 * @returns True if value is a valid SnippetParameter
 */
export function isSnippetParameter(value: unknown): value is SnippetParameter {
  if (!value || typeof value !== 'object') return false

  const param = value as Partial<SnippetParameter>

  return (
    typeof param.name === 'string' &&
    typeof param.description === 'string' &&
    typeof param.type === 'string' &&
    ['string', 'number', 'column', 'table', 'date', 'enum'].includes(param.type)
  )
}

/**
 * Helper function to create a new snippet with defaults
 *
 * Useful for creating custom snippets in the UI.
 *
 * @param partial - Partial snippet data
 * @returns Complete SQLSnippet with defaults filled in
 *
 * @example
 * ```typescript
 * const newSnippet = createSnippet({
 *   name: 'My Custom Query',
 *   template: 'SELECT * FROM ${table}',
 *   parameters: [{ name: 'table', type: 'table', required: true }]
 * })
 * ```
 */
export function createSnippet(
  partial: Omit<SQLSnippet, 'id' | 'createdAt' | 'lastModified' | 'usageCount' | 'isBuiltIn' | 'isFavorite'>
): SQLSnippet {
  return {
    ...partial,
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    isBuiltIn: false,
    isFavorite: false,
    usageCount: 0,
    createdAt: new Date(),
    lastModified: new Date()
  }
}

/**
 * Helper function to substitute parameters in a template
 *
 * Replaces ${paramName} placeholders with actual values.
 *
 * @param template - SQL template with ${} placeholders
 * @param values - Parameter name → value mapping
 * @returns SQL with parameters substituted
 *
 * @example
 * ```typescript
 * const sql = substituteParameters(
 *   'SELECT ${column} FROM ${table}',
 *   { column: 'revenue', table: 'sales' }
 * )
 * // Result: 'SELECT revenue FROM sales'
 * ```
 */
export function substituteParameters(
  template: string,
  values: Record<string, string>
): string {
  let result = template

  // Replace all ${paramName} with values
  for (const [name, value] of Object.entries(values)) {
    const placeholder = `\${${name}}`
    // Use global regex replace instead of replaceAll for compatibility
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    result = result.replace(regex, value)
  }

  return result
}

/**
 * Helper function to extract parameter names from a template
 *
 * Finds all ${paramName} placeholders in the template.
 *
 * @param template - SQL template
 * @returns Array of parameter names
 *
 * @example
 * ```typescript
 * const params = extractParameterNames('SELECT ${a} FROM ${b} WHERE ${c}')
 * // Result: ['a', 'b', 'c']
 * ```
 */
export function extractParameterNames(template: string): string[] {
  const regex = /\$\{(\w+)\}/g
  const names: string[] = []
  let match: RegExpExecArray | null

  // Use exec loop instead of matchAll for compatibility
  while ((match = regex.exec(template)) !== null) {
    names.push(match[1])
  }

  // Return unique names using Array.from instead of spread
  return Array.from(new Set(names))
}

/**
 * Validate a snippet definition
 *
 * Checks for common errors like:
 * - Missing required fields
 * - Invalid parameter references
 * - Circular dependencies
 *
 * @param snippet - Snippet to validate
 * @returns Validation result with errors
 *
 * @example
 * ```typescript
 * const result = validateSnippet(mySnippet)
 * if (!result.valid) {
 *   console.error('Errors:', result.errors)
 * }
 * ```
 */
export function validateSnippet(snippet: SQLSnippet): SnippetValidationResult {
  const errors: SnippetValidationError[] = []

  // Check required fields
  if (!snippet.name?.trim()) {
    errors.push({
      field: 'name',
      message: 'Snippet name is required',
      severity: 'error'
    })
  }

  if (!snippet.template?.trim()) {
    errors.push({
      field: 'template',
      message: 'SQL template is required',
      severity: 'error'
    })
  }

  if (!snippet.description?.trim()) {
    errors.push({
      field: 'description',
      message: 'Description is recommended for clarity',
      severity: 'warning'
    })
  }

  // Extract parameter names from template
  const templateParams = extractParameterNames(snippet.template)

  // Check that all template parameters have definitions
  const definedParams = new Set(snippet.parameters.map(p => p.name))

  for (const paramName of templateParams) {
    if (!definedParams.has(paramName)) {
      errors.push({
        field: 'parameters',
        message: `Template uses parameter '\${${paramName}}' but it's not defined`,
        severity: 'error'
      })
    }
  }

  // Check that all defined parameters are used in template
  for (const param of snippet.parameters) {
    if (!templateParams.includes(param.name)) {
      errors.push({
        field: 'parameters',
        message: `Parameter '${param.name}' is defined but not used in template`,
        severity: 'warning'
      })
    }
  }

  // Check trigger word format (if provided)
  if (snippet.trigger) {
    if (!/^[a-z0-9_-]+$/.test(snippet.trigger)) {
      errors.push({
        field: 'trigger',
        message: 'Trigger should only contain lowercase letters, numbers, hyphens, or underscores',
        severity: 'warning'
      })
    }
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors
  }
}
