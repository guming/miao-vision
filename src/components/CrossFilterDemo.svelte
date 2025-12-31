<script lang="ts">
  /**
   * Cross-Filter Demo
   *
   * Demonstrates cross-view linking between bar charts.
   * Click on a bar in one chart to filter the other chart.
   */
  import BarChart from '@plugins/data-display/bar-chart/BarChart.svelte'
  import { createSelectionStore } from '@app/stores/selection.svelte'
  import type { BarChartData, BarChartConfig, BarItem } from '@plugins/data-display/bar-chart/types'

  // Create a selection store for this demo
  const selectionStore = createSelectionStore()

  // Sample data: Sales by Category
  const categoryData: Record<string, unknown>[] = [
    { category: 'Electronics', revenue: 45000 },
    { category: 'Clothing', revenue: 32000 },
    { category: 'Food', revenue: 28000 },
    { category: 'Books', revenue: 15000 },
    { category: 'Sports', revenue: 22000 }
  ]

  // Sample data: Sales by Region (will be filtered by category selection)
  const regionData: Record<string, unknown>[] = [
    { region: 'North', category: 'Electronics', revenue: 12000 },
    { region: 'South', category: 'Electronics', revenue: 15000 },
    { region: 'East', category: 'Electronics', revenue: 10000 },
    { region: 'West', category: 'Electronics', revenue: 8000 },
    { region: 'North', category: 'Clothing', revenue: 8000 },
    { region: 'South', category: 'Clothing', revenue: 10000 },
    { region: 'East', category: 'Clothing', revenue: 7000 },
    { region: 'West', category: 'Clothing', revenue: 7000 },
    { region: 'North', category: 'Food', revenue: 7000 },
    { region: 'South', category: 'Food', revenue: 8000 },
    { region: 'East', category: 'Food', revenue: 6000 },
    { region: 'West', category: 'Food', revenue: 7000 },
    { region: 'North', category: 'Books', revenue: 4000 },
    { region: 'South', category: 'Books', revenue: 5000 },
    { region: 'East', category: 'Books', revenue: 3000 },
    { region: 'West', category: 'Books', revenue: 3000 },
    { region: 'North', category: 'Sports', revenue: 6000 },
    { region: 'South', category: 'Sports', revenue: 7000 },
    { region: 'East', category: 'Sports', revenue: 5000 },
    { region: 'West', category: 'Sports', revenue: 4000 }
  ]

  // Default colors
  const DEFAULT_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]

  // Build BarChartData from raw data
  function buildBarChartData(
    rows: Record<string, unknown>[],
    config: BarChartConfig,
    selectedValues?: Set<string>,
    onSelect?: (field: string, value: string) => void
  ): BarChartData {
    const xCol = config.x
    const yCol = config.y

    const categories = [...new Set(rows.map(r => String(r[xCol])))]
    const bars: BarItem[] = []
    let maxValue = 0
    let total = 0

    for (const row of rows) {
      const category = String(row[xCol])
      const value = Number(row[yCol])
      const colorIndex = categories.indexOf(category)

      bars.push({
        id: `${category}-${bars.length}`,
        category,
        value,
        formatted: value.toLocaleString(),
        color: DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length],
        percent: 0
      })

      maxValue = Math.max(maxValue, value)
      total += value
    }

    // Calculate percentages
    for (const bar of bars) {
      bar.percent = (bar.value / maxValue) * 100
    }

    return {
      categories,
      groups: [],
      bars,
      maxValue,
      minValue: 0,
      total,
      config,
      selectedValues,
      selectionField: config.selectionField || config.x,
      onSelect
    }
  }

  // Handle selection on category chart
  function handleCategorySelect(field: string, value: string) {
    selectionStore.toggle(field, value, 'category-chart')
  }

  // Clear all selections
  function clearSelections() {
    selectionStore.clear()
  }

  // Reactive: Build category chart data
  let categoryChartData = $derived(buildBarChartData(
    categoryData,
    {
      data: 'categories',
      x: 'category',
      y: 'revenue',
      title: 'Sales by Category',
      subtitle: 'Click a bar to filter the region chart',
      selectable: true,
      selectionField: 'category',
      showLabels: true,
      showGrid: true,
      height: 300
    },
    selectionStore.selections.get('category')?.values,
    handleCategorySelect
  ))

  // Reactive: Filter region data based on category selection and build chart
  let filteredRegionData = $derived(() => {
    const categorySelection = selectionStore.selections.get('category')
    if (!categorySelection || categorySelection.values.size === 0) {
      return regionData
    }
    return regionData.filter(row =>
      categorySelection.values.has(String(row.category))
    )
  })

  // Aggregate region data by region
  let aggregatedRegionData = $derived(() => {
    const filtered = filteredRegionData()
    const regionTotals = new Map<string, number>()

    for (const row of filtered) {
      const region = String(row.region)
      const revenue = Number(row.revenue)
      regionTotals.set(region, (regionTotals.get(region) || 0) + revenue)
    }

    return Array.from(regionTotals.entries()).map(([region, revenue]) => ({
      region,
      revenue
    }))
  })

  let regionChartData = $derived(buildBarChartData(
    aggregatedRegionData(),
    {
      data: 'regions',
      x: 'region',
      y: 'revenue',
      title: 'Sales by Region',
      subtitle: selectionStore.hasSelection('category')
        ? `Filtered by: ${selectionStore.getSelectedValues('category').join(', ')}`
        : 'Showing all categories',
      selectable: false,
      showLabels: true,
      showGrid: true,
      height: 300,
      color: '#10B981'
    }
  ))

  // Active filters display
  let activeFilters = $derived(selectionStore.getActiveSelections())
