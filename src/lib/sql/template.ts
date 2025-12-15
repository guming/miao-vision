/**
 * SQL Template Variable Substitution
 *
 * Replaces template variables like ${inputs.region} or ${metadata.title}
 * in SQL queries with actual values
 *
 * IMPORTANT: When SQL queries are re-executed with different input values,
 * the Mosaic coordinator's query cache must be cleared to prevent stale results.
 * See App.svelte reactive execution logic for cache clearing implementation.
 */

import type { InputState } from '@/lib/stores/report-inputs'

/**
 * Template context for SQL interpolation
 */
export interface SQLTemplateContext {
  inputs: InputState
  metadata: Record<string, any>
}

/**
 * Replace template variables in SQL
 *
 * Supports:
 * - ${inputs.variable_name} - Input values
 * - ${metadata.property} - Report metadata
 *
 * Example:
 * ```sql
 * SELECT * FROM sales
 * WHERE region = '${inputs.selected_region}'
 *   AND date >= '${inputs.start_date}'
 * ```
 */
export function interpolateSQL(sql: string, context: SQLTemplateContext): string {
  let interpolated = sql

  // Replace ${inputs.variable}
  const inputRegex = /\$\{inputs\.(\w+)\}/g
  interpolated = interpolated.replace(inputRegex, (match, varName) => {
    const value = context.inputs[varName]

    if (value === null || value === undefined) {
      console.warn(`SQL template variable "${varName}" is not defined in inputs. Replacing with NULL.`)
      return 'NULL'
    }

    // Handle different value types
    if (typeof value === 'string') {
      // Escape single quotes in strings
      return `'${value.replace(/'/g, "''")}'`
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    } else if (value instanceof Date) {
      return `'${value.toISOString()}'`
    } else if (Array.isArray(value)) {
      // For arrays, create a comma-separated list
      const escaped = value.map(v =>
        typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v)
      )
      return `(${escaped.join(', ')})`
    } else {
      console.warn(`Unsupported value type for "${varName}":`, typeof value)
      return 'NULL'
    }
  })

  // Replace ${metadata.property}
  const metadataRegex = /\$\{metadata\.(\w+)\}/g
  interpolated = interpolated.replace(metadataRegex, (match, propName) => {
    const value = context.metadata[propName]

    if (value === null || value === undefined) {
      console.warn(`SQL template variable "metadata.${propName}" is not defined. Replacing with NULL.`)
      return 'NULL'
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`
    } else {
      return String(value)
    }
  })

  // Log if interpolation occurred
  if (interpolated !== sql) {
    console.log('SQL Interpolation:')
    console.log('  Original (first 100):', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''))
    console.log('  Interpolated (first 100):', interpolated.substring(0, 100) + (interpolated.length > 100 ? '...' : ''))

    // Also log the WHERE clause part if it exists
    const whereIndex = interpolated.toUpperCase().indexOf('WHERE')
    if (whereIndex !== -1) {
      const whereClause = interpolated.substring(whereIndex, Math.min(whereIndex + 200, interpolated.length))
      console.log('  WHERE clause:', whereClause)
    }

    // Log full interpolated SQL for debugging
    console.log('  Full interpolated SQL:', interpolated)
  }

  return interpolated
}

/**
 * Check if SQL contains template variables
 */
export function hasTemplateVariables(sql: string): boolean {
  return /\$\{(inputs|metadata)\.\w+\}/.test(sql)
}

/**
 * Extract all template variable names from SQL
 *
 * Returns an object with input variables and metadata variables
 */
export function extractTemplateVariables(sql: string): {
  inputs: string[]
  metadata: string[]
} {
  const inputs: string[] = []
  const metadata: string[] = []

  // Extract input variables
  const inputRegex = /\$\{inputs\.(\w+)\}/g
  let match
  while ((match = inputRegex.exec(sql)) !== null) {
    if (!inputs.includes(match[1])) {
      inputs.push(match[1])
    }
  }

  // Extract metadata variables
  const metadataRegex = /\$\{metadata\.(\w+)\}/g
  while ((match = metadataRegex.exec(sql)) !== null) {
    if (!metadata.includes(match[1])) {
      metadata.push(match[1])
    }
  }

  return { inputs, metadata }
}

/**
 * Validate that all template variables have values
 *
 * Returns true if all variables are defined, false otherwise
 */
export function validateTemplateContext(
  sql: string,
  context: SQLTemplateContext
): { valid: boolean; missing: string[] } {
  const variables = extractTemplateVariables(sql)
  const missing: string[] = []

  // Check input variables
  for (const varName of variables.inputs) {
    if (!(varName in context.inputs) || context.inputs[varName] === null || context.inputs[varName] === undefined) {
      missing.push(`inputs.${varName}`)
    }
  }

  // Check metadata variables
  for (const varName of variables.metadata) {
    if (!(varName in context.metadata) || context.metadata[varName] === null || context.metadata[varName] === undefined) {
      missing.push(`metadata.${varName}`)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}
