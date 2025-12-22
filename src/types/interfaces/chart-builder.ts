/**
 * Chart Builder Interface
 *
 * Abstracts chart building logic so core/ doesn't depend on plugins/
 */

import type { ParsedCodeBlock } from '@/types/report'
import type { ChartConfig } from '@/types/chart'
import type { ISQLTemplateContext, IInputStore } from './stores'

/**
 * Interface for chart building service
 */
export interface IChartBuilder {
  /**
   * Build a single chart from a code block
   */
  buildFromBlock(
    block: ParsedCodeBlock,
    tableMapping: Map<string, string>,
    context?: ISQLTemplateContext
  ): ChartConfig | null

  /**
   * Build all charts from report blocks
   */
  buildFromBlocks(
    blocks: ParsedCodeBlock[],
    tableMapping: Map<string, string>,
    context?: ISQLTemplateContext
  ): Map<string, ChartConfig>
}

/**
 * Interface for input initialization service
 */
export interface IInputInitializer {
  /**
   * Initialize default values for input components
   */
  initializeDefaults(
    blocks: ParsedCodeBlock[],
    inputStore: IInputStore
  ): void
}