</script>

<div class="cross-filter-demo">
  <header class="demo-header">
    <h1>Cross-View Linking Demo</h1>
    <p class="demo-description">
      Click on a bar in the Category chart to filter the Region chart.
      Multiple selections use AND logic.
    </p>

    {#if activeFilters.length > 0}
      <div class="active-filters">
        <span class="filter-label">Active Filters:</span>
        {#each activeFilters as filter}
          <span class="filter-badge">
            {filter.field}: {Array.from(filter.values).join(', ')}
          </span>
        {/each}
        <button class="clear-btn" onclick={clearSelections}>
          Clear All
        </button>
      </div>
    {/if}
  </header>

  <div class="charts-grid">
    <div class="chart-panel">
      <BarChart data={categoryChartData} />
    </div>

    <div class="chart-panel">
      <BarChart data={regionChartData} />
    </div>
  </div>

  <div class="demo-info">
    <h3>How it works:</h3>
    <ol>
      <li><strong>SelectionStore</strong> manages cross-chart selection state</li>
      <li><strong>Category Chart</strong> has <code>selectable: true</code> - clicking toggles selection</li>
      <li><strong>Region Chart</strong> reactively filters data based on SelectionStore</li>
      <li>Visual feedback: selected bars highlighted, unselected dimmed</li>
    </ol>
  </div>
</div>

<style>
  .cross-filter-demo {
    padding: 2rem;
    background: var(--bg-primary, #111827);
    min-height: 100vh;
  }

  .demo-header {
    margin-bottom: 2rem;
  }

  .demo-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary, #F3F4F6);
  }

  .demo-description {
    margin: 0 0 1rem 0;
    color: var(--text-secondary, #9CA3AF);
    font-size: 0.9375rem;
  }

  .active-filters {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.5rem;
  }

  .filter-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #9CA3AF);
  }

  .filter-badge {
    padding: 0.25rem 0.75rem;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 9999px;
    font-size: 0.8125rem;
    color: #93C5FD;
  }

  .clear-btn {
    margin-left: auto;
    padding: 0.375rem 0.75rem;
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 0.375rem;
    color: #FCA5A5;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.7);
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .chart-panel {
    background: var(--bg-card, #1F2937);
    border: 1px solid var(--border-color, #374151);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .demo-info {
    padding: 1.5rem;
    background: var(--bg-card, #1F2937);
    border: 1px solid var(--border-color, #374151);
    border-radius: 0.75rem;
  }

  .demo-info h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    color: var(--text-primary, #F3F4F6);
  }

  .demo-info ol {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary, #9CA3AF);
  }

  .demo-info li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .demo-info code {
    padding: 0.125rem 0.375rem;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 0.25rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    color: #93C5FD;
  }
</style>
