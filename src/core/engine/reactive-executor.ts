/**
 * Reactive SQL Execution
 *
 * Re-executes SQL queries when their input dependencies change.
 * Uses pure functions from @/lib/pure for core logic.
 */

import type { ReportBlock, ParsedCodeBlock } from '@/types/report'
import type { IInputState } from '@/types/interfaces'
import { executeSQLBlock } from '@core/markdown/sql-executor'
import type { SQLTemplateContext } from '@core/database/template'
import type { DuckDBManager } from '@core/database'
import {
  findAffectedBlocks as pureFindAffectedBlocks,
  getChangedInputs as pureGetChangedInputs,
  type BlockWithDependencies
} from '@core/shared/pure'

/**
 * Find all blocks that depend on the changed inputs (with logging)
 *
 * Wraps the pure function with debug logging.
 */
export function findAffectedBlocks(
  blocks: ReportBlock[],
  changedInputs: string[]
): ReportBlock[] {
  console.log('🔍 Scanning all SQL blocks for dependencies on changed inputs:', changedInputs)

  // Convert to BlockWithDependencies format
  const blocksWithDeps: BlockWithDependencies[] = blocks.map(b => ({
    id: b.id,
    type: b.type,
    content: b.content,
    dependencies: b.dependencies
  }))

  const result = pureFindAffectedBlocks(blocksWithDeps, changedInputs)

  // Log details
  for (const [blockId, deps] of result.blockDependencies) {
    const affectingInputs = result.affectedBy.get(blockId)
    if (affectingInputs) {
      console.log(`  ✅ Block ${blockId}: Affected by [${affectingInputs.join(', ')}]`)
    } else if (deps.length > 0) {
      console.log(`  ⏭️  Block ${blockId}: Not affected (depends on [${deps.join(', ')}])`)
    } else {
      console.log(`  Block ${blockId}: No input dependencies`)
    }
  }

  console.log(`📊 Found ${result.affectedBlocks.length} affected SQL blocks`)

  // Map back to original ReportBlock references
  const affectedIds = new Set(result.affectedBlocks.map(b => b.id))
  return blocks.filter(b => affectedIds.has(b.id))
}

/**
 * Re-execute affected SQL blocks
 */
export async function reExecuteAffectedBlocks(
  affectedBlocks: ReportBlock[],
  parsedBlocks: ParsedCodeBlock[],
  tableMapping: Map<string, string>,
  templateContext: SQLTemplateContext,
  onBlockUpdate: (blockId: string, result: any, dependencies?: { inputs: string[]; blocks: string[] }) => void,
  db?: DuckDBManager,  // NEW: Database instance to use for execution
  schema?: string  // Schema name for table isolation (e.g., "report_abc123")
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
      // Re-execute the SQL block with the provided DB instance and schema
      const execution = await executeSQLBlock(parsedBlock, tableMapping, templateContext, db, schema)

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
 *
 * Re-exported from pure layer with type compatibility.
 */
export function getChangedInputs(
  newInputs: IInputState,
  oldInputs: IInputState
): string[] {
  return pureGetChangedInputs(newInputs, oldInputs)
}
