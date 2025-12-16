/**
 * Chart Service
 *
 * Centralized service for building and managing chart configurations
 * Extracted from chart-builder.ts to improve maintainability and testability
 */

import type { ParsedCodeBlock, ChartBlockConfig } from '@/types/report'
import type { ChartConfig, ChartType } from '@/types/chart'
import type { SQLTemplateContext } from '@core/database/template'

/**
 * Chart configuration parser result
 */
export interface ChartParseResult {
  success: boolean
  config?: ChartBlockConfig
  errors?: string[]
}

/**
 * Chart build result
 */
export interface ChartBuildResult {
  success: boolean
  config?: ChartConfig
  error?: string
}

/**
 * Chart Service
 * Manages chart configuration building and validation
 */
export class ChartService {
  /**
   * Parse chart block content into config object
   * Note: type validation is deferred - type can be inferred from block language
   */
  parseChartBlockContent(content: string): ChartParseResult {
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
          else if (key === 'stacked' || key === 'normalized' || key === 'showLabels' || key === 'showPercentages') {
            config[key] = value === 'true'
          }
          // Convert pie chart float values
          else if (key === 'innerRadius' || key === 'outerRadius' || key === 'padAngle' || key === 'cornerRadius') {
            config[key] = parseFloat(value)
          }
          else {
            config[key] = value
          }
        }
      }

      console.log('  📋 Parsed config:', config)

      // Basic validation - type can be inferred later from block language
      // Only validate data and x which are always required
      const errors: string[] = []
      if (!config.data) {
        errors.push('Data source is required')
      }
      if (!config.x) {
        errors.push('X-axis column is required')
      }

      if (errors.length > 0) {
        console.error('  ❌ Chart validation failed:', errors)
        return {
          success: false,
          errors
        }
      }

      console.log('  ✅ Chart block parsing passed')
      return {
        success: true,
        config: config as ChartBlockConfig
      }
    } catch (error) {
      console.error('  ❌ Failed to parse chart block:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown parsing error']
      }
    }
  }

  /**
   * Interpolate template variables in chart strings (title, labels)
   * Supports ${inputs.variable} and ${metadata.property} syntax
   */
  interpolateString(str: string | undefined, context?: SQLTemplateContext): string | undefined {
    if (!str || !context) return str

    let result = str

    // Replace ${inputs.variable}
    result = result.replace(/\$\{inputs\.(\w+)\}/g, (match, varName) => {
      const value = context.inputs[varName]
      return value !== null && value !== undefined ? String(value) : match
    })

    // Replace ${metadata.property}
    result = result.replace(/\$\{metadata\.(\w+)\}/g, (match, propName) => {
      const value = context.metadata?.[propName]
      return value !== null && value !== undefined ? String(value) : match
    })

    return result
  }

  /**
   * Validate chart configuration
   */
  validateChartConfig(config: Partial<ChartBlockConfig>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Required fields
    if (!config.type) {
      errors.push('Chart type is required')
    } else if (!['bar', 'line', 'scatter', 'histogram', 'area', 'pie'].includes(config.type)) {
      errors.push(`Invalid chart type: ${config.type}`)
    }

    if (!config.data) {
      errors.push('Data source is required')
    }

    if (!config.x) {
      errors.push('X-axis column is required')
    }

    // For non-histogram charts, y is required (pie chart uses y for values)
    if (config.type !== 'histogram' && !config.y) {
      errors.push('Y-axis column is required for non-histogram charts')
    }

    // Pie chart specific validation
    if (config.type === 'pie') {
      if (config.innerRadius !== undefined && config.innerRadius < 0) {
        errors.push('innerRadius must be >= 0')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Resolve data source to table name using table mapping
   */
  resolveDataSource(
    dataSource: string,
    tableMapping: Map<string, string>
  ): string | null {
    const tableName = tableMapping.get(dataSource)

    if (!tableName) {
      console.warn(`  ⚠️ Table mapping not found for data source "${dataSource}" (will be available after Execute)`)
      console.warn(`  Available mappings:`, Array.from(tableMapping.keys()))
      return null
    }

    console.log(`  ✅ Resolved table: ${dataSource} → ${tableName}`)
    return tableName
  }

  /**
   * Build ChartConfig from chart block and SQL results
   */
  buildChartConfig(
    chartBlock: ParsedCodeBlock,
    tableMapping: Map<string, string>,
    templateContext?: SQLTemplateContext
  ): ChartBuildResult {
    try {
      console.log('📊 Building chart from block:', chartBlock.id)
      console.log('  Block language:', chartBlock.language)

      // Determine chart type from language (for specific chart types like ```pie, ```bar, etc.)
      const specificChartTypes = ['line', 'area', 'bar', 'scatter', 'histogram', 'pie'] as const
      type ChartTypeFromLanguage = typeof specificChartTypes[number]
      const inferredType: ChartTypeFromLanguage | null = specificChartTypes.includes(chartBlock.language as ChartTypeFromLanguage)
        ? chartBlock.language as ChartTypeFromLanguage
        : null

      // Parse chart block metadata or content
      let chartConfig: ChartBlockConfig | null = null

      if (chartBlock.metadata && 'type' in chartBlock.metadata) {
        console.log('  Using metadata for config')
        chartConfig = chartBlock.metadata as ChartBlockConfig

        // Still validate metadata
        const validation = this.validateChartConfig(chartConfig)
        if (!validation.valid) {
          return {
            success: false,
            error: `Invalid chart configuration: ${validation.errors.join(', ')}`
          }
        }
      } else {
        console.log('  Parsing content for config')
        const parseResult = this.parseChartBlockContent(chartBlock.content)

        if (!parseResult.success || !parseResult.config) {
          return {
            success: false,
            error: `Failed to parse chart config: ${parseResult.errors?.join(', ')}`
          }
        }

        chartConfig = parseResult.config

        // If type not in content but we can infer from language, use that
        if (!chartConfig.type && inferredType) {
          console.log(`  Inferring chart type from language: ${inferredType}`)
          chartConfig.type = inferredType
        }
      }

      console.log('  Parsed chartConfig:', chartConfig)

      // Resolve data source
      const tableName = this.resolveDataSource(chartConfig.data, tableMapping)
      if (!tableName) {
        return {
          success: false,
          error: `Data source "${chartConfig.data}" not found in table mapping`
        }
      }

      // Interpolate template variables in chart strings
      const interpolatedTitle = this.interpolateString(chartConfig.title, templateContext)
      const interpolatedXLabel = this.interpolateString(chartConfig.xLabel, templateContext) || chartConfig.x
      const interpolatedYLabel = this.interpolateString(chartConfig.yLabel, templateContext) || chartConfig.y

      if (templateContext && chartConfig.title && chartConfig.title !== interpolatedTitle) {
        console.log(`  🔄 Title interpolated: "${chartConfig.title}" → "${interpolatedTitle}"`)
      }

      // Build full ChartConfig
      const fullConfig: ChartConfig = {
        type: chartConfig.type as ChartType,
        data: {
          table: tableName,
          x: chartConfig.x,
          y: chartConfig.y,
          group: chartConfig.group
        },
        options: {
          width: chartConfig.width || 680,
          height: chartConfig.height || 400,
          title: interpolatedTitle,
          xLabel: interpolatedXLabel,
          yLabel: interpolatedYLabel,
          grid: true,
          tooltip: true,
          bins: chartConfig.bins || 20,  // Default 20 bins for histogram
          fillOpacity: chartConfig.fillOpacity,  // Area chart opacity
          curve: chartConfig.curve,  // Curve type
          stacked: chartConfig.stacked,  // Stack mode
          normalized: chartConfig.normalized,  // Normalize mode
          xScaleType: chartConfig.xScaleType,  // X-axis scale type (point, time, utc, etc.)
          // Pie chart options
          innerRadius: chartConfig.innerRadius,
          outerRadius: chartConfig.outerRadius,
          padAngle: chartConfig.padAngle,
          cornerRadius: chartConfig.cornerRadius,
          showLabels: chartConfig.showLabels,
          showPercentages: chartConfig.showPercentages
        }
      }

      console.log('  ✅ Built full chart config:', fullConfig)

      return {
        success: true,
        config: fullConfig
      }
    } catch (error) {
      console.error('Failed to build chart from block:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error building chart'
      }
    }
  }

  /**
   * Build multiple charts from blocks
   */
  buildChartsFromBlocks(
    blocks: ParsedCodeBlock[],
    tableMapping: Map<string, string>,
    templateContext?: SQLTemplateContext
  ): Map<string, ChartConfig> {
    const chartConfigs = new Map<string, ChartConfig>()

    console.log('🔍 Building charts from blocks')
    console.log(`  Total blocks: ${blocks.length}`)
    console.log(`  Table mapping size: ${tableMapping.size}`)

    // Filter chart blocks
    const chartBlocks = blocks.filter(
      b => b.language === 'chart' || b.language === 'histogram' || b.language === 'area' ||
           b.language === 'line' || b.language === 'bar' || b.language === 'scatter' ||
           b.language === 'pie'
    )

    console.log(`  Found ${chartBlocks.length} chart blocks`)

    for (const block of chartBlocks) {
      console.log(`\n📊 Processing chart block: ${block.id}`)
      const result = this.buildChartConfig(block, tableMapping, templateContext)

      if (result.success && result.config) {
        console.log(`  ✅ Config built successfully for ${block.id}`)
        chartConfigs.set(block.id, result.config)
      } else {
        console.error(`  ❌ Config build failed for ${block.id}:`, result.error)
      }
    }

    console.log(`\n✨ Built ${chartConfigs.size} chart configs total`)

    return chartConfigs
  }
}

/**
 * Singleton instance
 */
export const chartService = new ChartService()
