/**
 * Chart Initialization (Bootstrap Layer)
 *
 * Registers vgplot-based charts with the ComponentRegistry.
 * This file lives in bootstrap/ to avoid core → plugins dependency.
 */

import { componentRegistry } from '@core/registry'
import type { ParsedCodeBlock } from '@/types/report'
import { mount, type SvelteComponent } from 'svelte'

// Import chart metadata from core (these are just data, no plugin dependency)
import {
  ChartMetadata,
  LineChartMetadata,
  AreaChartMetadata,
  ScatterChartMetadata
} from '@core/engine/chart-metadata'

// Import chart builder from plugins (this is the key dependency)
import { buildChartFromBlock } from '@plugins/viz/chart-builder'

/**
 * Chart renderer factory
 * Charts use vgplot rendering which is different from Svelte components
 */
function createChartRenderer(chartType: string) {
  return async (container: HTMLElement, props: any, context: any): Promise<SvelteComponent> => {
    let chartConfig = props.chartConfig

    if (!chartConfig) {
      const tableMapping = context.tableMapping || new Map()

      if (tableMapping.size === 0) {
        console.log(`  ⏸️ ${chartType}: No tableMapping available - showing placeholder`)
        container.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: #6B7280; background-color: #1F2937; border: 1px dashed #374151; border-radius: 8px;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
            <div style="font-weight: 500; margin-bottom: 0.25rem; color: #D1D5DB;">Chart not executed yet</div>
            <div style="font-size: 0.875rem;">Click "Execute" to run the query and display the chart</div>
          </div>
        `
        return { $destroy: () => { container.innerHTML = '' } } as unknown as SvelteComponent
      }

      chartConfig = buildChartFromBlock(
        props.block,
        tableMapping,
        { inputs: context.inputs, metadata: context.metadata }
      )
    }

    if (!chartConfig) {
      console.error(`Failed to build chart config for ${chartType}`)
      throw new Error(`Failed to build chart config for ${chartType}`)
    }

    const { default: VgplotChart } = await import('@/components/VgplotChart.svelte')

    const chart = mount(VgplotChart, {
      target: container,
      props: { config: chartConfig }
    })

    return chart as unknown as SvelteComponent
  }
}

/**
 * Chart parser factory
 */
function createChartParser() {
  return (block: ParsedCodeBlock, context: any) => {
    return { block, ...context }
  }
}

/**
 * Register vgplot-based charts
 *
 * Only charts that need vgplot features (crossfilter, brush, large data):
 * - chart (generic)
 * - line
 * - area
 * - scatter
 *
 * Note: bar, pie, histogram are now plugin components (in data-display)
 */
export function registerVgplotCharts(): void {
  console.log('📊 Registering vgplot charts...')

  // Register generic Chart first (for ```chart code blocks)
  componentRegistry.register({
    metadata: ChartMetadata,
    parser: createChartParser(),
    renderer: createChartRenderer('chart')
  })

  // Register specific chart types that benefit from vgplot
  // Note: line, area, scatter are now plugin components (use Svelte+SVG instead of vgplot)
  // Only keep generic 'chart' for vgplot (used in SQL Workspace for advanced features)
  const charts: Array<{ metadata: any; type: string }> = [
    // { metadata: LineChartMetadata, type: 'line' },      // Migrated to plugin
    // { metadata: AreaChartMetadata, type: 'area' },      // Migrated to plugin
    // { metadata: ScatterChartMetadata, type: 'scatter' } // Migrated to plugin
  ]

  for (const { metadata, type } of charts) {
    componentRegistry.register({
      metadata,
      parser: createChartParser(),
      renderer: createChartRenderer(type)
    })
  }

  console.log('✅ vgplot charts registered: chart (line, area, scatter are now plugins)')
}
