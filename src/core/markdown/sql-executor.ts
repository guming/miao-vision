/**
 * SQL Block Executor
 *
 * Executes SQL queries embedded in markdown reports
 * Supports:
 * - Template variable interpolation (${inputs.xxx})
 * - Block references (${block_name} or FROM block_name)
 * - Dependency-aware execution order
 */

import { databaseStore } from '@app/stores/database.svelte'
import { loadDataIntoTable } from '@core/database'
import { buildChartsFromBlocks } from '@plugins/viz/chart-builder'
import type { ReportBlock, Report, ReportExecutionResult } from '@/types/report'
import type { ParsedCodeBlock } from '@/types/report'
import { extractSQLBlocks } from './parser'
import { interpolateSQL, hasTemplateVariables, extractTemplateVariables } from '@core/database/template'
import type { SQLTemplateContext } from '@core/database/template'
import {
  analyzeDependencies,
  resolveBlockReferences,
  extractBlockReferences,
  type DependencyAnalysis
} from '@core/engine/dependency-graph'

/**
 * Execute a single SQL block and load result into DuckDB table
 */
export async function executeSQLBlock(
  block: ParsedCodeBlock,
  tableMapping: Map<string, string>,
  templateContext?: SQLTemplateContext
): Promise<{
  success: boolean
  result?: any
  error?: string
  time: number
  tableName?: string
  dependencies?: { inputs: string[]; blocks: string[] }
}> {
  const startTime = Date.now()

  try {
    if (!databaseStore.state.initialized) {
      throw new Error('Database not initialized')
    }

    // Extract dependencies from SQL template variables
    const inputDeps = extractTemplateVariables(block.content)

    // Build known block names for reference detection
    const knownBlockNames = new Set<string>()
    for (const [key] of tableMapping) {
      knownBlockNames.add(key)
    }

    // Extract block dependencies
    const blockDeps = extractBlockReferences(block.content, knownBlockNames)

    // Interpolate template variables if context is provided
    let sql = block.content
    if (templateContext && hasTemplateVariables(sql)) {
      console.log(`SQL block ${block.id} has template variables, interpolating...`)
      sql = interpolateSQL(sql, templateContext)
    }

    // Resolve block references (${block_name} -> actual table name)
    if (tableMapping.size > 0) {
      sql = resolveBlockReferences(sql, tableMapping)
    }

    // Execute the query
    const result = await databaseStore.executeQuery(sql)

    // Generate table name for this result
    const tableName = `chart_data_${block.id}`

    // Load result into unified DuckDB table
    // With the merged DuckDB instance, this table is available for both:
    // - SQL block references (${base_data} → chart_data_block_0)
    // - Mosaic chart rendering
    try {
      await loadDataIntoTable(tableName, result.data, result.columns)
      console.log(`Loaded ${result.rowCount} rows into table: ${tableName}`)
    } catch (loadError) {
      console.warn(`Failed to load data into table ${tableName}:`, loadError)
      // Don't fail the query if table loading fails
    }

    // Store mapping: block name/id -> table name
    if (block.metadata && 'name' in block.metadata && block.metadata.name) {
      tableMapping.set(block.metadata.name, tableName)
      console.log(`Mapped "${block.metadata.name}" → ${tableName}`)
    }
    tableMapping.set(block.id, tableName)

    const executionTime = Date.now() - startTime

    console.log(`SQL block ${block.id} executed in ${executionTime}ms`)
    if (inputDeps.inputs.length > 0) {
      console.log(`  Input dependencies: [${inputDeps.inputs.join(', ')}]`)
    }
    if (blockDeps.length > 0) {
      console.log(`  Block dependencies: [${blockDeps.join(', ')}]`)
    }

    return {
      success: true,
      result,
      time: executionTime,
      tableName,
      dependencies: {
        inputs: inputDeps.inputs,
        blocks: blockDeps
      }
    }
  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error(`SQL block ${block.id} failed:`, errorMessage)

    return {
      success: false,
      error: errorMessage,
      time: executionTime
    }
  }
}

