/**
 * Contracts - Type Definitions and Validation
 *
 * This module defines the contracts (interfaces, types, and validation rules)
 * for the entire application. All contracts are:
 * - Self-documenting with JSDoc
 * - Pure (no side effects)
 * - Easy to test
 * - AI/LLM friendly
 *
 * @module pure/contracts
 *
 * ## Variable Reference Patterns
 *
 * The application uses template variable syntax `${...}` for dynamic content.
 * There are 5 types of variable references:
 *
 * | Pattern | Example | Description |
 * |---------|---------|-------------|
 * | `${inputs.name}` | `${inputs.region}` | User input values from UI controls |
 * | `${metadata.prop}` | `${metadata.title}` | Report metadata properties |
 * | `${block_name}` | `${sales_data}` | Reference to another SQL block's result table |
 * | `${query.column}` | `${query.revenue}` | Column value from query result (conditionals) |
 * | `${query.column[i]}` | `${query.revenue[0]}` | Indexed column value (conditionals) |
 *
 * ## Usage Examples
 *
 * @example SQL with input variables
 * ```sql
 * SELECT * FROM sales
 * WHERE region = ${inputs.region}
 *   AND year >= ${inputs.start_year}
 * ```
 *
 * @example SQL with block references
 * ```sql
 * SELECT a.*, b.name
 * FROM ${base_query} a
 * JOIN ${customers} b ON a.cid = b.id
 * ```
 *
 * @example Conditional blocks
 * ```markdown
 * {#if ${query.total} > 1000}
 * ## High Revenue Alert
 * Revenue exceeds threshold!
 * {/if}
 * ```
 */

// ============================================================================
// Core Value Types
// ============================================================================

/**
 * Primitive value types that can be stored in inputs
 */
export type PrimitiveValue = string | number | boolean | null | undefined

/**
 * Date value (serializable)
 */
export type DateValue = Date | string

/**
 * Array of primitive values (for multi-select inputs)
 */
export type ArrayValue = PrimitiveValue[]

/**
 * All supported input value types
 *
 * @contract
 * - string: Text values, quoted in SQL as 'value'
 * - number: Numeric values, unquoted in SQL
 * - boolean: true/false, unquoted in SQL
 * - Date: Converted to ISO string, quoted in SQL
 * - Array: Converted to SQL tuple (v1, v2, v3)
 * - null/undefined: Converted to NULL in SQL
 */
export type InputValue = PrimitiveValue | DateValue | ArrayValue

// ============================================================================
// Input State Contract
// ============================================================================

/**
 * Input state record
 *
 * @contract
 * - Keys are input names (alphanumeric + underscore)
 * - Values are InputValue type
 * - Used as `${inputs.key}` in templates
 *
 * @example
 * ```typescript
 * const inputs: InputState = {
 *   region: 'West',
 *   year: 2024,
 *   categories: ['Electronics', 'Clothing']
 * }
 * ```
 */
export type InputState = Record<string, InputValue>

/**
 * Metadata state record
 *
 * @contract
 * - Keys are metadata property names
 * - Values can be any type (typically strings)
 * - Used as `${metadata.key}` in templates
 *
 * @example
 * ```typescript
 * const metadata: MetadataState = {
 *   title: 'Sales Report',
 *   author: 'Analytics Team',
 *   generated: new Date().toISOString()
 * }
 * ```
 */
export type MetadataState = Record<string, unknown>

// ============================================================================
// Variable Reference Contracts
// ============================================================================

/**
 * Variable reference types
 *
 * @contract
 * - input: References user input values `${inputs.xxx}`
 * - metadata: References report metadata `${metadata.xxx}`
 * - block: References another block's result table `${block_name}`
 * - query: References query result column `${query.column}` (conditionals only)
 */
export type VariableType = 'input' | 'metadata' | 'block' | 'query'

/**
 * Parsed variable reference
 *
 * @contract
 * - type: The variable type (input, metadata, block, query)
 * - name: The variable/property name
 * - index: Optional array index (for query variables)
 * - raw: The original raw string match
 */
export interface VariableReference {
  type: VariableType
  name: string
  index?: number
  raw: string
}

/**
 * Variable reference patterns (regex)
 *
 * @contract
 * - All patterns use the ${...} syntax
 * - Patterns are designed for global matching (use with /g flag)
 * - Capture groups extract the variable name
 */
export const VARIABLE_PATTERNS = {
  /**
   * Input variable: ${inputs.name}
   * Capture group 1: variable name
   */
  INPUT: /\$\{inputs\.(\w+)\}/g,

  /**
   * Metadata variable: ${metadata.name}
   * Capture group 1: property name
   */
  METADATA: /\$\{metadata\.(\w+)\}/g,

  /**
   * Block reference: ${block_name}
   * Capture group 1: block name
   * Note: Must not contain dots (filters out inputs.x, metadata.x)
   */
  BLOCK: /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,

  /**
   * Query column: ${query.column}
   * Capture group 1: column name
   */
  QUERY: /\$\{query\.(\w+)\}/g,

  /**
   * Query column indexed: ${query.column[index]}
   * Capture group 1: column name
   * Capture group 2: index
   */
  QUERY_INDEXED: /\$\{query\.(\w+)\[(\d+)\]\}/g,

  /**
   * Any template variable: ${...}
   * Used for detection only
   */
  ANY: /\$\{[^}]+\}/g
} as const

