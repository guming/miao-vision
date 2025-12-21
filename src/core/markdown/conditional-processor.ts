/**
 * Conditional Block Processor
 *
 * Processes {#if}...{:else}...{/if} blocks in markdown content
 * Evaluates conditions against query results and input values
 *
 * Syntax:
 *   {#if condition}
 *   Content when true
 *   {:else}
 *   Content when false (optional)
 *   {/if}
 *
 * Conditions:
 *   - ${query.column} > value
 *   - ${query.column} === 'string'
 *   - ${inputs.name} !== null
 *   - Boolean expressions with && and ||
 */

import type { ReportBlock } from '@/types/report'

/**
 * Context for condition evaluation
 */
export interface ConditionalContext {
  /** Query results mapped by name: { query_name: { data: [...], columns: [...] } } */
  queries: Map<string, { data: any[]; columns: string[] }>
  /** Input values mapped by name: { input_name: value } */
  inputs: Record<string, any>
  /** Report metadata */
  metadata?: Record<string, any>
}

/**
 * Parsed conditional block
 */
interface ConditionalBlock {
  fullMatch: string
  condition: string
  ifContent: string
  elseContent: string | null
  startIndex: number
  endIndex: number
}

/**
 * Parse all conditional blocks from markdown content
 */
function parseConditionalBlocks(content: string): ConditionalBlock[] {
  const blocks: ConditionalBlock[] = []

  // Pattern to match {#if condition}...{:else}...{/if}
  // Uses a simplified approach - finds nested blocks by counting
  const ifPattern = /\{#if\s+([^}]+)\}/g

  let match
  while ((match = ifPattern.exec(content)) !== null) {
    const startIndex = match.index
    const condition = match[1].trim()

    // Find the matching {/if}, accounting for nesting
    let depth = 1
    let searchIndex = startIndex + match[0].length
    let endIfIndex = -1
    let elseIndex = -1

    while (searchIndex < content.length && depth > 0) {
      const nextIf = content.indexOf('{#if', searchIndex)
      const nextEndIf = content.indexOf('{/if}', searchIndex)
      const nextElse = content.indexOf('{:else}', searchIndex)

      // Find the nearest marker
      const indices = [
        nextIf !== -1 ? nextIf : Infinity,
        nextEndIf !== -1 ? nextEndIf : Infinity,
        nextElse !== -1 ? nextElse : Infinity
      ]
      const minIndex = Math.min(...indices)

      if (minIndex === Infinity) {
        console.warn('Unclosed {#if} block')
        break
      }

      if (minIndex === nextIf) {
        depth++
        searchIndex = nextIf + 4
      } else if (minIndex === nextEndIf) {
        depth--
        if (depth === 0) {
          endIfIndex = nextEndIf
        }
        searchIndex = nextEndIf + 5
      } else if (minIndex === nextElse && depth === 1) {
        // Only capture {:else} at the current depth
        elseIndex = nextElse
        searchIndex = nextElse + 7
      } else {
        searchIndex = minIndex + 1
      }
    }

    if (endIfIndex === -1) {
      console.warn(`Unclosed {#if} block starting at index ${startIndex}`)
      continue
    }

    // Extract content
    const afterIfTag = startIndex + match[0].length
    const fullMatch = content.substring(startIndex, endIfIndex + 5)

    let ifContent: string
    let elseContent: string | null = null

    if (elseIndex !== -1 && elseIndex < endIfIndex) {
      ifContent = content.substring(afterIfTag, elseIndex).trim()
      elseContent = content.substring(elseIndex + 7, endIfIndex).trim()
    } else {
      ifContent = content.substring(afterIfTag, endIfIndex).trim()
    }

    blocks.push({
      fullMatch,
      condition,
      ifContent,
      elseContent,
      startIndex,
      endIndex: endIfIndex + 5
    })
  }

  return blocks
}

/**
 * Evaluate a condition expression
 *
 * Supports:
 * - ${query.column} > value
 * - ${query.column} === 'string'
 * - ${inputs.name} !== null
 * - Comparisons: >, <, >=, <=, ===, !==, ==, !=
 * - Boolean: && and ||
 */
function evaluateCondition(
  condition: string,
  context: ConditionalContext
): boolean {
  try {
    // Replace ${...} references with actual values
    let evaluated = condition

    // Pattern for ${query.column} or ${query.column[index]}
    const refPattern = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\[(\d+)\])?\}/g

    evaluated = evaluated.replace(refPattern, (_match, source, prop, index) => {
      const rowIndex = index ? parseInt(index, 10) : 0

      // Check if it's an input reference
      if (source === 'inputs') {
        const value = context.inputs[prop]
        if (value === null || value === undefined) return 'null'
        if (typeof value === 'string') return `'${value}'`
        return String(value)
      }

      // Check if it's a metadata reference
      if (source === 'metadata') {
        const value = context.metadata?.[prop]
        if (value === null || value === undefined) return 'null'
        if (typeof value === 'string') return `'${value}'`
        return String(value)
      }

      // Otherwise it's a query reference
      const queryResult = context.queries.get(source)
      if (!queryResult || !queryResult.data || queryResult.data.length === 0) {
        return 'null'
      }

      const row = queryResult.data[rowIndex]
      if (!row) return 'null'

      const value = row[prop]
      if (value === null || value === undefined) return 'null'
      if (typeof value === 'string') return `'${value}'`
      return String(value)
    })

    // Simple ${varname} pattern (for simple inputs)
    const simpleRefPattern = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
    evaluated = evaluated.replace(simpleRefPattern, (_match, varname) => {
      // Check inputs first
      if (varname in context.inputs) {
        const value = context.inputs[varname]
        if (value === null || value === undefined) return 'null'
        if (typeof value === 'string') return `'${value}'`
        return String(value)
      }
      return 'null'
    })

    // Safety check: only allow safe operations
    const safePattern = /^[\s\d\w'".+\-*/<>=!&|()]+$/
    if (!safePattern.test(evaluated)) {
      console.warn('Unsafe condition expression:', evaluated)
      return false
    }

    // Evaluate the expression
    // Using Function instead of eval for slightly better isolation
    const result = new Function(`return ${evaluated}`)()
    return Boolean(result)
  } catch (error) {
    console.error('Failed to evaluate condition:', condition, error)
    return false
  }
}

