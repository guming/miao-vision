/**
 * Service Registry
 *
 * Provides dependency injection for core services.
 * Services are registered during bootstrap and accessed via getters.
 * This allows core/ to use plugin functionality without direct imports.
 */

import type {
  IChartBuilder,
  IInputInitializer,
  ISQLTemplateContext,
  IDatabaseStore
} from '@/types/interfaces'
import type { ParsedCodeBlock } from '@/types/report'
import type { ChartConfig } from '@/types/chart'

/**
 * Service registry state
 */
interface ServiceRegistry {
  chartBuilder: IChartBuilder | null
  inputInitializer: IInputInitializer | null
  databaseStore: IDatabaseStore | null
}

const registry: ServiceRegistry = {
  chartBuilder: null,
  inputInitializer: null,
  databaseStore: null
}

/**
 * Register the chart builder service
 */
export function registerChartBuilder(builder: IChartBuilder): void {
  registry.chartBuilder = builder
  console.log('✅ ChartBuilder service registered')
}

/**
 * Register the input initializer service
 */
export function registerInputInitializer(initializer: IInputInitializer): void {
  registry.inputInitializer = initializer
  console.log('✅ InputInitializer service registered')
}

/**
 * Register the database store service
 */
export function registerDatabaseStore(store: IDatabaseStore): void {
  registry.databaseStore = store
  console.log('✅ DatabaseStore service registered')
}

/**
 * Get the chart builder service
 * @throws Error if not registered
 */
export function getChartBuilder(): IChartBuilder {
  if (!registry.chartBuilder) {
    throw new Error('ChartBuilder service not registered. Call registerChartBuilder() during bootstrap.')
  }
  return registry.chartBuilder
}

/**
 * Get the input initializer service
 * @throws Error if not registered
 */
export function getInputInitializer(): IInputInitializer {
  if (!registry.inputInitializer) {
    throw new Error('InputInitializer service not registered. Call registerInputInitializer() during bootstrap.')
  }
  return registry.inputInitializer
}

/**
 * Get the database store service
 * @throws Error if not registered
 */
export function getDatabaseStore(): IDatabaseStore {
  if (!registry.databaseStore) {
    throw new Error('DatabaseStore service not registered. Call registerDatabaseStore() during bootstrap.')
  }
  return registry.databaseStore
}

/**
 * Check if services are registered
 */
export function isServicesReady(): boolean {
  return (
    registry.chartBuilder !== null &&
    registry.inputInitializer !== null &&
    registry.databaseStore !== null
  )
}

/**
 * Convenience function: Build chart from block using registered service
 */
export function buildChartFromBlock(
  block: ParsedCodeBlock,
  tableMapping: Map<string, string>,
  context?: ISQLTemplateContext
): ChartConfig | null {
  return getChartBuilder().buildFromBlock(block, tableMapping, context)
}

/**
 * Convenience function: Build charts from blocks using registered service
 */
export function buildChartsFromBlocks(
  blocks: ParsedCodeBlock[],
  tableMapping: Map<string, string>,
  context?: ISQLTemplateContext
): Map<string, ChartConfig> {
  return getChartBuilder().buildFromBlocks(blocks, tableMapping, context)
}
