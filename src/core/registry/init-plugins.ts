/**
 * Plugin Initialization
 *
 * Registers all plugins with the ComponentRegistry.
 * This is the main entry point for plugin registration.
 */

import { componentRegistry } from './component-registry'
import { mount, type SvelteComponent } from 'svelte'

// Import plugin registrations
import { registerAllPlugins } from '@plugins/index'

// Import chart metadata (charts use vgplot, not Svelte components)
import {
  ChartMetadata,
  LineChartMetadata,
  AreaChartMetadata,
  BarChartMetadata,
  ScatterChartMetadata,
  HistogramMetadata,
  PieChartMetadata
} from '@core/engine/chart-metadata'

// Import chart builder
import { buildChartFromBlock } from '@plugins/viz'

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
  return (block: any, context: any) => {
    return { block, ...context }
  }
}

/**
 * Initialize and register all plugins
 */
export function initializePlugins(): void {
  console.log('🚀 Initializing plugin system...')

  // Register chart components (special handling - use vgplot)
  componentRegistry.register({
    metadata: ChartMetadata,
    parser: createChartParser(),
    renderer: createChartRenderer('chart')
  })

  const charts = [
    { metadata: LineChartMetadata, type: 'line' },
    { metadata: AreaChartMetadata, type: 'area' },
    { metadata: BarChartMetadata, type: 'bar' },
    { metadata: ScatterChartMetadata, type: 'scatter' },
    { metadata: HistogramMetadata, type: 'histogram' },
    { metadata: PieChartMetadata, type: 'pie' }
  ]

  for (const { metadata, type } of charts) {
    componentRegistry.register({
      metadata,
      parser: createChartParser(),
      renderer: createChartRenderer(type)
    })
  }

  // Register all other plugins (inputs, data-display, ui)
  registerAllPlugins(componentRegistry)

  console.log(`✅ Registered ${componentRegistry.getAllLanguages().length} components`)
  console.log('   Components:', componentRegistry.getAllLanguages().join(', '))
}

/**
 * Get plugin documentation
 */
export function getPluginDocumentation() {
  const allMetadata = componentRegistry.getAllMetadata()

  return {
    total: allMetadata.length,
    byCategory: {
      chart: componentRegistry.getByCategory('chart').length,
      input: componentRegistry.getByCategory('input').length,
      dataViz: componentRegistry.getByCategory('data-viz').length,
      ui: componentRegistry.getByCategory('ui').length,
      layout: componentRegistry.getByCategory('layout').length
    },
    components: allMetadata.map(m => ({
      language: m.language,
      displayName: m.displayName,
      type: m.type,
      description: m.description,
      propsCount: m.props.length,
      requiredProps: m.props.filter(p => p.required).map(p => p.name)
    }))
  }
}