/**
 * Process conditional blocks in markdown content
 *
 * Replaces {#if}...{/if} blocks with their evaluated content
 */
export function processConditionals(
  content: string,
  context: ConditionalContext
): string {
  const blocks = parseConditionalBlocks(content)

  if (blocks.length === 0) {
    return content
  }

  console.log(`Processing ${blocks.length} conditional blocks`)

  // Process blocks from end to start to preserve indices
  let result = content
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]

    const conditionMet = evaluateCondition(block.condition, context)
    console.log(`  Condition "${block.condition}" => ${conditionMet}`)

    const replacement = conditionMet
      ? block.ifContent
      : (block.elseContent || '')

    result = result.substring(0, block.startIndex) +
             replacement +
             result.substring(block.endIndex)
  }

  // Recursively process in case of nested conditionals
  if (result.includes('{#if')) {
    return processConditionals(result, context)
  }

  return result
}

/**
 * Build conditional context from report blocks
 */
export function buildConditionalContext(
  blocks: ReportBlock[],
  inputs: Record<string, any>,
  metadata?: Record<string, any>
): ConditionalContext {
  const queries = new Map<string, { data: any[]; columns: string[] }>()

  for (const block of blocks) {
    if (block.type === 'sql' && block.sqlResult) {
      const queryData = {
        data: block.sqlResult.data,
        columns: block.sqlResult.columns
      }
      // Register by name if available
      if (block.metadata?.name) {
        queries.set(block.metadata.name, queryData)
      }
      // Also register by id for fallback
      queries.set(block.id, queryData)
    }
  }

  return {
    queries,
    inputs,
    metadata
  }
}

/**
 * Check if content has conditional blocks
 */
export function hasConditionalBlocks(content: string): boolean {
  return content.includes('{#if')
}
