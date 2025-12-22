/**
 * Report Execution Service
 *
 * Centralized service for executing reports and managing reactive execution
 * Extracted from App.svelte to improve maintainability and testability
 */

import { get, type Unsubscriber } from 'svelte/store'
import type { Report, ParsedCodeBlock, ReportBlock } from '@/types/report'
import type { IInputStore } from '@/types/interfaces'
import type { SQLTemplateContext } from '@core/database/template'
import { parseMarkdown, extractSQLBlocks } from '@core/markdown/parser'
import { executeReport as executeReportSQL } from '@core/markdown/sql-executor'
import {
  processConditionals,
  buildConditionalContext,
  hasConditionalBlocks
} from '@core/markdown/conditional-processor'
import {
  processLoops,
  buildLoopContext,
  hasLoopBlocks
} from '@core/markdown/loop-processor'
import {
  findAffectedBlocks,
  reExecuteAffectedBlocks,
  getChangedInputs
} from '@core/engine/reactive-executor'
import { getInputInitializer, buildChartFromBlock } from '@core/services'
import { coordinator, duckDBManager } from '@core/database'
import type { DependencyAnalysis } from '@core/engine/dependency-graph'

/**
 * Execution state for a report
 */
export interface ReportExecutionState {
  parsedBlocks: ParsedCodeBlock[]
  tableMapping: Map<string, string>
  previousInputs: Record<string, any>
  hasExecutedOnce: boolean
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean
  errors?: string[]
  failedBlocks?: number
  tableMapping?: Map<string, string>
  dependencyAnalysis?: DependencyAnalysis
}

/**
 * Progress callback
 */
export type ProgressCallback = (progress: number) => void

/**
 * Block update callback
 */
export type BlockUpdateCallback = (report: Report) => void

/**
 * Report Execution Service
 * Manages report execution and reactive updates
 */
export class ReportExecutionService {
  private executionStates = new Map<string, ReportExecutionState>()
  private reactiveUnsubscribers = new Map<string, Unsubscriber>()

