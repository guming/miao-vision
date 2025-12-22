/**
 * Service Initialization (Bootstrap Layer)
 *
 * Registers service implementations with the core service registry.
 * This allows core/ to use plugin functionality without direct imports.
 */

import { registerChartBuilder, registerInputInitializer } from '@core/services'
import type { IChartBuilder, IInputInitializer, IInputStore } from '@/types/interfaces'
import type { ParsedCodeBlock } from '@/types/report'
import type { ChartConfig } from '@/types/chart'

// Import actual implementations from plugins
import {
  buildChartFromBlock as pluginBuildChart,
  buildChartsFromBlocks as pluginBuildCharts
} from '@plugins/viz/chart-builder'
import { initializeInputDefaults } from '@plugins/inputs/initialize-defaults'

/**
 * Chart builder adapter
 * Wraps plugin chart builder to match IChartBuilder interface
 */
const chartBuilderAdapter: IChartBuilder = {
  buildFromBlock(block, tableMapping, context): ChartConfig | null {
    // Cast ISQLTemplateContext to plugin's expected type (compatible at runtime)
    return pluginBuildChart(block, tableMapping, context as any)
  },

  buildFromBlocks(blocks, tableMapping, context): Map<string, ChartConfig> {
    // Cast ISQLTemplateContext to plugin's expected type (compatible at runtime)
    return pluginBuildCharts(blocks, tableMapping, context as any)
  }
}

/**
 * Input initializer adapter
 * Wraps plugin input initializer to match IInputInitializer interface
 */
const inputInitializerAdapter: IInputInitializer = {
  initializeDefaults(blocks: ParsedCodeBlock[], inputStore: IInputStore): void {
    // The plugin's initializeInputDefaults expects a full InputStore
    // but our interface only exposes the minimal methods needed
    initializeInputDefaults(blocks, inputStore as any)
  }
}

/**
 * Register all services with the core service registry
 */
export function registerServices(): void {
  console.log('🔧 Registering services...')

  registerChartBuilder(chartBuilderAdapter)
  registerInputInitializer(inputInitializerAdapter)

  console.log('✅ Services registered')
}