/**
 * Execute all SQL blocks in a report with dependency-aware ordering
 */
export async function executeReportSQL(
  blocks: ParsedCodeBlock[],
  onProgress?: (progress: number, current: number, total: number) => void,
  templateContext?: SQLTemplateContext
): Promise<{
  results: Map<string, any>
  tableMapping: Map<string, string>
  dependencyAnalysis: DependencyAnalysis
}> {
  const results = new Map<string, any>()
  const tableMapping = new Map<string, string>()
  const sqlBlocks = extractSQLBlocks(blocks)
  const total = sqlBlocks.length

  // Analyze dependencies and get execution order
  const dependencyAnalysis = analyzeDependencies(blocks)

  console.log(`Executing ${total} SQL blocks`)
  console.log(`Execution order: [${dependencyAnalysis.executionOrder.join(' -> ')}]`)

  if (dependencyAnalysis.circularDependencies) {
    console.warn('Circular dependencies detected:', dependencyAnalysis.circularDependencies)
  }

  // Create a map for quick block lookup
  const blockMap = new Map<string, ParsedCodeBlock>()
  for (const block of sqlBlocks) {
    blockMap.set(block.id, block)
  }

  // Execute in dependency order
  for (let i = 0; i < dependencyAnalysis.executionOrder.length; i++) {
    const blockId = dependencyAnalysis.executionOrder[i]
    const block = blockMap.get(blockId)

    if (!block) continue

    // Report progress
    if (onProgress) {
      const progress = Math.round(((i + 1) / total) * 100)
      onProgress(progress, i + 1, total)
    }

    // Execute block and load into table
    const execution = await executeSQLBlock(block, tableMapping, templateContext)

    if (execution.success && execution.result) {
      // Store result by block ID
      results.set(block.id, execution.result)

      // Also store by name if specified
      if (block.metadata && 'name' in block.metadata && block.metadata.name) {
        results.set(block.metadata.name, execution.result)
      }
    } else {
      console.warn(`SQL block ${block.id} failed:`, execution.error)
    }
  }

  console.log(`Executed ${results.size}/${total} SQL blocks successfully`)
  console.log(`Created ${tableMapping.size} table mappings`)

  return { results, tableMapping, dependencyAnalysis }
}

/**
 * Create ReportBlock from ParsedCodeBlock with execution result
 */
export function createReportBlock(
  parsedBlock: ParsedCodeBlock,
  executionResult?: {
    success: boolean
    result?: any
    error?: string
    time: number
    dependencies?: { inputs: string[]; blocks: string[] }
  }
): ReportBlock {
  const block: ReportBlock = {
    id: parsedBlock.id,
    type: parsedBlock.language === 'sql' ? 'sql' : parsedBlock.language === 'chart' ? 'chart' : 'markdown',
    content: parsedBlock.content,
    status: executionResult
      ? executionResult.success
        ? 'success'
        : 'error'
      : 'pending',
    executionTime: executionResult?.time,
    metadata: parsedBlock.metadata,  // 添加 metadata
    dependencies: executionResult?.dependencies  // Add dependencies
  }

  if (parsedBlock.language === 'sql' && executionResult?.result) {
    block.sqlResult = executionResult.result
  }

  if (executionResult?.error) {
    block.error = executionResult.error
  }

  return block
}

/**
 * Execute complete report with dependency-aware SQL execution
 */
