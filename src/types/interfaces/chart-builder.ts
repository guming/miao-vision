/**
 * Chart Builder Interface
 *
 * Abstracts chart building logic so core/ doesn't depend on plugins/
 */

import type { ParsedCodeBlock } from '@/types/report'
import type { ChartConfig } from '@/types/chart'

/**
 * Template context for SQL interpolation (interface version)
 */
export interface ISQLTemplateContext {
  inputs: Record<string, unknown>
  metadata: Record<string, unknown>
}

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
 * Interface for input store (subset of InputStore)
 */
export interface IInputStore {
  has(name: string): boolean
  setValue(name: string, value: unknown): void
  getValue(name: string): unknown
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
