/**
 * Block Renderer
 *
 * Unified renderer for all block types in reports
 * Handles mounting blocks to DOM placeholders
 */

import type { Report, ReportBlock, ParsedCodeBlock } from '@/types/report'
import type { InputStore } from '@app/stores/report-inputs'
import { get } from 'svelte/store'
import { componentRegistry } from '@core/registry'
import { placeholderFactory } from '@core/registry'

/**
 * Render context for blocks
 */
export interface BlockRenderContext {
  report: Report
  parsedBlocks: ParsedCodeBlock[]
  inputStore: InputStore | null
  chartElements: HTMLElement[]
  tableMapping?: Map<string, string>
}

/**
 * Block Renderer
 * Handles mounting all types of blocks to the DOM
 */
export class BlockRenderer {
  /**
   * Mount all blocks to their placeholders
   */
  async mountBlocks(
    container: HTMLElement,
    context: BlockRenderContext
  ): Promise<void> {
    console.log('📌 BlockRenderer: Mounting blocks to placeholders...')

    // Remove old chart DOM elements
    if (context.chartElements.length > 0) {
      console.log(`  Removing ${context.chartElements.length} old chart elements from DOM...`)
      context.chartElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
      context.chartElements.length = 0
      console.log('  ✅ Chart elements removed')
    }

    // Find all placeholders in the rendered content
    const markdownContent = container.querySelector('.markdown-content')
    const placeholders = markdownContent?.querySelectorAll('.block-placeholder') || []

    console.log(`Found ${placeholders.length} placeholders to process`)

    for (const placeholder of Array.from(placeholders)) {
      const blockId = placeholder.getAttribute('data-block-id')
      const blockType = placeholder.getAttribute('data-block-type')

      if (!blockId || !blockType) {
        console.log('  ⚠️ Placeholder missing blockId or blockType, skipping')
        continue
      }

      console.log(`\n🔧 Processing ${blockType} block: ${blockId}`)

      // Find corresponding block in report.blocks
      const block = context.report.blocks.find(b => b.id === blockId)

      // Special case: SQL result tables (not using ComponentRegistry)
      if (blockType === 'sql') {
        this.mountSQLBlock(placeholder, block)
        continue
      }

      // Get component registration from ComponentRegistry
      const registration = componentRegistry.get(blockType)

      if (!registration) {
        // Block type not registered - show placeholder
        this.handleUnregisteredBlock(placeholder, block, blockId, blockType)
        continue
      }

      // Mount component using ComponentRegistry
      await this.mountComponent(
        placeholder,
        blockId,
        blockType,
        registration,
        block,
        context
      )
    }
  }

  /**
   * Mount SQL result table
   */
  private mountSQLBlock(placeholder: Element, block: ReportBlock | undefined): void {
    if (!block) return

    if (block.sqlResult) {
      const tableHTML = this.generateSQLResultHTML(block)
      placeholder.outerHTML = tableHTML
      console.log(`  ✅ SQL table mounted with ${block.sqlResult.rowCount} rows`)
    } else if (block.status === 'executing') {
      if (placeholder instanceof HTMLElement) {
        placeholder.innerHTML = '<span>⏳ Executing query...</span>'
      }
    } else {
      console.log(`  SQL block has no result yet`)
    }
  }

  /**
   * Handle unregistered block types
   */
  private handleUnregisteredBlock(
    placeholder: Element,
    block: ReportBlock | undefined,
    blockId: string,
    blockType: string
  ): void {
    if (!block) {
      console.log(`  Block ${blockId} not found and type "${blockType}" not registered`)
      if (placeholder instanceof HTMLElement) {
        placeholder.innerHTML = placeholderFactory.pendingHTML(blockType)
      }
    } else if (block.error) {
      placeholder.outerHTML = placeholderFactory.errorHTML(block.error, blockType)
    }
  }

