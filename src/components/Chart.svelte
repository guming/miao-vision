<script lang="ts">
  import { onMount } from 'svelte'
  import { initializeMosaic } from '@core/database'

  interface Props {
    spec: any
    data?: any
    height?: number
  }

  let { spec, data, height = 400 }: Props = $props()

  let chartContainer: HTMLDivElement

  onMount(async () => {
    try {
      // Initialize Mosaic if not already done
      await initializeMosaic()

      // Render the chart using vgplot
      if (spec && chartContainer) {
        // Example: Create a simple plot
        // This will be customized based on the spec
        renderChart()
      }
    } catch (error) {
      console.error('Failed to render chart:', error)
    }
  })

  function renderChart() {
    if (!chartContainer) return

    try {
      // Clear previous chart
      chartContainer.innerHTML = ''

      // Create chart based on spec
      // This is a placeholder - actual implementation will depend on spec format
      const element = document.createElement('div')
      element.textContent = 'Chart will be rendered here'
      element.style.width = '100%'
      element.style.height = `${height}px`
      element.style.display = 'flex'
      element.style.alignItems = 'center'
      element.style.justifyContent = 'center'
      element.style.border = '1px dashed rgba(255, 255, 255, 0.3)'
      element.style.borderRadius = '4px'

      chartContainer.appendChild(element)

      console.log('Chart rendered')
    } catch (error) {
      console.error('Failed to render chart:', error)
    }
  }

  // Re-render when spec or data changes
  $effect(() => {
    if (spec || data) {
      renderChart()
    }
  })
</script>

<div class="chart-wrapper" style="height: {height}px">
  <div bind:this={chartContainer} class="chart-container"></div>
</div>

<style>
  .chart-wrapper {
    width: 100%;
    position: relative;
  }

  .chart-container {
    width: 100%;
    height: 100%;
  }
</style>
