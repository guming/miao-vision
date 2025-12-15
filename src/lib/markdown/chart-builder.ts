/**
 * Chart Builder
 *
 * Converts simplified chart block syntax to full ChartConfig
 * @deprecated Use ChartService directly for new code
 */

import type { ParsedCodeBlock, ChartBlockConfig } from '@/types/report'
import type { ChartConfig } from '@/types/chart'
import type { SQLTemplateContext } from '@/lib/sql/template'
import { chartService } from '@/lib/services/chart.service'

/**
 * Interpolate template variables in chart strings (title, labels)
 * @deprecated Use chartService.interpolateString() instead
 */
function interpolateChartString(str: string | undefined, context?: SQLTemplateContext): string | undefined {
  return chartService.interpolateString(str, context)
}

/**
 * Parse chart block content into config object
 */
function parseChartBlockContent(content: string): ChartBlockConfig | null {
  try {
    console.log('  📝 Parsing chart block content...')
    const lines = content.split('\n')
    const config: any = {}

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim()
        const value = trimmed.substring(colonIndex + 1).trim()

        // Convert numeric values
        if (key === 'width' || key === 'height' || key === 'bins') {
          config[key] = parseInt(value, 10)
        }
        // Convert float values
        else if (key === 'fillOpacity') {
          config[key] = parseFloat(value)
        }
        // Convert boolean values
        else if (key === 'stacked' || key === 'normalized') {
          config[key] = value === 'true'
        }
        else {
          config[key] = value
        }
      }
    }

    console.log('  📋 Parsed config:', config)

    // Validate required fields
    if (!config.type || !config.data || !config.x) {
      console.error('  ❌ Chart block missing required fields:', config)
      console.error('    type:', config.type, 'data:', config.data, 'x:', config.x)
      return null
    }

    // For non-histogram charts, y is required
    if (config.type !== 'histogram' && !config.y) {
      console.error('  ❌ Chart block missing y field (required for non-histogram):', config)
      return null
    }

    console.log('  ✅ Chart block validation passed')
    return config as ChartBlockConfig
  } catch (error) {
    console.error('  ❌ Failed to parse chart block:', error)
    return null
  }
}

/**
 * Build ChartConfig from chart block and SQL results
 * @deprecated Use chartService.buildChartConfig() instead
 */
export function buildChartFromBlock(
  chartBlock: ParsedCodeBlock,
  tableMapping: Map<string, string>,
  templateContext?: SQLTemplateContext
): ChartConfig | null {
  const result = chartService.buildChartConfig(chartBlock, tableMapping, templateContext)
  if (!result.success) {
    console.error(`❌ buildChartFromBlock failed for ${chartBlock.id}:`, result.error)
  }
  return result.success ? result.config || null : null
}

/**
 * Build all charts from report blocks
 * @deprecated Use chartService.buildChartsFromBlocks() instead
 */
export function buildChartsFromBlocks(
  blocks: ParsedCodeBlock[],
  tableMapping: Map<string, string>,
  templateContext?: SQLTemplateContext
): Map<string, ChartConfig> {
  return chartService.buildChartsFromBlocks(blocks, tableMapping, templateContext)
}

/**
 * Validate chart configuration
 * @deprecated Use chartService.validateChartConfig() instead
 */
export function validateChartConfig(config: ChartBlockConfig): {
  valid: boolean
  errors: string[]
} {
  return chartService.validateChartConfig(config)
}