  /**
   * Execute a report
   */
  async executeReport(
    report: Report,
    inputStore: IInputStore,
    onProgress?: ProgressCallback,
    onBlockUpdate?: BlockUpdateCallback
  ): Promise<ExecutionResult> {
    console.log('🚀 ReportExecutionService.executeReport() called for:', report.id)

    try {
      // Parse the markdown to extract blocks
      console.log('Parsing markdown...')
      const parsed = await parseMarkdown(report.content)
      const sqlBlocks = extractSQLBlocks(parsed.codeBlocks)

      console.log(`Executing report with ${sqlBlocks.length} SQL blocks, ${parsed.codeBlocks.length} total blocks`)

      // Initialize input defaults BEFORE executing SQL
      getInputInitializer().initializeDefaults(parsed.codeBlocks, inputStore)

      const inputValues = get(inputStore)
      console.log('Input values after initialization:', inputValues)

      // Create SQL template context
      const templateContext: SQLTemplateContext = {
        inputs: inputValues,
        metadata: report.metadata
      }

      // Execute the report
      console.log('Calling executeReportSQL()...')
      const result = await executeReportSQL(
        report,
        parsed.codeBlocks,
        onProgress,
        templateContext
      )

      console.log('executeReportSQL() completed:', result)

      if (result.success) {
        console.log('✅ Report executed successfully')

        // Process loop and conditional blocks if present
        let finalParsedBlocks = parsed.codeBlocks
        let contentToProcess = report.content
        let contentChanged = false

        // Step 1: Process {#each} loops first (they may generate conditional content)
        if (hasLoopBlocks(contentToProcess)) {
          console.log('🔄 Processing {#each} loop blocks...')
          const loopContext = buildLoopContext(
            report.blocks,
            inputValues,
            report.metadata
          )
          const loopProcessedContent = processLoops(contentToProcess, loopContext)

          if (loopProcessedContent !== contentToProcess) {
            console.log('  Content changed after loop processing')
            contentToProcess = loopProcessedContent
            contentChanged = true
          }
        }

        // Step 2: Process {#if} conditionals
        if (hasConditionalBlocks(contentToProcess)) {
          console.log('🔀 Processing conditional blocks...')
          const conditionalContext = buildConditionalContext(
            report.blocks,
            inputValues,
            report.metadata
          )
          const conditionalProcessedContent = processConditionals(contentToProcess, conditionalContext)

          if (conditionalProcessedContent !== contentToProcess) {
            console.log('  Content changed after conditional processing')
            contentToProcess = conditionalProcessedContent
            contentChanged = true
          }
        }

        // If content changed, re-parse to get updated HTML and blocks
        if (contentChanged) {
          console.log('  Re-parsing processed content...')
          const reParsed = await parseMarkdown(contentToProcess)
          finalParsedBlocks = reParsed.codeBlocks
          // Update report's processed content for rendering
          // Note: We don't modify report.content directly to preserve original
          report.metadata = { ...report.metadata, _processedContent: contentToProcess }
        }

        // Save execution state for reactive updates
        this.executionStates.set(report.id, {
          parsedBlocks: finalParsedBlocks,
          tableMapping: result.tableMapping,
          previousInputs: { ...inputValues },
          hasExecutedOnce: true
        })

        console.log('✅ First execution completed - reactive execution now enabled')

        // Trigger block update callback
        if (onBlockUpdate) {
          onBlockUpdate({ ...report })
        }
      } else {
        console.error('❌ Report execution had errors:', result.errors)
      }

      // Convert to ExecutionResult format
      return {
        success: result.success,
        errors: result.errors.map(e => `${e.blockId}: ${e.message}`),
        failedBlocks: result.failedBlocks,
        tableMapping: result.tableMapping,
        dependencyAnalysis: result.dependencyAnalysis
      }
    } catch (error) {
      console.error('💥 Failed to execute report:', error)
      throw error
    }
  }

  /**
   * Setup reactive execution for a report
   * Returns an unsubscribe function
   */
  setupReactiveExecution(
    report: Report,
    inputStore: IInputStore,
    onBlockUpdate: BlockUpdateCallback
  ): Unsubscriber {
    console.log('🔄 Setting up reactive execution for report:', report.id)

    // Clean up previous subscription if exists
    const oldUnsubscribe = this.reactiveUnsubscribers.get(report.id)
    if (oldUnsubscribe) {
      console.log('  Cleaning up old reactive subscription')
      oldUnsubscribe()
    }

    // Subscribe to input changes
    const unsubscribe = inputStore.subscribe(async (newInputs) => {
      const state = this.executionStates.get(report.id)

      // Don't run reactive execution until after first manual Execute
      if (!state || !state.hasExecutedOnce) {
        console.log('⏸️ Reactive execution skipped - waiting for first Execute')
        if (state) {
          state.previousInputs = { ...newInputs }
        }
        return
      }

      // Skip if this is the first subscription
      if (Object.keys(state.previousInputs).length === 0) {
        state.previousInputs = { ...newInputs }
        return
      }

      // Find what inputs changed
      const changedInputs = getChangedInputs(newInputs, state.previousInputs)
      console.log('🔍 Checking input changes...')
      console.log('  Changed inputs:', changedInputs)

      if (changedInputs.length === 0) {
        console.log('  ⏭️  No inputs changed, skipping reactive execution')
        return
      }

      console.log('🔄 Input changed:', changedInputs)

      // Find affected SQL blocks
      const affectedBlocks = findAffectedBlocks(report.blocks, changedInputs)
      console.log('  Found', affectedBlocks.length, 'affected blocks:', affectedBlocks.map(b => b.id))

      if (affectedBlocks.length === 0) {
        console.log('  ⚠️  No blocks affected by this input change')
        return
      }

      // Clean up affected tables and execute
      await this.executeReactiveUpdate(
        report,
        state,
        affectedBlocks,
        newInputs,
        onBlockUpdate
      )
    })

    // Store unsubscribe function
    this.reactiveUnsubscribers.set(report.id, unsubscribe)

    return unsubscribe
  }