// ============================================================================
// Block Contracts
// ============================================================================

/**
 * Block type enum
 *
 * @contract
 * - sql: SQL query block
 * - chart: Visualization block
 * - input: User input control
 * - markdown: Static content
 */
export type BlockType = 'sql' | 'chart' | 'input' | 'markdown' | 'text'

/**
 * Block identifier format
 *
 * @contract
 * - Format: `block_${number}` (auto-generated) or custom name
 * - Must be unique within a report
 * - Used for block references in SQL
 */
export type BlockId = string

/**
 * Block name format
 *
 * @contract
 * - Optional human-readable name
 * - If provided, can be used as ${name} in SQL
 * - Must match pattern: [a-zA-Z_][a-zA-Z0-9_]*
 */
export type BlockName = string

/**
 * Minimal block interface for dependency analysis
 *
 * @contract
 * - id: Unique identifier (required)
 * - type: Block type (required)
 * - content: Raw content string (required)
 * - dependencies: Tracked dependencies (optional, computed if missing)
 */
export interface Block {
  id: BlockId
  type: BlockType
  content: string
  dependencies?: BlockDependencies
}

/**
 * Block dependencies
 *
 * @contract
 * - inputs: Input variable names this block depends on
 * - blocks: Block names/ids this block references
 */
export interface BlockDependencies {
  inputs: string[]
  blocks: string[]
}

// ============================================================================
// SQL Template Context Contract
// ============================================================================

/**
 * Template context for SQL interpolation
 *
 * @contract
 * - inputs: Current input state
 * - metadata: Report metadata
 * - Both are required but can be empty objects
 *
 * @example
 * ```typescript
 * const context: TemplateContext = {
 *   inputs: { region: 'West', year: 2024 },
 *   metadata: { title: 'Sales Report' }
 * }
 *
 * const sql = "SELECT * FROM sales WHERE region = ${inputs.region}"
 * const result = interpolateSQL(sql, context)
 * // => "SELECT * FROM sales WHERE region = 'West'"
 * ```
 */
export interface TemplateContext {
  inputs: InputState
  metadata: MetadataState
}

// ============================================================================
// Interpolation Result Contract
// ============================================================================

/**
 * Result of template interpolation
 *
 * @contract
 * - output: The interpolated string
 * - replacedVariables: Variables that were successfully replaced
 * - missingVariables: Variables that had no value (replaced with NULL)
 */
export interface InterpolationResult {
  output: string
  replacedVariables: string[]
  missingVariables: string[]
}

// ============================================================================
// Dependency Analysis Contracts
// ============================================================================

/**
 * Dependency graph node
 *
 * @contract
 * - blockId: The block's unique identifier
 * - blockName: Optional human-readable name
 * - dependencies: Set of block IDs this block depends on
 * - dependents: Set of block IDs that depend on this block
 */
export interface DependencyNode {
  blockId: BlockId
  blockName?: BlockName
  dependencies: Set<BlockId>
  dependents: Set<BlockId>
}

/**
 * Dependency analysis result
 *
 * @contract
 * - executionOrder: Block IDs in topological order (dependencies first)
 * - dependencies: Map of blockId -> dependency block IDs
 * - circularDependencies: Detected cycles, or null if none
 * - missingDependencies: Blocks referencing non-existent blocks
 */
export interface DependencyAnalysisResult {
  executionOrder: BlockId[]
  dependencies: Map<BlockId, BlockId[]>
  circularDependencies: BlockId[][] | null
  missingDependencies: Array<{ blockId: BlockId; missing: BlockId[] }>
}

// ============================================================================
// Validation Contracts
// ============================================================================

/**
 * Validation result
 *
 * @contract
 * - valid: Whether validation passed
 * - errors: List of error messages (empty if valid)
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Variable name validation rules
 *
 * @contract
 * - Must start with letter or underscore
 * - Can contain letters, numbers, underscores
 * - Cannot be empty
 * - Cannot be a reserved word
 */
export const VARIABLE_NAME_RULES = {
  pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  minLength: 1,
  maxLength: 64,
  reserved: ['inputs', 'metadata', 'query', 'null', 'true', 'false']
} as const

// ============================================================================
// Pure Validation Functions
// ============================================================================

/**
 * Validate a variable name
 *
 * @pure No side effects
 */
