<script lang="ts">
  import { tick } from 'svelte'
  import type { Report } from '@/types/report'
  import type { ParsedCodeBlock } from '@/types/report'
  import { parseMarkdown } from '@core/markdown/parser'
  import { blockRenderer } from '@core/engine/block-renderer'
  import type { InputStore } from '@app/stores/report-inputs'

  interface Props {
    report: Report | null
    inputStore?: InputStore | null
    tableMapping?: Map<string, string>
  }

  let { report, inputStore = null, tableMapping }: Props = $props()

  let renderedHTML = $state<string>('')
  let error = $state<string | null>(null)
  let contentContainer = $state<HTMLDivElement | null>(null)
  let chartElements: HTMLElement[] = []
  let isRendering = false  // Prevent concurrent rendering
  let parsedCodeBlocks: ParsedCodeBlock[] = []  // Store parsed code blocks for BigValue
  let lastRenderedReportId = $state<string | null>(null)  // Track report ID for change detection

  // Re-render when report changes or when blocks are updated
  // Wait for contentContainer to be bound before rendering
  $effect(() => {
    if (report && contentContainer) {
      // Track both report and report.blocks to trigger re-render on data changes
      const blocksCount = report.blocks?.length || 0
      const blocksWithResults = report.blocks?.filter(b => b.sqlResult).length || 0
      const blocksWithChartConfig = report.blocks?.filter(b => b.chartConfig).length || 0
      const chartConfigsHash = report.blocks
        ?.filter(b => b.chartConfig)
        .map(b => `${b.id}:${b.chartConfig?.data?.table}`)
        .join(',') || ''
      // Track tableMapping changes to re-render when data sources become available
      const tableMappingSize = tableMapping?.size || 0

      console.log(`🔄 ReportRenderer $effect triggered`)
      console.log(`  Blocks: ${blocksCount}, SQL results: ${blocksWithResults}, Chart configs: ${blocksWithChartConfig}`)
      console.log(`  Chart configs hash: ${chartConfigsHash}`)
      console.log(`  tableMapping size: ${tableMappingSize}`)
      console.log(`  Calling renderReport()...`)

      renderReport()
    } else {
      console.log('$effect: waiting...', {
        hasReport: !!report,
        hasContainer: !!contentContainer
      })
    }
  })

  async function renderReport() {
    if (!report) {
      console.log('renderReport: No report to render')
      return
    }

    // Prevent concurrent rendering
    if (isRendering) {
      console.log('⏸️ renderReport: Already rendering, skipping...')
      return
    }

    // Detect report switch and clear state if needed
    const reportChanged = lastRenderedReportId !== null && lastRenderedReportId !== report.id
    if (reportChanged) {
      console.log(`🔄 Report switched: ${lastRenderedReportId} → ${report.id}`)
      console.log('  Clearing previous render state...')
      renderedHTML = ''
      parsedCodeBlocks = []
      chartElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
      chartElements = []
      if (contentContainer) {
        const markdownContent = contentContainer.querySelector('.markdown-content')
        if (markdownContent) {
          markdownContent.innerHTML = ''
        }
      }
      console.log('  ✅ Previous state cleared')
    }
    lastRenderedReportId = report.id

    isRendering = true
    console.log('📄 renderReport() called for report:', report.id)
    console.log('  Report blocks count:', report.blocks.length)
    console.log('  Report content length:', report.content.length)

    try {
      error = null

      // Use processed content (after conditional processing) if available
      const contentToRender = report.metadata?._processedContent || report.content

      // Parse markdown with variable interpolation
      console.log('  Parsing markdown...')
      const parsed = await parseMarkdown(contentToRender, {
        interpolate: true,
        context: {
          ...report.metadata,
          // Add any computed values here
        }
      })

      // Store HTML and code blocks for markdown content
      renderedHTML = parsed.html
      parsedCodeBlocks = parsed.codeBlocks  // Store for BigValue rendering
      console.log('  ✅ Markdown parsed')
      console.log('  HTML length:', renderedHTML.length)
      console.log('  Parsed code blocks:', parsedCodeBlocks.length)
      console.log('  Total blocks in report.blocks:', report.blocks.length)

      // Wait for DOM to update, then mount blocks to placeholders
      console.log('  Waiting for DOM update (tick)...')
      await tick()
      console.log('  ✅ DOM updated')

      // IMPORTANT: Directly set innerHTML instead of relying on {@html}
      // because Svelte's {@html} may sanitize or modify the content
      console.log('  contentContainer exists:', !!contentContainer)
      if (!contentContainer) {
        console.warn('  ⚠️ contentContainer is null, waiting for next tick...')
        await tick()
        console.log('  After tick, contentContainer exists:', !!contentContainer)
      }

      if (contentContainer) {
        const markdownContent = contentContainer.querySelector('.markdown-content')
        console.log('  markdownContent found:', !!markdownContent)

        if (markdownContent) {
          console.log('  Setting innerHTML directly...')
          markdownContent.innerHTML = renderedHTML
          console.log('  ✅ innerHTML set directly')
          console.log('  New innerHTML length:', markdownContent.innerHTML.length)

          // Wait for DOM update after setting innerHTML
          await tick()
          console.log('  ✅ DOM updated after innerHTML set')
        } else {
          console.error('  ❌ markdownContent element not found!')
        }
      } else {
        console.error('  ❌ contentContainer is still null!')
      }

      console.log('  Calling mountBlocksToPlaceholders()')
      await mountBlocksToPlaceholders()
      console.log('  ✅ mountBlocksToPlaceholders() completed')
    } catch (err) {
      console.error('❌ Failed to render report:', err)
      error = err instanceof Error ? err.message : 'Failed to render report'
    } finally {
      isRendering = false
      console.log('  ✅ renderReport() completed, isRendering reset')
    }
  }

  /**
   * Mount SQL results and components to placeholder divs
   * Uses unified BlockRenderer for all block types
   */
  async function mountBlocksToPlaceholders() {
    if (!contentContainer || !report) {
      console.log('mountBlocksToPlaceholders: No container or report')
      return
    }

    console.log('  tableMapping available:', tableMapping ? `${tableMapping.size} entries` : 'none')
    if (tableMapping && tableMapping.size > 0) {
      console.log('  tableMapping contents:', Object.fromEntries(tableMapping))
    }

    await blockRenderer.mountBlocks(contentContainer, {
      report,
      parsedBlocks: parsedCodeBlocks,
      inputStore,
      chartElements,
      tableMapping
    })
  }


  // Cleanup chart elements on unmount
  $effect(() => {
    return () => {
      // Only remove DOM elements on unmount, don't drop tables
      console.log('🧹 Unmounting: removing chart elements')
      chartElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
      chartElements = []
    }
  })
