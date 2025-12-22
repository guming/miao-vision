/**
 * Component Initialization
 *
 * Registers all components with the ComponentRegistry using the new adapter layer.
 * Components are defined declaratively via defineComponent() and registered here.
 */

import { componentRegistry } from './component-registry'
import type { ParsedCodeBlock } from '@/types/report'
import { mount, type SvelteComponent } from 'svelte'

// Import chart metadata (charts use vgplot, not Svelte components)
// Note: histogram, bar, and pie are now plugin components, not vgplot charts
import {
  ChartMetadata,
  LineChartMetadata,
  AreaChartMetadata,
  ScatterChartMetadata
} from '@core/engine/chart-metadata'

// Import component registrations from plugins
import {
  dropdownRegistration,
  buttonGroupRegistration,
  textInputRegistration,
  sliderRegistration,
  dateRangeRegistration
} from '@plugins/inputs'
import { bigValueRegistration, dataTableRegistration, valueRegistration, sparklineRegistration, kpiGridRegistration, progressRegistration, barChartRegistration, pieChartRegistration } from '@plugins/data-display'
import { alertRegistration, tabsRegistration, accordionRegistration, tooltipRegistration } from '@plugins/ui'
import { gridRegistration } from '@plugins/layout'

// Import chart builder (charts still use legacy approach)
import { buildChartFromBlock } from '@plugins/viz/chart-builder'

/**
 * Chart renderer factory
 * Charts use vgplot rendering which is different from Svelte components
 */
function createChartRenderer(chartType: string) {
  return async (container: HTMLElement, props: any, context: any): Promise<SvelteComponent> => {
    // Check if we have a pre-built chartConfig (from Execute)
    let chartConfig = props.chartConfig

    // If no pre-built config, try to build from block
    if (!chartConfig) {
      const tableMapping = context.tableMapping || new Map()

      // If tableMapping is empty, the report hasn't been executed yet
      // Return placeholder component instead of throwing an error
      if (tableMapping.size === 0) {
        console.log(`  ⏸️ ${chartType}: No tableMapping available - showing placeholder`)
        // Render placeholder directly
        container.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: #6B7280; background-color: #1F2937; border: 1px dashed #374151; border-radius: 8px;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
            <div style="font-weight: 500; margin-bottom: 0.25rem; color: #D1D5DB;">Chart not executed yet</div>
            <div style="font-size: 0.875rem;">Click "Execute" to run the query and display the chart</div>
          </div>
        `
        // Return placeholder object satisfying SvelteComponent interface
        return { $destroy: () => { container.innerHTML = '' } } as unknown as SvelteComponent
      }

      chartConfig = buildChartFromBlock(
        props.block,
        tableMapping,
        { inputs: context.inputs, metadata: context.metadata }
      )
    }

    if (!chartConfig) {
      // Get more details about why it failed
      const tm = context.tableMapping || new Map()
      const result = buildChartFromBlock(
        props.block,
        tm,
        { inputs: context.inputs, metadata: context.metadata }
      )
      console.error(`Failed to build chart config for ${chartType}:`, result)
      throw new Error(`Failed to build chart config for ${chartType}`)
    }

    // Import VgplotChart component dynamically
    const { default: VgplotChart } = await import('@/components/VgplotChart.svelte')

    // Mount VgplotChart component using Svelte 5 API
    const chart = mount(VgplotChart, {
      target: container,
      props: { config: chartConfig }
    })

    return chart as unknown as SvelteComponent
  }
}

/**
 * Chart parser factory
 * Parse chart blocks into props that include the block itself
 */
function createChartParser() {
  return (block: ParsedCodeBlock, context: any) => {
    // Return the block itself + context for the renderer
    return {
      block,
      ...context
    }
  }
}

/**
 * Initialize and register all components
 */
export function initializeComponents(): void {
  console.log('🚀 Initializing component registry...')

  // Register generic Chart first (for ```chart code blocks)
  componentRegistry.register({
    metadata: ChartMetadata,
    parser: createChartParser(),
    renderer: createChartRenderer('chart')
  })

  // Register specific chart types
  // Note: histogram, bar, and pie are now plugin components (in data-display), not vgplot charts
  const charts = [
    { metadata: LineChartMetadata, type: 'line' },
    { metadata: AreaChartMetadata, type: 'area' },
    { metadata: ScatterChartMetadata, type: 'scatter' }
  ]

  for (const { metadata, type } of charts) {
    componentRegistry.register({
      metadata,
      parser: createChartParser(),
      renderer: createChartRenderer(type)
    })
  }

  // Register components using adapter layer registrations
  // Type as RegisteredComponent<any>[] to allow different prop types
  const componentRegistrations: import('./component-registry').RegisteredComponent<any>[] = [
    dropdownRegistration,
    buttonGroupRegistration,
    textInputRegistration,
    sliderRegistration,
    dateRangeRegistration,
    bigValueRegistration,
    dataTableRegistration,
    valueRegistration,
    sparklineRegistration,
    kpiGridRegistration,
    progressRegistration,
    barChartRegistration,
    pieChartRegistration,
    alertRegistration,
    tabsRegistration,
    accordionRegistration,
    tooltipRegistration,
    gridRegistration
  ]

  for (const registration of componentRegistrations) {
    componentRegistry.register(registration)
  }

  console.log(`✅ Registered ${componentRegistry.getAllLanguages().length} components`)
  console.log('   Components:', componentRegistry.getAllLanguages().join(', '))
}

/**
 * Get component info for documentation
 */
export function getComponentDocumentation() {
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