export function validateVariableName(name: string): ValidationResult {
  const errors: string[] = []

  if (!name || name.length === 0) {
    errors.push('Variable name cannot be empty')
  } else if (name.length > VARIABLE_NAME_RULES.maxLength) {
    errors.push(`Variable name too long (max ${VARIABLE_NAME_RULES.maxLength})`)
  } else if (!VARIABLE_NAME_RULES.pattern.test(name)) {
    errors.push('Variable name must start with letter/underscore and contain only alphanumeric/underscore')
  } else if ((VARIABLE_NAME_RULES.reserved as readonly string[]).includes(name.toLowerCase())) {
    errors.push(`"${name}" is a reserved word`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate block dependencies
 *
 * @pure No side effects
 */
export function validateBlockDependencies(
  block: Block,
  availableBlocks: ReadonlySet<BlockId>
): ValidationResult {
  const errors: string[] = []

  if (block.dependencies?.blocks) {
    for (const dep of block.dependencies.blocks) {
      if (!availableBlocks.has(dep)) {
        errors.push(`Block "${block.id}" references unknown block "${dep}"`)
      }
      if (dep === block.id) {
        errors.push(`Block "${block.id}" cannot reference itself`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate template context completeness
 *
 * @pure No side effects
 */
export function validateTemplateContext(
  template: string,
  context: TemplateContext
): ValidationResult {
  const errors: string[] = []

  // Check input variables
  const inputPattern = new RegExp(VARIABLE_PATTERNS.INPUT.source, 'g')
  let match
  while ((match = inputPattern.exec(template)) !== null) {
    const varName = match[1]
    if (context.inputs[varName] === undefined) {
      errors.push(`Missing input variable: ${varName}`)
    }
  }

  // Check metadata variables
  const metadataPattern = new RegExp(VARIABLE_PATTERNS.METADATA.source, 'g')
  while ((match = metadataPattern.exec(template)) !== null) {
    const propName = match[1]
    if (context.metadata[propName] === undefined) {
      errors.push(`Missing metadata property: ${propName}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid InputValue
 *
 * @pure No side effects
 */
export function isInputValue(value: unknown): value is InputValue {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return true
  if (typeof value === 'number') return true
  if (typeof value === 'boolean') return true
  if (value instanceof Date) return true
  if (Array.isArray(value)) {
    return value.every(v =>
      v === null ||
      v === undefined ||
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    )
  }
  return false
}

/**
 * Check if string contains template variables
 *
 * @pure No side effects
 */
export function hasTemplateVariables(str: string): boolean {
  // Use a fresh regex to avoid stateful /g flag issues
  return /\$\{[^}]+\}/.test(str)
}

/**
 * Check if string contains input variables specifically
 *
 * @pure No side effects
 */
export function hasInputVariables(str: string): boolean {
  return new RegExp(VARIABLE_PATTERNS.INPUT.source).test(str)
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract all variable references from a string
 *
 * @pure No side effects
 *
 * @example
 * ```typescript
 * const refs = extractAllVariables(
 *   "SELECT * FROM ${sales} WHERE region = ${inputs.region}"
 * )
 * // [
 * //   { type: 'block', name: 'sales', raw: '${sales}' },
 * //   { type: 'input', name: 'region', raw: '${inputs.region}' }
 * // ]
 * ```
 */
export function extractAllVariables(str: string): VariableReference[] {
  const refs: VariableReference[] = []
  const seen = new Set<string>()

  // Extract input variables
  const inputRegex = new RegExp(VARIABLE_PATTERNS.INPUT.source, 'g')
  let match
  while ((match = inputRegex.exec(str)) !== null) {
    if (!seen.has(match[0])) {
      seen.add(match[0])
      refs.push({
        type: 'input',
        name: match[1],
        raw: match[0]
      })
    }
  }

  // Extract metadata variables
  const metadataRegex = new RegExp(VARIABLE_PATTERNS.METADATA.source, 'g')
  while ((match = metadataRegex.exec(str)) !== null) {
    if (!seen.has(match[0])) {
      seen.add(match[0])
      refs.push({
        type: 'metadata',
        name: match[1],
        raw: match[0]
      })
    }
  }

  // Extract query variables (indexed first to avoid partial matches)
  const queryIndexedRegex = new RegExp(VARIABLE_PATTERNS.QUERY_INDEXED.source, 'g')
  while ((match = queryIndexedRegex.exec(str)) !== null) {
    if (!seen.has(match[0])) {
      seen.add(match[0])
      refs.push({
        type: 'query',
        name: match[1],
        index: parseInt(match[2], 10),
        raw: match[0]
      })
    }
  }

  const queryRegex = new RegExp(VARIABLE_PATTERNS.QUERY.source, 'g')
  while ((match = queryRegex.exec(str)) !== null) {
    if (!seen.has(match[0])) {
      seen.add(match[0])
      refs.push({
        type: 'query',
        name: match[1],
        raw: match[0]
      })
    }
  }

  // Extract block references (must not be qualified)
  const blockRegex = new RegExp(VARIABLE_PATTERNS.BLOCK.source, 'g')
  while ((match = blockRegex.exec(str)) !== null) {
    const name = match[1]
    // Skip if already captured as qualified reference
    if (!seen.has(match[0]) && !name.includes('.')) {
      // Skip if this looks like part of a qualified ref
      const prefix = str.substring(0, match.index)
      if (!prefix.endsWith('inputs.') && !prefix.endsWith('metadata.') && !prefix.endsWith('query.')) {
        seen.add(match[0])
        refs.push({
          type: 'block',
          name,
          raw: match[0]
        })
      }
    }
  }

  return refs
}
