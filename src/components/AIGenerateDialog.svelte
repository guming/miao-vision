<script lang="ts">
  import { aiConfigStore } from '@app/stores/ai-config.svelte'
  import { reportStore } from '@app/stores/report.svelte'
  import { ChartGenerator } from '@core/ai/chart-generator'
  import type { AIContext, ChartGenerationResult } from '@core/ai/types'

  interface Props {
    visible: boolean
    onClose: () => void
    onInsert: (content: string) => void
  }

  let { visible, onClose, onInsert }: Props = $props()

  // Form state
  let prompt = $state('')
  let isGenerating = $state(false)
  let result = $state<ChartGenerationResult | null>(null)
  let streamContent = $state('')
  let showSettings = $state(false)
  let apiKey = $state(aiConfigStore.state.configs.deepseek.apiKey || '')

  // Chart generator instance
  let chartGenerator: ChartGenerator | null = null

  // Get available data sources from report
  function getContext(): AIContext {
    const report = reportStore.state.currentReport
    const dataSources: AIContext['dataSources'] = []

    if (report?.blocks) {
      for (let i = 0; i < report.blocks.length; i++) {
        const block = report.blocks[i]
        const sqlResult = block.sqlResult

        // Check for SQL blocks with results (QueryResult uses 'data' not 'rows')
        if (block.type === 'sql' && sqlResult) {
          const rows = sqlResult.data || []
          const columns = sqlResult.columns || (rows.length > 0 ? Object.keys(rows[0]) : [])
          const name = block.metadata?.name || `query_${i + 1}`

          if (Array.isArray(rows) && rows.length > 0) {
            dataSources.push({
              name,
              columns: columns.map((col: string) => ({
                name: col,
                type: inferColumnType(rows[0]?.[col])
              })),
              rowCount: rows.length,
              sample: rows.slice(0, 3)
            })
          }
        }
      }
    }

    return { dataSources }
  }

  // Infer column type from value
  function inferColumnType(value: unknown): string {
    if (value === null || value === undefined) return 'unknown'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
      return 'string'
    }
    return 'unknown'
  }

  // Get chart suggestions
  function getSuggestions() {
    if (!chartGenerator) {
      const provider = aiConfigStore.getProvider()
      chartGenerator = new ChartGenerator(provider)
    }

    const context = getContext()
    return chartGenerator.suggestChartTypes(context)
  }

  // Handle generate
  async function handleGenerate() {
    if (!prompt.trim()) return

    // Check API key
    if (!aiConfigStore.isConfigured()) {
      showSettings = true
      return
    }

    isGenerating = true
    result = null
    streamContent = ''

    try {
      const provider = aiConfigStore.getProvider()
      chartGenerator = new ChartGenerator(provider)

      const context = getContext()

      // Use streaming for preview
      const generator = chartGenerator.generateStream({
        prompt: prompt.trim(),
        context
      })

      for await (const chunk of generator) {
        streamContent = chunk.partial
        if (chunk.done) break
      }

      // Get final result
      result = await chartGenerator.generate({
        prompt: prompt.trim(),
        context
      })
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : '生成失败'
      }
    } finally {
      isGenerating = false
    }
  }

  // Handle insert
  function handleInsert() {
    if (result?.success && result.chartConfig) {
      const chartBlock = '```chart\n' + result.chartConfig + '\n```'
      onInsert(chartBlock)
      handleClose()
    }
  }

  // Handle close
  function handleClose() {
    prompt = ''
    result = null
    streamContent = ''
    showSettings = false
    onClose()
  }

  // Save API key
  function handleSaveApiKey() {
    aiConfigStore.setApiKey(apiKey)
    showSettings = false
  }

  // Handle keyboard
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate()
    }
  }

  // Suggestions
  let suggestions = $derived(getSuggestions())
  let hasDataSources = $derived(getContext().dataSources.length > 0)
</script>

