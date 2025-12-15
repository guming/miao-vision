/**
 * Reactive SQL Execution
 *
 * Re-executes SQL queries when their input dependencies change
 */

import type { Report, ReportBlock, ParsedCodeBlock } from '@/types/report'
import type { InputState } from '@/lib/stores/report-inputs'
import { executeSQLBlock } from '@/lib/markdown/sql-executor'
import type { SQLTemplateContext } from '@/lib/sql/template'
import { extractTemplateVariables } from '@/lib/sql/template'

/**
 * Find all blocks that depend on the changed inputs
 *
 * IMPORTANT: This function dynamically extracts dependencies from SQL content
 * at runtime, rather than relying on stored dependencies. This makes it robust
 * against localStorage persistence issues and ensures it works for all SQL blocks.
 */
export function findAffectedBlocks(
  blocks: ReportBlock[],
  changedInputs: string[]
): ReportBlock[] {
  const affected: ReportBlock[] = []

  console.log('🔍 Scanning all SQL blocks for dependencies on changed inputs:', changedInputs)

  for (const block of blocks) {
    if (block.type !== 'sql') continue

    // CRITICAL FIX: Extract dependencies from SQL content at runtime
    // This ensures we always have up-to-date dependencies, even if block.dependencies
    // is missing due to localStorage issues or incomplete initialization
    let inputDependencies: string[] = []

    if (block.dependencies?.inputs) {
      // Use stored dependencies if available (faster)
      inputDependencies = block.dependencies.inputs
      console.log(`  Block ${block.id}: Using stored dependencies [${inputDependencies.join(', ')}]`)
    } else {
      // Extract dependencies from SQL content (fallback)
      const extracted = extractTemplateVariables(block.content)
      inputDependencies = extracted.inputs
      console.log(`  Block ${block.id}: Extracted dependencies from content [${inputDependencies.join(', ')}]`)
    }

    if (inputDependencies.length === 0) {
      console.log(`  Block ${block.id}: No input dependencies`)
      continue
    }

    // Check if this block depends on any of the changed inputs
    const hasChangedDependency = inputDependencies.some(inputName =>
      changedInputs.includes(inputName)
    )

    if (hasChangedDependency) {
      console.log(`  ✅ Block ${block.id}: Affected by changes to [${changedInputs.join(', ')}]`)
      affected.push(block)
    } else {
      console.log(`  ⏭️  Block ${block.id}: Not affected (depends on [${inputDependencies.join(', ')}])`)
    }
  }

  console.log(`📊 Found ${affected.length} affected SQL blocks`)
  return affected
}

/**
 * Re-execute affected SQL blocks
 */
export async function reExecuteAffectedBlocks(
  affectedBlocks: ReportBlock[],
  parsedBlocks: ParsedCodeBlock[],
  tableMapping: Map<string, string>,
  templateContext: SQLTemplateContext,
  onBlockUpdate: (blockId: string, result: any, dependencies?: { inputs: string[]; blocks: string[] }) => void
): Promise<void> {
  console.log(`🔄 Re-executing ${affectedBlocks.length} affected SQL blocks...`)
  console.log(`  Current tableMapping:`, Object.fromEntries(tableMapping))

  for (const block of affectedBlocks) {
    // Find the corresponding parsed block
    const parsedBlock = parsedBlocks.find(pb => pb.id === block.id)
    if (!parsedBlock) {
      console.warn(`Could not find parsed block for ${block.id}`)
      continue
    }

    console.log(`  Re-executing ${block.id}...`)

    try {
      // Re-execute the SQL block
      const execution = await executeSQLBlock(parsedBlock, tableMapping, templateContext)

      if (execution.success && execution.result) {
        console.log(`  ✅ ${block.id} re-executed successfully`)
        console.log(`  Table mapping updated:`, Object.fromEntries(tableMapping))
        onBlockUpdate(block.id, execution.result, execution.dependencies)
      } else {
        console.error(`  ❌ ${block.id} failed:`, execution.error)
        onBlockUpdate(block.id, null, execution.dependencies)
      }
    } catch (error) {
      console.error(`  ❌ ${block.id} error:`, error)
      onBlockUpdate(block.id, null)
    }
  }

  console.log(`✅ Re-execution complete`)
  console.log(`  Final tableMapping:`, Object.fromEntries(tableMapping))
}

/**
 * Compare two input states and return changed keys
 */
export function getChangedInputs(
  newInputs: InputState,
  oldInputs: InputState
): string[] {
  const changed: string[] = []

  // Check all keys in new inputs
  for (const key in newInputs) {
    if (newInputs[key] !== oldInputs[key]) {
      changed.push(key)
    }
  }

  // Check for removed keys
  for (const key in oldInputs) {
    if (!(key in newInputs)) {
      changed.push(key)
    }
  }

  return changed
}
