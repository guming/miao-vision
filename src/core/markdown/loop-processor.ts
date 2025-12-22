/**
 * Loop Block Processor
 *
 * Processes {#each}...{/each} blocks in markdown content
 * Iterates over query results or arrays to generate repeated content
 *
 * Syntax:
 *   {#each query_name as item}
 *   Content with ${item.column}
 *   {/each}
 *
 *   {#each query_name as item, index}
 *   ${index}: ${item.column}
 *   {/each}
 *
 *   {#each query_name as item}
 *   Content
 *   {:else}
 *   Content when empty
 *   {/each}
 *
 * Examples:
 *   {#each sales_data as row}
 *   - ${row.product}: ${row.revenue}
 *   {/each}
 *
 *   {#each top_customers as customer, i}
 *   ${i + 1}. ${customer.name} - $${customer.total}
 *   {/each}
 */

import type { ReportBlock } from '@/types/report'

/**
 * Context for loop evaluation
 */
export interface LoopContext {
  /** Query results mapped by name: { query_name: { data: [...], columns: [...] } } */
  queries: Map<string, { data: any[]; columns: string[] }>
  /** Input values mapped by name: { input_name: value } */
  inputs: Record<string, any>
  /** Report metadata */
  metadata?: Record<string, any>
}

/**
 * Parsed each block
 */
interface EachBlock {
  fullMatch: string
  dataSource: string
  itemName: string
  indexName: string | null
  loopContent: string
  elseContent: string | null
  startIndex: number
  endIndex: number
}

/**
 * Parse all {#each} blocks from markdown content
 */
function parseEachBlocks(content: string): EachBlock[] {
  const blocks: EachBlock[] = []

  // Pattern to match {#each source as item} or {#each source as item, index}
  const eachPattern = /\{#each\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*\}/g

  let match
  while ((match = eachPattern.exec(content)) !== null) {
    const startIndex = match.index
    const dataSource = match[1]
    const itemName = match[2]
    const indexName = match[3] || null

    // Find the matching {/each}, accounting for nesting
    let depth = 1
    let searchIndex = startIndex + match[0].length
    let endEachIndex = -1
    let elseIndex = -1

    while (searchIndex < content.length && depth > 0) {
      const nextEach = content.indexOf('{#each', searchIndex)
      const nextEndEach = content.indexOf('{/each}', searchIndex)
      const nextElse = content.indexOf('{:else}', searchIndex)

      // Find the nearest marker
      const indices = [
        nextEach !== -1 ? nextEach : Infinity,
        nextEndEach !== -1 ? nextEndEach : Infinity,
        nextElse !== -1 ? nextElse : Infinity
      ]
      const minIndex = Math.min(...indices)

      if (minIndex === Infinity) {
        console.warn('Unclosed {#each} block')
        break
      }

      if (minIndex === nextEach) {
        depth++
        searchIndex = nextEach + 6
      } else if (minIndex === nextEndEach) {
        depth--
        if (depth === 0) {
          endEachIndex = nextEndEach
        }
        searchIndex = nextEndEach + 7
      } else if (minIndex === nextElse && depth === 1) {
        // Only capture {:else} at the current depth
        elseIndex = nextElse
        searchIndex = nextElse + 7
      } else {
        searchIndex = minIndex + 1
      }
    }

    if (endEachIndex === -1) {
      console.warn(`Unclosed {#each} block starting at index ${startIndex}`)
      continue
    }

    // Extract content
    const afterEachTag = startIndex + match[0].length
    const fullMatch = content.substring(startIndex, endEachIndex + 7)

    let loopContent: string
    let elseContent: string | null = null

    if (elseIndex !== -1 && elseIndex < endEachIndex) {
      loopContent = content.substring(afterEachTag, elseIndex)
      elseContent = content.substring(elseIndex + 7, endEachIndex)
    } else {
      loopContent = content.substring(afterEachTag, endEachIndex)
    }

    blocks.push({
      fullMatch,
      dataSource,
      itemName,
      indexName,
      loopContent,
      elseContent,
      startIndex,
      endIndex: endEachIndex + 7
    })
  }

  return blocks
}

/**
 * Interpolate item variables in content
 *
 * Replaces ${item.column} with actual values
 */
function interpolateItemVariables(
  content: string,
  itemName: string,
  indexName: string | null,
  item: Record<string, any>,
  index: number
): string {
  let result = content

  // Replace ${itemName.column} patterns
  const itemPattern = new RegExp(
    `\\$\\{${itemName}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\}`,
    'g'
  )
  result = result.replace(itemPattern, (_match, column) => {
    const value = item[column]
    if (value === null || value === undefined) return ''
    return String(value)
  })

  // Replace ${itemName} alone (for simple values)
  const simpleItemPattern = new RegExp(`\\$\\{${itemName}\\}`, 'g')
  result = result.replace(simpleItemPattern, () => {
    if (typeof item === 'object') return JSON.stringify(item)
    return String(item)
  })

  // Replace ${indexName} if provided
  if (indexName) {
    const indexPattern = new RegExp(`\\$\\{${indexName}\\}`, 'g')
    result = result.replace(indexPattern, () => String(index))

    // Also support ${indexName + 1} style expressions
    const indexExprPattern = new RegExp(
      `\\$\\{${indexName}\\s*([+\\-])\\s*(\\d+)\\}`,
      'g'
    )
    result = result.replace(indexExprPattern, (_match, op, num) => {
      const n = parseInt(num, 10)
      return String(op === '+' ? index + n : index - n)
    })
  }

  return result
}

/**
 * Process {#each} loops in markdown content
 *
 * Replaces {#each}...{/each} blocks with iterated content
 */
export function processLoops(
  content: string,
  context: LoopContext
): string {
  const blocks = parseEachBlocks(content)

  if (blocks.length === 0) {
    return content
  }

  console.log(`Processing ${blocks.length} {#each} blocks`)

  // Process blocks from end to start to preserve indices
  let result = content
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]

    // Get data from context
    const queryResult = context.queries.get(block.dataSource)
    const data = queryResult?.data || []

    console.log(`  {#each ${block.dataSource} as ${block.itemName}}: ${data.length} items`)

    let replacement: string

    if (data.length === 0) {
      // Use else content if no data
      replacement = block.elseContent?.trim() || ''
    } else {
      // Iterate over data and generate content
      const parts: string[] = []

      for (let idx = 0; idx < data.length; idx++) {
        const item = data[idx]
        const iteratedContent = interpolateItemVariables(
          block.loopContent,
          block.itemName,
          block.indexName,
          item,
          idx
        )
        parts.push(iteratedContent)
      }

      replacement = parts.join('')
    }

    result = result.substring(0, block.startIndex) +
             replacement +
             result.substring(block.endIndex)
  }

  // Recursively process in case of nested loops
  if (result.includes('{#each')) {
    return processLoops(result, context)
  }

  return result
}

/**
 * Build loop context from report blocks
 */
export function buildLoopContext(
  blocks: ReportBlock[],
  inputs: Record<string, any>,
  metadata?: Record<string, any>
): LoopContext {
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
 * Check if content has {#each} blocks
 */
export function hasLoopBlocks(content: string): boolean {
  return content.includes('{#each')
}

/**
 * Get all data sources referenced in {#each} blocks
 * Useful for ensuring queries are executed before processing
 */
export function getLoopDataSources(content: string): string[] {
  const sources: string[] = []
  const pattern = /\{#each\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as/g

  let match
  while ((match = pattern.exec(content)) !== null) {
    if (!sources.includes(match[1])) {
      sources.push(match[1])
    }
  }

  return sources
}
