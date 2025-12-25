<script lang="ts">
/**
 * Snippet Card Component
 *
 * Displays a single SQL snippet with preview and actions.
 * Supports insert, favorite, and delete operations.
 *
 * Design:
 * - Compact card layout
 * - Syntax-highlighted SQL preview
 * - Quick actions (insert, favorite, delete)
 * - Shows metadata (category, tags, usage count)
 *
 * @module components/sql-workspace/snippets/SnippetCard
 */

import type { SQLSnippet } from '@/types/snippet'
import { substituteParameters } from '@/types/snippet'

interface Props {
  snippet: SQLSnippet
  onInsert: (paramValues: Record<string, string>) => void
  onToggleFavorite: () => void
  onDelete?: () => void
}

let { snippet, onInsert, onToggleFavorite, onDelete }: Props = $props()

// State
let isExpanded = $state(false)
let showParameterDialog = $state(false)
let parameterValues = $state<Record<string, string>>({})

// Category display names and emojis
const categoryInfo: Record<string, { label: string, emoji: string, color: string }> = {
  'time-series': { label: 'Time Series', emoji: '📈', color: '#4285F4' },
  'window-function': { label: 'Window Func', emoji: '🪟', color: '#8B5CF6' },
  'aggregation': { label: 'Aggregation', emoji: '📊', color: '#10B981' },
  'data-quality': { label: 'Data Quality', emoji: '✅', color: '#22C55E' },
  'statistical': { label: 'Statistical', emoji: '📐', color: '#F59E0B' },
  'date-manipulation': { label: 'Date Func', emoji: '📅', color: '#06B6D4' },
  'cohort': { label: 'Cohort', emoji: '👥', color: '#EC4899' },
  'joins': { label: 'Joins', emoji: '🔗', color: '#84CC16' },
  'formatting': { label: 'Formatting', emoji: '✨', color: '#A78BFA' },
  'custom': { label: 'Custom', emoji: '⚙️', color: '#6B7280' }
}

const catInfo = $derived(categoryInfo[snippet.category] || categoryInfo.custom)

/**
 * Handle insert click
 */
function handleInsertClick() {
  // If snippet has parameters, show parameter dialog
  if (snippet.parameters.length > 0) {
    // Initialize parameter values with defaults
    parameterValues = snippet.parameters.reduce((acc, param) => {
      acc[param.name] = param.defaultValue || ''
      return acc
    }, {} as Record<string, string>)
    showParameterDialog = true
  } else {
    // No parameters, insert directly
    onInsert({})
  }
}

/**
 * Handle parameter submission
 */
function handleParameterSubmit() {
  onInsert(parameterValues)
  showParameterDialog = false
}

/**
 * Get SQL preview (truncated if too long)
 */
const sqlPreview = $derived.by(() => {
  const maxLength = isExpanded ? 500 : 150
  const sql = snippet.template.trim()
  if (sql.length <= maxLength) return sql
  return sql.substring(0, maxLength) + '...'
})

/**
 * Format usage count
 */
const usageText = $derived.by(() => {
  const count = snippet.usageCount
  if (count === 0) return 'Never used'
  if (count === 1) return 'Used once'
  return `Used ${count} times`
})
</script>