  /**
   * Execute reactive update for affected blocks
   */
  private async executeReactiveUpdate(
    report: Report,
    state: ReportExecutionState,
    affectedBlocks: ReportBlock[],
    newInputs: Record<string, any>,
    onBlockUpdate: BlockUpdateCallback
  ) {
    console.log('🧹 Clearing Mosaic coordinator and affected chart tables...')
    console.log(`  Affected blocks: ${affectedBlocks.map(b => b.id).join(', ')}`)

    try {
      // Clean up affected tables
      await this.cleanupAffectedTables(affectedBlocks, state.tableMapping)

      // Re-execute affected blocks
      const templateContext: SQLTemplateContext = {
        inputs: newInputs,
        metadata: report.metadata
      }

      console.log('🔧 Template context for reactive execution:', { inputs: newInputs })

      await reExecuteAffectedBlocks(
        affectedBlocks,
        state.parsedBlocks,
        state.tableMapping,
        templateContext,
        (blockId, result, dependencies) => {
          // Update the block in the report
          const blockIndex = report.blocks.findIndex(b => b.id === blockId)

          if (blockIndex !== -1 && result) {
            report.blocks[blockIndex] = {
              ...report.blocks[blockIndex],
              sqlResult: result,
              dependencies,
              status: 'success'
            }

            console.log(`✅ Block ${blockId} updated with new result`)
          }
        }
      )

      // Rebuild chart configs for affected charts
      await this.rebuildAffectedCharts(
        report,
        state,
        affectedBlocks,
        templateContext
      )

      // Trigger reactivity
      console.log('🔄 Triggering block update callback')
      onBlockUpdate({ ...report })

      // Update previous inputs
      state.previousInputs = { ...newInputs }
      console.log('✅ Reactive execution complete')
    } catch (err) {
      console.error('❌ Reactive execution failed:', err)
    }
  }

  /**
   * Clean up tables for affected blocks
   */
  private async cleanupAffectedTables(
    affectedBlocks: ReportBlock[],
    tableMapping: Map<string, string>
  ) {
    try {
      const coord = coordinator()
      if (!coord) return

      // Build list of tables to drop (only for affected blocks)
      const affectedBlockIds = new Set(affectedBlocks.map(b => b.id))
      const tablesToDrop: string[] = []

      // For each affected block, find its corresponding chart table
      for (const blockId of affectedBlockIds) {
        const tableName = tableMapping.get(blockId)
        if (tableName) {
          tablesToDrop.push(tableName)
          console.log(`  Will drop table for block ${blockId}: ${tableName}`)
        }
      }

      // Drop affected tables from unified DuckDB instance
      if (tablesToDrop.length > 0) {
        console.log(`  Dropping ${tablesToDrop.length} affected tables...`)
        for (const tableName of tablesToDrop) {
          console.log(`    Dropping table: ${tableName}`)
          // Drop from unified DuckDB (used by both SQL queries and Mosaic)
          try {
            if (duckDBManager.isInitialized()) {
              await duckDBManager.query(`DROP TABLE IF EXISTS "${tableName}"`)
            }
          } catch (err) {
            console.warn(`    Failed to drop table: ${err}`)
          }
        }
        console.log('  ✅ Affected tables dropped')

        // Clear Mosaic's query cache to prevent stale data
        console.log('  🧹 Clearing Mosaic query cache to prevent stale data...')
        const cache = coord.manager.cache()
        if (cache) {
          cache.clear()
          console.log('  ✅ Query cache cleared - charts will fetch fresh data')
        }
      } else {
        console.log('  No chart tables to drop')
      }
    } catch (err) {
      console.warn('  Failed to drop tables:', err)
    }
  }