</script>

<div class="report-renderer">
  {#if error}
    <div class="error-banner">
      <strong>⚠ Rendering Error</strong>
      <p>{error}</p>
    </div>
  {/if}

  {#if !report}
    <div class="empty-state">
      <p>No report selected</p>
      <p class="hint">Create a new report or select one from the list</p>
    </div>
  {:else}
    <div class="report-content" bind:this={contentContainer}>
      <!-- Render markdown content with embedded placeholders -->
      <!-- Note: HTML is set directly via JavaScript to avoid Svelte sanitization -->
      <div class="markdown-content"></div>
    </div>
  {/if}
</div>

<style>
  .report-renderer {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 2rem;
    /* 滚动性能优化 */
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  /* 智能渲染优化已移除 */
  /* content-visibility 会影响 vgplot/Mosaic 的表查询时机 */
  /* 在不影响图表的情况下，其他滚动优化已经足够 */

  .error-banner {
    padding: 1.5rem;
    background-color: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .error-banner strong {
    display: block;
    font-size: 1.1rem;
    color: #fca5a5;
    margin-bottom: 0.5rem;
  }

  .error-banner p {
    margin: 0;
    opacity: 0.9;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    opacity: 0.6;
    color: #D1D5DB;
  }

  .empty-state p {
    margin: 0.5rem 0;
    color: #D1D5DB;
  }

  .empty-state .hint {
    font-size: 0.9rem;
    opacity: 0.7;
  }

  .report-content {
    max-width: 900px;
    margin: 0 auto;
  }

  /* Markdown content styling */
  .markdown-content {
    line-height: 1.6;
    margin-bottom: 2rem;
    color: #F3F4F6;
  }

  .markdown-content :global(h1) {
    font-size: 2rem;
    margin: 2rem 0 1rem 0;
    border-bottom: 2px solid #374151;
    padding-bottom: 0.5rem;
    color: #F3F4F6;
  }

  .markdown-content :global(h2) {
    font-size: 1.5rem;
    margin: 1.5rem 0 0.75rem 0;
    color: #F3F4F6;
  }

  .markdown-content :global(h3) {
    font-size: 1.25rem;
    margin: 1.25rem 0 0.5rem 0;
    color: #F3F4F6;
  }

  .markdown-content :global(p) {
    margin: 0.75rem 0;
    color: #E5E7EB;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin: 0.75rem 0;
    padding-left: 2rem;
    color: #E5E7EB;
  }

  .markdown-content :global(code) {
    background-color: #1F2937;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    color: #F3F4F6;
  }

  .markdown-content :global(pre) {
    background-color: #111827;
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1rem 0;
  }

  .markdown-content :global(pre code) {
    background: none;
    padding: 0;
    color: #F3F4F6;
  }

  .markdown-content :global(blockquote) {
    border-left: 4px solid rgba(102, 126, 234, 0.5);
    padding-left: 1rem;
    margin: 1rem 0;
    opacity: 0.9;
    color: #D1D5DB;
  }

  /* Block placeholders (before mounting) */
  :global(.block-placeholder) {
    min-height: 80px;
    margin: 2rem 0;
    padding: 1.5rem;
    background-color: rgba(102, 126, 234, 0.05);
    border: 2px dashed rgba(102, 126, 234, 0.3);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.6);
  }

  :global(.block-placeholder span) {
    display: block;
    text-align: center;
  }

  /* These are fallbacks if innerHTML is not set */
  :global(.block-placeholder-sql:empty::before) {
    content: '📊 SQL query placeholder';
    color: rgba(255, 255, 255, 0.6);
  }

  :global(.block-placeholder-chart:empty::before) {
    content: '📈 Chart placeholder';
    color: rgba(255, 255, 255, 0.6);
  }

  /* SQL result blocks */
  :global(.sql-result-block) {
    margin: 2rem 0;
    border: 1px solid #4B5563;
    border-radius: 8px;
    overflow: hidden;
  }

  :global(.block-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: #1F2937;
    border-bottom: 1px solid #4B5563;
  }

  :global(.block-label) {
    font-weight: 500;
    font-size: 0.9rem;
    color: #F3F4F6;
  }

  :global(.execution-time) {
    font-size: 0.85rem;
    opacity: 0.7;
    color: #D1D5DB;
  }

  :global(.block-error) {
    padding: 1rem;
    background-color: rgba(220, 38, 38, 0.1);
    color: #fca5a5;
    margin: 2rem 0;
    border-radius: 8px;
    border: 1px solid rgba(220, 38, 38, 0.3);
  }

  :global(.result-table-wrapper) {
    overflow-x: auto;
  }

  :global(.result-table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  :global(.result-table thead) {
    background-color: #1F2937;
  }

  :global(.result-table th) {
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #4B5563;
    color: #F3F4F6;
  }

  :global(.result-table td) {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #374151;
    color: #E5E7EB;
  }

  :global(.result-table tbody tr:hover) {
    background: linear-gradient(135deg, rgba(66, 133, 244, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%);
  }

  :global(.table-footer) {
    padding: 0.5rem 1rem;
    text-align: right;
    font-size: 0.85rem;
    color: #9CA3AF;
    margin: 0;
    background-color: #1F2937;
  }

  /* Chart blocks */
  :global(.chart-block) {
    margin: 2rem 0;
    padding: 1.5rem;
    background-color: #1F2937;
    border-radius: 8px;
    border: 1px solid #4B5563;
  }

  /* BigValue cards */
  :global(.bigvalue-card) {
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    min-width: 200px;
    margin: 2rem auto;
    max-width: 400px;
  }

  :global(.bigvalue-title) {
    font-size: 0.875rem;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  :global(.bigvalue-value) {
    font-size: 3rem;
    font-weight: 600;
    color: #F3F4F6;
    line-height: 1.2;
    margin: 0.5rem 0;
  }

  :global(.bigvalue-comparison) {
    font-size: 0.875rem;
    margin-top: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    font-weight: 500;
  }

  :global(.trend-icon) {
    font-size: 1rem;
    font-weight: bold;
  }

  :global(.trend-percent) {
    font-weight: 600;
  }

  :global(.trend-label) {
    opacity: 0.8;
    margin-left: 0.25rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .report-renderer {
      padding: 1rem;
    }

    .report-content {
      max-width: 100%;
    }
  }
</style>