export async function executeReport(
  report: Report,
  parsedBlocks: ParsedCodeBlock[],
  onProgress?: (progress: number) => void,
  templateContext?: SQLTemplateContext
): Promise<ReportExecutionResult & { tableMapping: Map<string, string>; dependencyAnalysis?: DependencyAnalysis }> {
  const startTime = Date.now()
  const result: ReportExecutionResult & { tableMapping: Map<string, string>; dependencyAnalysis?: DependencyAnalysis } = {
    success: true,
    executedBlocks: 0,
    failedBlocks: 0,
    totalTime: 0,
    errors: [],
    tableMapping: new Map()
  }

  try {
    // Execute all SQL blocks
    const sqlBlocks = extractSQLBlocks(parsedBlocks)
    const total = sqlBlocks.length

    // Analyze dependencies and get execution order
    const dependencyAnalysis = analyzeDependencies(parsedBlocks)
    result.dependencyAnalysis = dependencyAnalysis

    console.log(`Executing report ${report.id} with ${total} SQL blocks`)
    console.log(`Execution order: [${dependencyAnalysis.executionOrder.join(' -> ')}]`)

    if (dependencyAnalysis.circularDependencies) {
      console.warn('Circular dependencies detected:', dependencyAnalysis.circularDependencies)
      result.errors.push({
        blockId: 'dependency-analysis',
        message: `Circular dependencies detected: ${dependencyAnalysis.circularDependencies.map(c => c.join(' -> ')).join('; ')}`
      })
    }

    if (templateContext) {
      console.log('Template context provided:', templateContext)
    }

    // Create block map for quick lookup
    const blockMap = new Map<string, ParsedCodeBlock>()
    for (const block of sqlBlocks) {
      blockMap.set(block.id, block)
    }

    // Execute in dependency order
    for (let i = 0; i < dependencyAnalysis.executionOrder.length; i++) {
      const blockId = dependencyAnalysis.executionOrder[i]
      const block = blockMap.get(blockId)

      if (!block) continue

      // Update progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / total) * 50) // SQL execution is 50% of progress
        onProgress(progress)
      }

      // Execute block and load into table
      const execution = await executeSQLBlock(block, result.tableMapping, templateContext)

      if (execution.success) {
        result.executedBlocks++
      } else {
        result.failedBlocks++
        result.errors.push({
          blockId: block.id,
          message: execution.error || 'Unknown error'
        })
      }

      // Update report block
      const reportBlock = createReportBlock(block, execution)
      const existingIndex = report.blocks.findIndex(b => b.id === block.id)

      if (existingIndex !== -1) {
        report.blocks[existingIndex] = reportBlock
      } else {
        report.blocks.push(reportBlock)
      }
    }

    // Build chart configs from chart blocks

    const chartConfigs = buildChartsFromBlocks(parsedBlocks, result.tableMapping, templateContext)
    console.log('Chart configurations:',chartConfigs)
    
    // Update chart blocks in report
    for (const [blockId, chartConfig] of chartConfigs.entries()) {
      const block = parsedBlocks.find(b => b.id === blockId)
      if (block) {
        const reportBlock: ReportBlock = {
          id: blockId,
          type: 'chart',
          content: block.content,
          chartConfig: chartConfig,
          status: 'success'
        }

        const existingIndex = report.blocks.findIndex(b => b.id === blockId)
        if (existingIndex !== -1) {
          report.blocks[existingIndex] = reportBlock
        } else {
          report.blocks.push(reportBlock)
        }
      }
    }

    if (onProgress) {
      onProgress(100)
    }

    result.totalTime = Date.now() - startTime
    result.success = result.failedBlocks === 0

    console.log(`Report execution completed:`, result)
    console.log(`Created ${chartConfigs.size} chart configurations`)

    return result
  } catch (error) {
    result.success = false
    result.totalTime = Date.now() - startTime

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Report execution failed:', errorMessage)

    result.errors.push({
      blockId: 'unknown',
      message: errorMessage
    })

    return result
  }
}

/**
 * Validate SQL query before execution
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  // Basic validation
  const trimmed = sql.trim()

  if (!trimmed) {
    return { valid: false, error: 'Empty query' }
  }

  // Check for dangerous operations (extra safety layer)
  const dangerous = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER']
  const upperSQL = trimmed.toUpperCase()

  for (const keyword of dangerous) {
    if (upperSQL.includes(keyword)) {
      return {
        valid: false,
        error: `Potentially dangerous operation: ${keyword}`
      }
    }
  }

  return { valid: true }
}