{#if visible}
  <div
    class="dialog-overlay"
    onclick={(e) => e.target === e.currentTarget && handleClose()}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="ai-dialog-title"
  >
    <div class="dialog-container">
      <header class="dialog-header">
        <h2 id="ai-dialog-title">AI 生成图表</h2>
        <button class="close-btn" onclick={handleClose} aria-label="关闭">×</button>
      </header>

      <div class="dialog-body">
        {#if showSettings}
          <!-- API Key Settings -->
          <div class="settings-section">
            <h3>配置 DeepSeek API Key</h3>
            <p class="hint">请输入你的 DeepSeek API Key 以使用 AI 功能</p>
            <input
              type="password"
              class="api-key-input"
              placeholder="sk-..."
              bind:value={apiKey}
            />
            <div class="settings-actions">
              <button class="btn-secondary" onclick={() => showSettings = false}>取消</button>
              <button class="btn-primary" onclick={handleSaveApiKey}>保存</button>
            </div>
          </div>
        {:else}
          <!-- Main content -->
          {#if !hasDataSources}
            <div class="warning-box">
              <span class="warning-icon">⚠️</span>
              <p>当前没有可用的数据源。请先执行 SQL 查询，然后再使用 AI 生成图表。</p>
            </div>
          {:else}
            <!-- Suggestions -->
            {#if suggestions.length > 0 && !result}
              <div class="suggestions">
                <span class="suggestions-label">推荐图表:</span>
                {#each suggestions as suggestion}
                  <button
                    class="suggestion-chip"
                    onclick={() => prompt = `生成一个${suggestion.type}图表`}
                    title={suggestion.reason}
                  >
                    {suggestion.type}
                  </button>
                {/each}
              </div>
            {/if}
          {/if}

          <!-- Prompt input -->
          <div class="prompt-section">
            <label for="ai-prompt">描述你想要的图表</label>
            <textarea
              id="ai-prompt"
              class="prompt-input"
              placeholder="例如：生成一个按月份统计的销售趋势折线图"
              bind:value={prompt}
              disabled={isGenerating}
              rows="3"
            ></textarea>
            <p class="hint">按 Cmd+Enter 生成</p>
          </div>

          <!-- Preview -->
          {#if streamContent || result}
            <div class="preview-section">
              <h3>预览</h3>
              <pre class="preview-content">{result?.chartConfig || streamContent}</pre>

              {#if result && !result.success}
                <div class="error-message">
                  <span class="error-icon">❌</span>
                  {result.error}
                </div>
              {/if}
            </div>
          {/if}
        {/if}
      </div>

      <footer class="dialog-footer">
        {#if !showSettings}
          <button
            class="btn-icon"
            onclick={() => showSettings = true}
            title="设置"
          >
            ⚙️
          </button>
          <div class="footer-spacer"></div>
          <button class="btn-secondary" onclick={handleClose}>取消</button>
          {#if result?.success}
            <button class="btn-primary" onclick={handleInsert}>
              插入图表
            </button>
          {:else}
            <button
              class="btn-primary"
              onclick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !hasDataSources}
            >
              {isGenerating ? '生成中...' : '生成'}
            </button>
          {/if}
        {/if}
      </footer>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
  }

  .dialog-container {
    width: 90%;
    max-width: 560px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #374151;
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #F3F4F6;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dialog-header h2::before {
    content: '✨';
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #9CA3AF;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #F3F4F6;
  }

  .dialog-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .dialog-footer {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid #374151;
  }

  .footer-spacer {
    flex: 1;
  }

  /* Settings */
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .settings-section h3 {
    margin: 0;
    font-size: 1rem;
    color: #F3F4F6;
  }

  .api-key-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    color: #F3F4F6;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
  }

  .api-key-input:focus {
    outline: none;
    border-color: #6366F1;
  }

  .settings-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  /* Warning */
  .warning-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 8px;
  }

  .warning-box p {
    margin: 0;
    font-size: 0.875rem;
    color: #FCD34D;
  }

  /* Suggestions */
  .suggestions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .suggestions-label {
    font-size: 0.875rem;
    color: #9CA3AF;
  }

  .suggestion-chip {
    padding: 0.375rem 0.75rem;
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 9999px;
    color: #A5B4FC;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .suggestion-chip:hover {
    background: rgba(99, 102, 241, 0.25);
    border-color: rgba(99, 102, 241, 0.5);
  }

  /* Prompt */
  .prompt-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .prompt-section label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
  }

  .prompt-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    color: #F3F4F6;
    font-size: 0.9375rem;
    resize: vertical;
    min-height: 80px;
  }

  .prompt-input:focus {
    outline: none;
    border-color: #6366F1;
  }

  .prompt-input::placeholder {
    color: #6B7280;
  }

  .prompt-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .hint {
    font-size: 0.75rem;
    color: #6B7280;
    margin: 0;
  }

  /* Preview */
  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preview-section h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: #9CA3AF;
  }

  .preview-content {
    margin: 0;
    padding: 1rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    color: #10B981;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    white-space: pre-wrap;
    overflow-x: auto;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #FCA5A5;
    font-size: 0.875rem;
  }

  /* Buttons */
  .btn-primary,
  .btn-secondary,
  .btn-icon {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary {
    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
    border: none;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #374151;
    border: 1px solid #4B5563;
    color: #E5E7EB;
  }

  .btn-secondary:hover {
    background: #4B5563;
  }

  .btn-icon {
    width: 36px;
    height: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid #374151;
    color: #9CA3AF;
  }

  .btn-icon:hover {
    background: #374151;
    color: #F3F4F6;
  }
</style>
