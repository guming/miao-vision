<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import * as vg from '@uwdata/vgplot'
  import * as d3 from 'd3'
  import { coordinator } from '@/lib/database'
  import type { ChartConfig } from '@/types/chart'

  interface Props {
    config: ChartConfig
  }

  let { config }: Props = $props()

  let chartContainer = $state<HTMLDivElement>()
  let plotElement: HTMLElement | SVGSVGElement | null = null
  let error = $state<string | null>(null)
  let loading = $state(false)
  let mounted = $state(false)

  onMount(() => {
    mounted = true
  })

  onDestroy(() => {
    mounted = false
    cleanup()
  })

  // Re-render when config changes
  $effect(() => {
    if (config && mounted && chartContainer) {
      renderChart()
    }
  })

  function cleanup() {
    try {
      if (plotElement && chartContainer) {
        // Check if the node is still in the DOM
        if (document.body.contains(chartContainer) && chartContainer.contains(plotElement)) {
          chartContainer.removeChild(plotElement)
        }
        plotElement = null
      }
      error = null
    } catch (err) {
      console.warn('Cleanup warning:', err)
    }
  }

  /**
   * Render pie/donut chart using D3
   * Since vgplot doesn't support arc marks, we use D3 directly
   */
  async function renderPieChart() {
    if (!chartContainer || !config) return

    try {
      const coord = coordinator()
      if (!coord) {
        throw new Error('Mosaic coordinator not initialized')
      }

      // Query data from the table
      const query = `SELECT "${config.data.x}" as label, "${config.data.y}" as value FROM "${config.data.table}"`
      console.log('Pie chart query:', query)

      const result = await coord.query(query)
      const data: Array<{ label: string; value: number }> = []

      // Extract data from query result
      for (const row of result) {
        data.push({
          label: String(row.label),
          value: Number(row.value)
        })
      }

      console.log('Pie chart data:', data)

      if (data.length === 0) {
        throw new Error('No data available for pie chart')
      }

      // Chart dimensions
      const width = config.options.width || 500
      const height = config.options.height || 400
      const margin = 40

      // Calculate radius
      const radius = Math.min(width - margin * 2, height - margin * 2) / 2
      const innerRadius = config.options.innerRadius || 0
      const outerRadius = config.options.outerRadius || radius

      // Create SVG
      const svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [-width / 2, -height / 2, width, height])
        .attr('style', 'max-width: 100%; height: auto;')

      // Color scale
      const color = d3.scaleOrdinal<string>()
        .domain(data.map(d => d.label))
        .range(d3.schemeTableau10)

      // Create pie generator
      const pie = d3.pie<{ label: string; value: number }>()
        .value(d => d.value)
        .sort(null)
        .padAngle(config.options.padAngle ?? 0.02)

      // Create arc generator
      const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(config.options.cornerRadius ?? 3)

      // Arc for labels (positioned outside)
      const labelArc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
        .innerRadius(outerRadius * 0.7)
        .outerRadius(outerRadius * 0.7)

      // Create arcs
      const arcs = pie(data)

      // Calculate total for percentages
      const total = d3.sum(data, d => d.value)

      // Draw slices
      svg.selectAll('path')
        .data(arcs)
        .join('path')
        .attr('fill', d => color(d.data.label))
        .attr('d', arc)
        .attr('stroke', '#1F2937')
        .attr('stroke-width', 1)
        .style('opacity', 0.9)
        .append('title')
        .text(d => `${d.data.label}: ${d.data.value} (${((d.data.value / total) * 100).toFixed(1)}%)`)

      // Add labels if enabled
      const showLabels = config.options.showLabels !== false
      const showPercentages = config.options.showPercentages !== false

      if (showLabels || showPercentages) {
        svg.selectAll('text')
          .data(arcs)
          .join('text')
          .attr('transform', d => `translate(${labelArc.centroid(d)})`)
          .attr('text-anchor', 'middle')
          .attr('fill', '#E5E7EB')
          .attr('font-size', '12px')
          .attr('font-weight', '500')
          .each(function(d) {
            const el = d3.select(this)
            const percentage = ((d.data.value / total) * 100).toFixed(1)

            // Only show label if slice is big enough
            if ((d.endAngle - d.startAngle) > 0.25) {
              if (showLabels && showPercentages) {
                el.append('tspan')
                  .attr('x', 0)
                  .attr('dy', '-0.4em')
                  .text(d.data.label)
                el.append('tspan')
                  .attr('x', 0)
                  .attr('dy', '1.2em')
                  .text(`${percentage}%`)
              } else if (showLabels) {
                el.text(d.data.label)
              } else if (showPercentages) {
                el.text(`${percentage}%`)
              }
            }
          })
      }

      // Add title if provided
      if (config.options.title) {
        svg.append('text')
          .attr('x', 0)
          .attr('y', -height / 2 + 20)
          .attr('text-anchor', 'middle')
          .attr('fill', '#E5E7EB')
          .attr('font-size', '18px')
          .attr('font-weight', '600')
          .text(config.options.title)
      }

      // Add legend
      const legendX = outerRadius + 30
      const legendY = -data.length * 10

      const legend = svg.append('g')
        .attr('transform', `translate(${legendX}, ${legendY})`)

      legend.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', 0)
        .attr('y', (_, i) => i * 20)
        .attr('width', 14)
        .attr('height', 14)
        .attr('fill', d => color(d.label))
        .attr('rx', 2)

      legend.selectAll('text')
        .data(data)
        .join('text')
        .attr('x', 20)
        .attr('y', (_, i) => i * 20 + 11)
        .attr('fill', '#E5E7EB')
        .attr('font-size', '12px')
        .text(d => `${d.label} (${d.value})`)

      // Check if component is still mounted
      if (!mounted || !chartContainer) {
        console.log('Component unmounted during pie chart render, aborting')
        return
      }

      // Append to container
      if (document.body.contains(chartContainer)) {
        const svgNode = svg.node()
        if (svgNode) {
          chartContainer.appendChild(svgNode)
          plotElement = svgNode
          console.log('Pie chart rendered successfully')
        }
      }
    } catch (err) {
      console.error('Failed to render pie chart:', err)
      if (mounted) {
        error = err instanceof Error ? err.message : 'Failed to render pie chart'
      }
    } finally {
      if (mounted) {
        loading = false
      }
    }
  }

  async function renderChart() {
    if (!mounted || !chartContainer || !config) {
      console.log('Chart render skipped:', { mounted, chartContainer: !!chartContainer, config: !!config })
      return
    }

    cleanup()
    loading = true
    error = null

    try {
      // Ensure coordinator is initialized
      const coord = coordinator()
      if (!coord) {
        throw new Error('Mosaic coordinator not initialized')
      }

      // Create the appropriate chart based on type
      let mark: any

      switch (config.type) {
        case 'bar':
          mark = vg.barY(
            vg.from(config.data.table),
            {
              x: config.data.x,
              y: config.data.y,
              fill: config.data.group || undefined
            }
          )
          break

        case 'line':
          mark = vg.lineY(
            vg.from(config.data.table),
            {
              x: config.data.x,
              y: config.data.y,
              stroke: config.data.group || undefined
            }
          )
          break

        case 'area':
          mark = vg.areaY(
            vg.from(config.data.table),
            {
              x: config.data.x,
              y: config.data.y,
              fill: config.data.group || 'steelblue',
              fillOpacity: config.options.fillOpacity || 0.7,
              curve: config.options.curve || 'linear'
            }
          )
          break

        case 'scatter':
          mark = vg.dot(
            vg.from(config.data.table),
            {
              x: config.data.x,
              y: config.data.y,
              fill: config.data.group || undefined
            }
          )
          break

        case 'histogram':
          mark = vg.rectY(
            vg.from(config.data.table),
            {
              x: vg.bin(config.data.x, { thresholds: config.options.bins || 20 }),
              y: vg.count(),
              fill: config.data.group || 'steelblue'
            }
          )
          break

        case 'pie':
          // Pie charts use D3 instead of vgplot
          await renderPieChart()
          return  // Exit early - pie chart handles its own rendering

        default:
          throw new Error(`Unsupported chart type: ${config.type}`)
      }

      // Build plot configuration
      const plotConfig: any[] = [
        mark,
        vg.width(config.options.width || 680),
        vg.height(config.options.height || 400)
      ]

      // Add title if provided
      if (config.options.title) {
        plotConfig.push(vg.text([config.options.title], { fontSize: 20, frameAnchor: 'top' }))
      }

      // Add axis labels if provided
      if (config.options.xLabel) {
        plotConfig.push(vg.xLabel(config.options.xLabel))
      }
      if (config.options.yLabel) {
        plotConfig.push(vg.yLabel(config.options.yLabel))
      }

      // Add grid if enabled
      if (config.options.grid) {
        plotConfig.push(vg.grid(true))
      }

      // Set x-axis scale type if specified (to suppress warnings for date-like strings)
      if (config.options.xScaleType) {
        plotConfig.push(vg.xScale(config.options.xScaleType))
        console.log(`X-axis scale type set to: ${config.options.xScaleType}`)
      }

      // Create and render the plot
      const plot = vg.plot(...plotConfig)

      // Wait a tick for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 0))

      // Check if component is still mounted after async operations
      if (!mounted || !chartContainer) {
        console.log('Component unmounted during render, aborting')
        return
      }

      // Check if container is still in the DOM
      if (document.body.contains(chartContainer)) {
        chartContainer.appendChild(plot)
        plotElement = plot
        console.log('Chart rendered successfully:', config.type)
      } else {
        console.warn('Chart container not in DOM, skipping render')
      }
    } catch (err) {
      console.error('Failed to render chart:', err)
      if (mounted) {
        error = err instanceof Error ? err.message : 'Failed to render chart'
      }
    } finally {
      if (mounted) {
        loading = false
      }
    }
  }