  /**
   * Mount a component using ComponentRegistry
   */
  private async mountComponent(
    placeholder: Element,
    blockId: string,
    blockType: string,
    registration: any,
    block: ReportBlock | undefined,
    context: BlockRenderContext
  ): Promise<void> {
    // Find the parsed block from markdown
    const parsedBlock = context.parsedBlocks.find(cb => cb.id === blockId)

    if (!parsedBlock) {
      console.log(`  Parsed block not found for ${blockId}`)
      if (placeholder instanceof HTMLElement) {
        placeholder.innerHTML = placeholderFactory.pendingHTML(blockType)
      }
      return
    }

    // Check if chart needs to be executed first
    const chartTypes = ['chart', 'histogram', 'line', 'area', 'bar', 'scatter', 'pie']
    if (chartTypes.includes(blockType) && block) {
      if (block.status !== 'success') {
        console.log(`  ⏸️ Chart not executed yet (status: ${block.status})`)
        this.mountChartPlaceholder(placeholder)
        return
      }
    }

    try {
      // Create render context
      const renderContext = {
        blocks: context.report.blocks,
        inputs: context.inputStore ? get(context.inputStore) : {},
        metadata: context.report.metadata,
        inputStore: context.inputStore,
        tableMapping: context.tableMapping || new Map()
      }

      console.log(`  Calling parser for ${blockType}...`)
      // Parse block - for charts, this includes chartConfig if available
      const props = registration.parser(parsedBlock, renderContext)

      // For charts with pre-built config in block.chartConfig, use that
      if (chartTypes.includes(blockType) && block?.chartConfig) {
        props.chartConfig = block.chartConfig
      }

      // Handle case where parser returns null (data dependencies not available)
      if (!props) {
        console.log(`  ⏸️ ${blockType} data not available yet (parser returned null)`)
        this.mountComponentPlaceholder(placeholder, blockType)
        return
      }

      console.log(`  Creating container and calling renderer...`)
      // Create container
      const containerElement = document.createElement('div')
      if (chartTypes.includes(blockType)) {
        containerElement.className = 'chart-block'
        containerElement.id = `chart-${blockId}`
      }

      // Render component
      await registration.renderer(containerElement, props, renderContext)

      // Track chart containers for cleanup
      if (chartTypes.includes(blockType)) {
        context.chartElements.push(containerElement)
      }

      // Replace placeholder with rendered component
      placeholder.replaceWith(containerElement)
      console.log(`  ✅ ${blockType} mounted successfully`)
    } catch (err) {
      console.error(`  ❌ Failed to mount ${blockType}:`, err)
      if (placeholder instanceof HTMLElement) {
        placeholder.outerHTML = placeholderFactory.errorHTML(
          err instanceof Error ? err.message : 'Failed to render',
          blockType
        )
      }
    }
  }

  /**
   * Mount chart placeholder for unexecuted charts
   */
  private mountChartPlaceholder(placeholder: Element): void {
    const chartContainer = document.createElement('div')
    chartContainer.className = 'chart-block'
    chartContainer.innerHTML = placeholderFactory.chartHTML()
    placeholder.replaceWith(chartContainer)
  }

  /**
   * Mount component placeholder for components whose data isn't available
   */
  private mountComponentPlaceholder(placeholder: Element, componentType: string): void {
    const container = document.createElement('div')
    container.innerHTML = placeholderFactory.pendingHTML(componentType)
    placeholder.replaceWith(container)
  }

  /**
   * Generate HTML for SQL result table
   */
  private generateSQLResultHTML(block: ReportBlock): string {
    if (!block.sqlResult) return ''

    const { columns, data, rowCount } = block.sqlResult
    const displayRows = data.slice(0, 100)

    const headerRow = columns.map(col => `<th>${col}</th>`).join('')
    const bodyRows = displayRows.map(row => {
      const cells = columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('')

    const footerText = rowCount > 100
      ? `Showing 100 of ${rowCount} rows`
      : `${rowCount} rows`

    return `
      <div class="sql-result-block" id="result-${block.id}">
        <div class="block-header">
          <span class="block-label">📊 Query Result</span>
          ${block.executionTime ? `<span class="execution-time">${block.executionTime}ms</span>` : ''}
        </div>
        <div class="result-table-wrapper">
          <table class="result-table">
            <thead>
              <tr>${headerRow}</tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>
          <p class="table-footer">${footerText}</p>
        </div>
      </div>
    `
  }
}

/**
 * Singleton instance
 */
export const blockRenderer = new BlockRenderer()
