/**
 * Component Initialization
 *
 * Registers all components with the ComponentRegistry using the new adapter layer.
 * Components are defined declaratively via defineComponent() and registered here.
 */

import { componentRegistry } from './component-registry'
import type { ParsedCodeBlock } from '@/types/report'
import { mount } from 'svelte'

// Import chart metadata (charts use vgplot, not Svelte components)
import {
  ChartMetadata,
  LineChartMetadata,
  AreaChartMetadata,
  BarChartMetadata,
  ScatterChartMetadata,
  HistogramMetadata,
  PieChartMetadata
} from './metadata/charts'

// Import component registrations from adapter layer
import { dropdownRegistration } from '@/lib/components/dropdown'
import { buttonGroupRegistration } from '@/lib/components/buttongroup'
import { bigValueRegistration } from '@/lib/components/bigvalue'
import { dataTableRegistration } from '@/lib/components/datatable'
import { valueRegistration } from '@/lib/components/value'
import { alertRegistration } from '@/lib/components/alert'

// Import chart builder (charts still use legacy approach)
import { buildChartFromBlock } from '@/lib/markdown/chart-builder'

/**
 * Chart renderer factory
 * Charts use vgplot rendering which is different from Svelte components
 */
function createChartRenderer(chartType: string) {
  return async (container: HTMLElement, props: any, context: any) => {
    // Check if we have a pre-built chartConfig (from Execute)
    let chartConfig = props.chartConfig

    // If no pre-built config, try to build from block
    if (!chartConfig) {
      const tableMapping = context.tableMapping || new Map()

      // If tableMapping is empty, the report hasn't been executed yet
      // Return null to show placeholder instead of throwing an error
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
        return null
      }

      chartConfig = buildChartFromBlock(
        props.block,
        tableMapping,
        { inputs: context.inputs, metadata: context.metadata }
      )
    }

    if (!chartConfig) {
      // Get more details about why it failed
      const result = buildChartFromBlock(
        props.block,
        tableMapping,
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

    return chart
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

  // Register components using adapter layer registrations
  // Type as RegisteredComponent<any>[] to allow different prop types
  const componentRegistrations: import('./component-registry').RegisteredComponent<any>[] = [
    dropdownRegistration,
    buttonGroupRegistration,
    bigValueRegistration,
    dataTableRegistration,
    valueRegistration,
    alertRegistration
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