</script>

<div class="vgplot-chart">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Rendering chart...</p>
    </div>
  {/if}

  {#if error}
    <div class="error">
      <strong>⚠ Chart Error</strong>
      <p>{error}</p>
    </div>
  {/if}

  <div
    bind:this={chartContainer}
    class="chart-container"
    class:hidden={loading || error}
  ></div>
</div>

<style>
  .vgplot-chart {
    width: 100%;
    min-height: 400px;
    position: relative;
  }

  .chart-container {
    width: 100%;
    height: 100%;
  }

  .chart-container.hidden {
    display: none;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading p {
    margin: 0;
    opacity: 0.7;
  }

  .error {
    padding: 2rem;
    background-color: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    text-align: center;
  }

  .error strong {
    display: block;
    font-size: 1.1rem;
    color: #fca5a5;
    margin-bottom: 0.5rem;
  }

  .error p {
    margin: 0;
    opacity: 0.9;
  }

  /* vgplot default styling overrides - dark theme */
  :global(.vgplot-chart svg) {
    font-family: inherit;
    background-color: transparent !important;
  }

  /* Force dark background for plot area */
  :global(.vgplot-chart svg rect[fill="white"]),
  :global(.vgplot-chart svg rect[fill="#ffffff"]) {
    fill: #1F2937 !important;
  }

  /* Dark text for axes and labels */
  :global(.vgplot-chart svg text) {
    fill: #E5E7EB !important;
  }

  /* Dark grid lines */
  :global(.vgplot-chart svg .grid line) {
    stroke: #374151 !important;
  }

  :global(.vgplot-chart .mark) {
    transition: opacity 0.2s;
  }

  :global(.vgplot-chart .mark:hover) {
    opacity: 0.8;
  }
</style>
