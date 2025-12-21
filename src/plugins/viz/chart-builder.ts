/**
 * Chart Builder
 *
 * Converts simplified chart block syntax to full ChartConfig
 * @deprecated Use ChartService directly for new code
 */

import type { ParsedCodeBlock, ChartBlockConfig } from '@/types/report'
import type { ChartConfig } from '@/types/chart'
import type { SQLTemplateContext } from '@core/database/template'
import { chartService } from '@core/shared/chart.service'

/**
 * Build ChartConfig from chart block and SQL results
 * @deprecated Use chartService.buildChartConfig() instead
 */
export function buildChartFromBlock(
  chartBlock: ParsedCodeBlock,
  tableMapping: Map<string, string>,
  templateContext?: SQLTemplateContext
): ChartConfig | null {
  const result = chartService.buildChartConfig(chartBlock, tableMapping, templateContext)
  if (!result.success) {
    console.error(`❌ buildChartFromBlock failed for ${chartBlock.id}:`, result.error)
  }
  return result.success ? result.config || null : null
}

/**
 * Build all charts from report blocks
 * @deprecated Use chartService.buildChartsFromBlocks() instead
 */
export function buildChartsFromBlocks(
  blocks: ParsedCodeBlock[],
  tableMapping: Map<string, string>,
  templateContext?: SQLTemplateContext
): Map<string, ChartConfig> {
  return chartService.buildChartsFromBlocks(blocks, tableMapping, templateContext)
}

/**
 * Validate chart configuration
 * @deprecated Use chartService.validateChartConfig() instead
 */
export function validateChartConfig(config: ChartBlockConfig): {
  valid: boolean
  errors: string[]
} {
  return chartService.validateChartConfig(config)
}