<article class="snippet-card" role="listitem">
  <div class="card-header">
    <div class="header-left">
      <h3 class="snippet-name">{snippet.name}</h3>
      {#if snippet.trigger}
        <code class="trigger-badge" title="Type this + Tab to expand">{snippet.trigger}</code>
      {/if}
      {#if snippet.isBuiltIn}
        <span class="builtin-badge" title="Built-in snippet">Built-in</span>
      {/if}
    </div>

    <div class="header-actions">
      <button
        class="action-icon"
        class:favorited={snippet.isFavorite}
        onclick={onToggleFavorite}
        title={snippet.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {snippet.isFavorite ? '⭐' : '☆'}
      </button>

      {#if onDelete}
        <button class="action-icon delete" onclick={onDelete} title="Delete snippet">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <p class="snippet-description">{snippet.description}</p>

  <div class="snippet-meta">
    <span class="category-badge" style="border-color: {catInfo.color}; color: {catInfo.color}">
      {catInfo.emoji} {catInfo.label}
    </span>

    {#if snippet.tags.length > 0}
      <div class="tags">
        {#each snippet.tags.slice(0, 3) as tag}
          <span class="tag">#{tag}</span>
        {/each}
        {#if snippet.tags.length > 3}
          <span class="tag">+{snippet.tags.length - 3}</span>
        {/if}
      </div>
    {/if}

    <span class="usage-info">{usageText}</span>
  </div>

  {#if snippet.parameters.length > 0}
    <div class="parameters-info">
      <span class="param-label">Parameters:</span>
      {#each snippet.parameters as param}
        <code class="param-name" title={param.description}>
          ${param.name}{param.required ? '*' : ''}
        </code>
      {/each}
    </div>
  {/if}

  <div class="sql-preview-container">
    <button
      class="expand-toggle"
      onclick={() => isExpanded = !isExpanded}
      title={isExpanded ? 'Show less' : 'Show more'}
    >
      {isExpanded ? '▼' : '▶'}
    </button>
    <pre class="sql-preview" class:expanded={isExpanded}><code>{sqlPreview}</code></pre>
  </div>

  <div class="card-footer">
    <button class="btn-insert" onclick={handleInsertClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Insert Snippet
    </button>
  </div>
</article>

<!-- Parameter Dialog -->
{#if showParameterDialog}
  <div class="dialog-overlay" onclick={(e) => e.target === e.currentTarget && (showParameterDialog = false)}>
    <div class="dialog-container">
      <header class="dialog-header">
        <h3>Fill in Parameters</h3>
        <button class="dialog-close" onclick={() => showParameterDialog = false}>×</button>
      </header>

      <div class="dialog-body">
        <p class="dialog-hint">Provide values for the following parameters:</p>

        <form class="param-form" onsubmit={(e) => { e.preventDefault(); handleParameterSubmit() }}>
          {#each snippet.parameters as param}
            <div class="form-field">
              <label for="param-{param.name}">
                {param.name}
                {#if param.required}
                  <span class="required">*</span>
                {/if}
              </label>
              {#if param.description}
                <span class="field-hint">{param.description}</span>
              {/if}
              <input
                id="param-{param.name}"
                type="text"
                bind:value={parameterValues[param.name]}
                placeholder={param.placeholder || ''}
                required={param.required}
                pattern={param.pattern}
              />
              {#if param.validationMessage && parameterValues[param.name] && param.pattern && !new RegExp(param.pattern).test(parameterValues[param.name])}
                <span class="field-error">{param.validationMessage}</span>
              {/if}
            </div>
          {/each}

          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick={() => showParameterDialog = false}>
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .snippet-card {
    padding: 1rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    margin-bottom: 1rem;
    transition: all 0.2s;
  }

  .snippet-card:hover {
    border-color: #4B5563;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  /* Header */
  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
  }

  .snippet-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .trigger-badge {
    padding: 0.125rem 0.5rem;
    background: rgba(66, 133, 244, 0.15);
    border: 1px solid rgba(66, 133, 244, 0.3);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: #93C5FD;
  }

  .builtin-badge {
    padding: 0.125rem 0.5rem;
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 4px;
    font-size: 0.6875rem;
    font-weight: 500;
    color: #C4B5FD;
  }

  .header-actions {
    display: flex;
    gap: 0.375rem;
  }

  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: #374151;
    border: 1px solid #4B5563;
    border-radius: 6px;
    font-size: 1.125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .action-icon:hover {
    background: #4B5563;
  }

  .action-icon.favorited {
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.3);
  }

  .action-icon.delete {
    color: #9CA3AF;
  }

  .action-icon.delete:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #FCA5A5;
  }

  /* Description */
  .snippet-description {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #D1D5DB;
  }

  /* Meta */
  .snippet-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .category-badge {
    padding: 0.25rem 0.625rem;
    background: rgba(31, 41, 55, 0.5);
    border: 1px solid;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .tags {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .tag {
    padding: 0.125rem 0.5rem;
    background: #374151;
    border-radius: 4px;
    font-size: 0.6875rem;
    color: #9CA3AF;
  }

  .usage-info {
    margin-left: auto;
    font-size: 0.75rem;
    color: #6B7280;
  }

  /* Parameters */
  .parameters-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 6px;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .param-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #93C5FD;
  }

  .param-name {
    padding: 0.125rem 0.5rem;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.25);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: #BFDBFE;
  }

  /* SQL Preview */
  .sql-preview-container {
    position: relative;
    margin-bottom: 0.75rem;
  }

  .expand-toggle {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 24px;
    height: 24px;
    padding: 0;
    background: #374151;
    border: 1px solid #4B5563;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    z-index: 1;
  }

  .expand-toggle:hover {
    background: #4B5563;
    color: #F3F4F6;
  }

  .sql-preview {
    margin: 0;
    padding: 0.75rem 2.5rem 0.75rem 0.75rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    color: #E5E7EB;
    overflow: hidden;
    max-height: 120px;
    transition: max-height 0.3s ease;
  }

  .sql-preview.expanded {
    max-height: 600px;
  }

  .sql-preview code {
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* Footer */
  .card-footer {
    display: flex;
    justify-content: flex-end;
  }

  .btn-insert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-insert:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
  }

  /* Parameter Dialog */
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  .dialog-container {
    width: 100%;
    max-width: 500px;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.2s ease;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #374151;
  }

  .dialog-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .dialog-close {
    width: 32px;
    height: 32px;
    padding: 0;
    background: none;
    border: none;
    color: #9CA3AF;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    transition: color 0.15s;
  }

  .dialog-close:hover {
    color: #F3F4F6;
  }

  .dialog-body {
    padding: 1.5rem;
  }

  .dialog-hint {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: #9CA3AF;
  }

  .param-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-field label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #E5E7EB;
  }

  .required {
    color: #EF4444;
  }

  .field-hint {
    font-size: 0.75rem;
    color: #6B7280;
  }

  .form-field input {
    padding: 0.625rem 0.875rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #F3F4F6;
    font-size: 0.875rem;
    font-family: 'JetBrains Mono', monospace;
    transition: border-color 0.15s;
  }

  .form-field input:focus {
    outline: none;
    border-color: #4285F4;
  }

  .form-field input::placeholder {
    color: #6B7280;
  }

  .field-error {
    font-size: 0.75rem;
    color: #FCA5A5;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .btn-secondary,
  .btn-primary {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-secondary {
    background: #374151;
    color: #D1D5DB;
  }

  .btn-secondary:hover {
    background: #4B5563;
    color: #F3F4F6;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    color: white;
  }

  .btn-primary:hover {
    opacity: 0.9;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .snippet-card {
      padding: 0.875rem;
    }

    .header-left {
      flex-direction: column;
      align-items: flex-start;
    }

    .snippet-meta {
      flex-direction: column;
      align-items: flex-start;
    }

    .usage-info {
      margin-left: 0;
    }
  }
</style>
