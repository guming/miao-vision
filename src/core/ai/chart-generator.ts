/**
 * AI Chart Generator
 *
 * Uses LLM to generate chart configurations from natural language.
 *
 * @module core/ai/chart-generator
 */

import type {
  LLMProvider,
  ChatMessage,
  AIContext,
  ChartGenerationRequest,
  ChartGenerationResult
} from './types'

/**
 * Supported chart types and their descriptions
 */
const CHART_TYPES = {
  bar: '柱状图 - 适合比较不同类别的数值',
  line: '折线图 - 适合展示趋势和时间序列',
  pie: '饼图 - 适合展示部分与整体的比例关系',
  area: '面积图 - 适合展示累积趋势',
  scatter: '散点图 - 适合展示两个变量之间的关系',
  histogram: '直方图 - 适合展示数值分布',
  heatmap: '热力图 - 适合展示矩阵数据的密度',
  funnel: '漏斗图 - 适合展示转化流程',
  boxplot: '箱线图 - 适合展示数据分布和离群值'
}

/**
 * Build system prompt for chart generation
 */
function buildSystemPrompt(): string {
  return `你是一个数据可视化专家，帮助用户生成图表配置。

## 你的任务
根据用户的描述和可用的数据源，生成合适的图表配置。

## 可用的图表类型
${Object.entries(CHART_TYPES).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}

## 输出格式
你必须输出一个有效的 YAML 格式的图表配置块，格式如下：

\`\`\`chart
type: <图表类型>
data: <数据源名称>
x: <X轴字段>
y: <Y轴字段>
title: <图表标题>
\`\`\`

## 规则
1. 只输出图表配置块，不要有其他解释
2. data 必须是用户提供的数据源名称之一
3. x 和 y 必须是数据源中存在的列名
4. 根据数据特征选择最合适的图表类型
5. 如果用户指定了图表类型，优先使用用户指定的

## 图表配置参数说明
- type: 图表类型 (bar, line, pie, area, scatter, histogram, heatmap, funnel, boxplot)
- data: 数据源名称 (SQL 查询结果的名称)
- x: X 轴对应的列名
- y: Y 轴对应的列名 (histogram 不需要)
- group: 分组字段 (可选，用于多系列图表)
- title: 图表标题
- color: 颜色字段 (可选)
- bins: 直方图的分箱数量 (仅 histogram)
- stacked: 是否堆叠 (仅 bar, area)
`
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(request: ChartGenerationRequest): string {
  const { prompt, context } = request

  let userPrompt = `## 用户需求\n${prompt}\n\n`

  if (context.dataSources.length > 0) {
    userPrompt += `## 可用数据源\n`

    for (const source of context.dataSources) {
      userPrompt += `\n### ${source.name}\n`
      userPrompt += `行数: ${source.rowCount}\n`
      userPrompt += `列:\n`

      for (const col of source.columns) {
        userPrompt += `- ${col.name} (${col.type})\n`
      }

      if (source.sample && source.sample.length > 0) {
        userPrompt += `\n示例数据:\n`
        userPrompt += '```json\n'
        userPrompt += JSON.stringify(source.sample.slice(0, 3), null, 2)
        userPrompt += '\n```\n'
      }
    }
  } else {
    userPrompt += `\n注意: 当前没有可用的数据源。请先执行 SQL 查询。\n`
  }

  if (request.chartType) {
    userPrompt += `\n用户指定的图表类型: ${request.chartType}\n`
  }

  return userPrompt
}

/**
 * Parse LLM response to extract chart config
 */
function parseChartConfig(response: string): ChartGenerationResult {
  // Extract code block
  const codeBlockMatch = response.match(/```(?:chart|yaml)?\s*([\s\S]*?)```/)

  if (!codeBlockMatch) {
    // Try to find YAML-like content
    const yamlMatch = response.match(/type:\s*\w+[\s\S]*?(?:title:.*)?/)
    if (yamlMatch) {
      return {
        success: true,
        chartConfig: yamlMatch[0].trim(),
        chartType: extractChartType(yamlMatch[0])
      }
    }

    return {
      success: false,
      error: '无法解析图表配置，请重试'
    }
  }

  const config = codeBlockMatch[1].trim()
  const chartType = extractChartType(config)

  return {
    success: true,
    chartConfig: config,
    chartType
  }
}

/**
 * Extract chart type from config
 */
function extractChartType(config: string): string | undefined {
  const match = config.match(/type:\s*(\w+)/)
  return match ? match[1] : undefined
}

/**
 * Chart Generator Service
 */
export class ChartGenerator {
  private provider: LLMProvider

  constructor(provider: LLMProvider) {
    this.provider = provider
  }

  /**
   * Update provider
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider
  }

  /**
   * Generate chart configuration from natural language
   */
  async generate(request: ChartGenerationRequest): Promise<ChartGenerationResult> {
    if (!this.provider.isConfigured()) {
      return {
        success: false,
        error: 'AI 服务未配置，请先设置 API Key'
      }
    }

    if (request.context.dataSources.length === 0) {
      return {
        success: false,
        error: '没有可用的数据源，请先执行 SQL 查询'
      }
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(request) }
    ]

    try {
      const response = await this.provider.complete(messages, {
        temperature: 0.3, // Lower for more deterministic output
        maxTokens: 1024
      })

      return parseChartConfig(response.content)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成失败，请重试'
      }
    }
  }

  /**
   * Generate with streaming (for preview)
   */
  async *generateStream(
    request: ChartGenerationRequest
  ): AsyncGenerator<{ partial: string; done: boolean }, ChartGenerationResult, unknown> {
    if (!this.provider.isConfigured()) {
      return {
        success: false,
        error: 'AI 服务未配置，请先设置 API Key'
      }
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(request) }
    ]

    let fullContent = ''

    try {
      for await (const chunk of this.provider.stream(messages, {
        temperature: 0.3,
        maxTokens: 1024
      })) {
        fullContent += chunk.content
        yield { partial: fullContent, done: chunk.done }
      }

      return parseChartConfig(fullContent)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成失败，请重试'
      }
    }
  }

  /**
   * Suggest chart types based on data
   */
  suggestChartTypes(context: AIContext): Array<{ type: string; reason: string }> {
    const suggestions: Array<{ type: string; reason: string }> = []

    if (context.dataSources.length === 0) {
      return suggestions
    }

    const source = context.dataSources[0]
    const columns = source.columns

    // Check for time columns
    const hasTimeColumn = columns.some(c =>
      c.type.toLowerCase().includes('date') ||
      c.type.toLowerCase().includes('time') ||
      c.name.toLowerCase().includes('date') ||
      c.name.toLowerCase().includes('time')
    )

    // Check for numeric columns
    const numericColumns = columns.filter(c =>
      c.type.toLowerCase().includes('int') ||
      c.type.toLowerCase().includes('float') ||
      c.type.toLowerCase().includes('double') ||
      c.type.toLowerCase().includes('decimal') ||
      c.type.toLowerCase().includes('number')
    )

    // Check for categorical columns
    const categoricalColumns = columns.filter(c =>
      c.type.toLowerCase().includes('varchar') ||
      c.type.toLowerCase().includes('string') ||
      c.type.toLowerCase().includes('text')
    )

    if (hasTimeColumn && numericColumns.length > 0) {
      suggestions.push({
        type: 'line',
        reason: '数据包含时间列，适合用折线图展示趋势'
      })
      suggestions.push({
        type: 'area',
        reason: '数据包含时间列，面积图可以展示累积趋势'
      })
    }

    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      suggestions.push({
        type: 'bar',
        reason: '数据包含分类和数值，适合用柱状图比较'
      })

      if (source.rowCount <= 10) {
        suggestions.push({
          type: 'pie',
          reason: '数据量较小，适合用饼图展示占比'
        })
      }
    }

    if (numericColumns.length >= 2) {
      suggestions.push({
        type: 'scatter',
        reason: '有多个数值列，可以用散点图分析关系'
      })
    }

    if (numericColumns.length === 1 && source.rowCount > 20) {
      suggestions.push({
        type: 'histogram',
        reason: '单个数值列，直方图可以展示分布'
      })
    }

    return suggestions.slice(0, 3) // Return top 3 suggestions
  }
}

/**
 * Create chart generator instance
 */
export function createChartGenerator(provider: LLMProvider): ChartGenerator {
  return new ChartGenerator(provider)
}