  /**
   * Rebuild chart configs for charts that depend on affected SQL blocks
   */
  private async rebuildAffectedCharts(
    report: Report,
    state: ReportExecutionState,
    affectedBlocks: ReportBlock[],
    templateContext: SQLTemplateContext
  ) {
    console.log('🎨 Rebuilding chart configurations for blocks that depend on affected SQL blocks...')

    // Get affected SQL block IDs
    const affectedSQLBlockIds = new Set(affectedBlocks.map(b => b.id))
    console.log('  Affected SQL block IDs:', Array.from(affectedSQLBlockIds))

    // Build a mapping of data source names (logical names) that are affected
    const affectedDataSources = new Set<string>()

    console.log('  Current tableMapping:', Object.fromEntries(state.tableMapping))

    // Find logical names that map to tables created by affected blocks
    for (const [logicalName, physicalTableName] of state.tableMapping.entries()) {
      for (const affectedBlockId of affectedSQLBlockIds) {
        if (physicalTableName.includes(affectedBlockId)) {
          affectedDataSources.add(logicalName)
          console.log(`  Found affected data source: "${logicalName}" (from ${affectedBlockId} -> ${physicalTableName})`)
        }
      }
    }

    console.log('  Affected data sources (logical names):', Array.from(affectedDataSources))

    // Find all chart blocks
    const allChartBlocks = state.parsedBlocks.filter(pb =>
      pb.language === 'chart' || pb.language === 'histogram'
    )
    console.log('  Total chart blocks in report:', allChartBlocks.length)

    // Find chart blocks that reference the affected SQL blocks
    const affectedChartBlocks = allChartBlocks.filter(chartBlock => {
      // Try to get data source from metadata first
      let dataSource = (chartBlock.metadata as Record<string, unknown> | undefined)?.data as string | undefined

      // If not in metadata, parse from content
      if (!dataSource) {
        const lines = chartBlock.content.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data:')) {
            dataSource = trimmed.substring(5).trim()
            break
          }
        }
      }

      if (!dataSource) return false

      // Check if the data source is in the affected data sources
      return affectedDataSources.has(dataSource)
    })

    console.log(`  Found ${affectedChartBlocks.length} chart blocks that depend on affected SQL blocks`)

    // Rebuild chart configs
    for (const parsedBlock of affectedChartBlocks) {
      console.log(`  Building chart config for ${parsedBlock.id}...`)

      const chartConfig = buildChartFromBlock(
        parsedBlock,
        state.tableMapping,
        templateContext
      )

      if (chartConfig) {
        const blockIndex = report.blocks.findIndex(b => b.id === parsedBlock.id)

        if (blockIndex !== -1) {
          report.blocks[blockIndex] = {
            ...report.blocks[blockIndex],
            chartConfig,
            status: 'success'
          }
          console.log(`  ✅ Updated chart config for ${parsedBlock.id}`)
        }
      } else {
        console.error(`  ❌ Failed to build chart config for ${parsedBlock.id}`)
      }
    }
  }

  /**
   * Get execution state for a report
   */
  getExecutionState(reportId: string): ReportExecutionState | undefined {
    return this.executionStates.get(reportId)
  }

  /**
   * Clear execution state for a report
   */
  clearExecutionState(reportId: string) {
    console.log('🧹 Clearing execution state for report:', reportId)

    // Unsubscribe from reactive updates
    const unsubscribe = this.reactiveUnsubscribers.get(reportId)
    if (unsubscribe) {
      unsubscribe()
      this.reactiveUnsubscribers.delete(reportId)
    }

    // Clear execution state
    this.executionStates.delete(reportId)
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    console.log('🧹 Cleaning up all reactive subscriptions')
    for (const [_reportId, unsubscribe] of this.reactiveUnsubscribers.entries()) {
      unsubscribe()
    }
    this.reactiveUnsubscribers.clear()
    this.executionStates.clear()
  }
}

/**
 * Singleton instance
 */
export const reportExecutionService = new ReportExecutionService()
