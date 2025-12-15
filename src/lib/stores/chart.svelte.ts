import type { ChartConfig, ChartState } from '@/types/chart'
import type { QueryResult } from '@/types/database'
import { prepareChartData, suggestChartAxes } from '@/lib/chart'
import { initializeMosaic } from '@/lib/database'

/**
 * Chart store using Svelte 5 Runes
 */
export function createChartStore() {
  let state = $state<ChartState>({
    config: null,
    availableColumns: [],
    loading: false,
    error: null,
    rendered: false
  })

  let currentTableName = $state<string | null>(null)

  /**
   * Load query result for charting
   */
  async function loadQueryResult(result: QueryResult) {
    state.loading = true
    state.error = null

    try {
      // Ensure Mosaic is initialized
      await initializeMosaic()

      // Prepare chart data
      const { tableName, columns } = await prepareChartData(result)

      currentTableName = tableName
      state.availableColumns = columns

      // Suggest initial axes
      const suggestions = suggestChartAxes(columns)

      // Create initial config if we have suggestions
      if (suggestions.xAxis && suggestions.yAxis) {
        state.config = {
          type: 'bar',
          data: {
            table: tableName,
            x: suggestions.xAxis,
            y: suggestions.yAxis
          },
          options: {
            width: 680,
            height: 400,
            grid: true,
            tooltip: true
          }
        }
      }

      console.log('Query result loaded for charting', {
        table: tableName,
        rows: result.rowCount,
        columns: columns.length,
        suggestions
      })
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to load data'
      console.error('Failed to load query result:', error)
    } finally {
      state.loading = false
    }
  }

  /**
   * Update chart configuration
   */
  function updateConfig(config: ChartConfig) {
    state.config = config
    state.rendered = false
    state.error = null
    console.log('Chart config updated:', config)
  }

  /**
   * Mark chart as rendered
   */
  function markRendered() {
    state.rendered = true
  }

  /**
   * Set error state
   */
  function setError(error: string) {
    state.error = error
    state.rendered = false
  }

  /**
   * Reset chart state
   */
  function reset() {
    state.config = null
    state.availableColumns = []
    state.loading = false
    state.error = null
    state.rendered = false
    currentTableName = null
  }

  /**
   * Get suggested axes for current columns
   */
  function getSuggestedAxes() {
    return suggestChartAxes(state.availableColumns)
  }

  /**
   * Check if ready to create chart
   */
  function isReady(): boolean {
    return state.availableColumns.length > 0 && currentTableName !== null
  }

  return {
    get state() {
      return state
    },
    get tableName() {
      return currentTableName
    },
    loadQueryResult,
    updateConfig,
    markRendered,
    setError,
    reset,
    getSuggestedAxes,
    isReady
  }
}

// Export singleton store
export const chartStore = createChartStore()
