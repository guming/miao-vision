<script lang="ts">
  import type { SQLSnippet, SnippetParameter, SnippetCategory } from '@/types/snippet'
  import { validateSnippet, extractParameterNames, substituteParameters } from '@/types/snippet'

  interface Props {
    snippet?: SQLSnippet // If editing existing snippet
    isOpen: boolean
    onClose: () => void
    onSave: (snippet: Omit<SQLSnippet, 'id' | 'createdAt' | 'lastModified' | 'usageCount' | 'isBuiltIn'>) => void
  }

  let { snippet, isOpen, onClose, onSave }: Props = $props()

  // Form state
  let name = $state('')
  let description = $state('')
  let category = $state<SnippetCategory>('custom')
  let tags = $state<string[]>([])
  let tagInput = $state('')
  let trigger = $state('')
  let template = $state('')
  let parameters = $state<SnippetParameter[]>([])
  let isFavorite = $state(false)

  // Preview state
  let previewValues = $state<Record<string, string>>({})

  // Validation
  let errors = $state<string[]>([])
  let warnings = $state<string[]>([])

  // Categories for dropdown
  const categories: Array<{ value: SnippetCategory; label: string; icon: string }> = [
    { value: 'custom', label: 'Custom', icon: '⭐' },
    { value: 'time-series', label: 'Time Series', icon: '📈' },
    { value: 'aggregation', label: 'Aggregation', icon: '∑' },
    { value: 'window-function', label: 'Window Function', icon: '🪟' },
    { value: 'cohort', label: 'Cohort', icon: '👥' },
    { value: 'statistical', label: 'Statistical', icon: '📊' },
    { value: 'joins', label: 'Joins', icon: '🔗' },
    { value: 'date-manipulation', label: 'Date Manipulation', icon: '📅' },
    { value: 'data-quality', label: 'Data Quality', icon: '✓' },
    { value: 'formatting', label: 'Formatting', icon: '🎨' }
  ]

  // Parameter types for dropdown
  const parameterTypes: Array<{ value: string; label: string }> = [
    { value: 'string', label: 'String (text)' },
    { value: 'number', label: 'Number' },
    { value: 'column', label: 'Column name' },
    { value: 'table', label: 'Table name' },
    { value: 'date', label: 'Date' },
    { value: 'enum', label: 'Enum (options)' }
  ]

  // Initialize form from snippet (if editing)
  $effect(() => {
    if (snippet && isOpen) {
      name = snippet.name
      description = snippet.description
      category = snippet.category
      tags = [...snippet.tags]
      trigger = snippet.trigger || ''
      template = snippet.template
      parameters = snippet.parameters.map(p => ({ ...p }))
      isFavorite = snippet.isFavorite

      // Initialize preview values
      previewValues = {}
      for (const param of parameters) {
        previewValues[param.name] = param.placeholder || param.defaultValue || `<${param.name}>`
      }
    } else if (isOpen && !snippet) {
      // Reset form for new snippet
      resetForm()
    }
  })

  function resetForm() {
    name = ''
    description = ''
    category = 'custom'
    tags = []
    tagInput = ''
    trigger = ''
    template = ''
    parameters = []
    isFavorite = false
    previewValues = {}
    errors = []
    warnings = []
  }

  // Auto-detect parameters from template
  function autoDetectParameters() {
    const paramNames = extractParameterNames(template)
    const existingNames = new Set(parameters.map(p => p.name))

    for (const paramName of paramNames) {
      if (!existingNames.has(paramName)) {
        addParameter(paramName)
      }
    }

    // Remove parameters that are no longer in template
    parameters = parameters.filter(p => paramNames.includes(p.name))
  }

  // Add a new parameter
  function addParameter(name = '') {
    const newParam: SnippetParameter = {
      name: name || `param${parameters.length + 1}`,
      description: '',
      type: 'string',
      required: true
    }
    parameters = [...parameters, newParam]
    previewValues[newParam.name] = `<${newParam.name}>`
  }

  // Remove parameter
  function removeParameter(index: number) {
    const param = parameters[index]
    delete previewValues[param.name]
    parameters = parameters.filter((_, i) => i !== index)
  }

  // Update parameter
  function updateParameter(index: number, updates: Partial<SnippetParameter>) {
    const oldName = parameters[index].name
    parameters[index] = { ...parameters[index], ...updates }

    // Update preview values if name changed
    if (updates.name && updates.name !== oldName) {
      previewValues[updates.name] = previewValues[oldName] || `<${updates.name}>`
      delete previewValues[oldName]
    }
  }

  // Add tag
  function addTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      tags = [...tags, tag]
      tagInput = ''
    }
  }

  // Remove tag
  function removeTag(tag: string) {
    tags = tags.filter(t => t !== tag)
  }

  // Validate form
  function validate(): boolean {
    errors = []
    warnings = []

    if (!name.trim()) {
      errors.push('Snippet name is required')
    }

    if (!template.trim()) {
      errors.push('SQL template is required')
    }

    if (!description.trim()) {
      warnings.push('Description is recommended for clarity')
    }

    // Validate using snippet validation function
    const mockSnippet: SQLSnippet = {
      id: 'temp',
      name,
      description,
      category,
      tags,
      template,
      parameters,
      trigger: trigger || undefined,
      isBuiltIn: false,
      isFavorite,
      usageCount: 0,
      createdAt: new Date(),
      lastModified: new Date()
    }

    const result = validateSnippet(mockSnippet)
    errors = [...errors, ...result.errors.filter(e => e.severity === 'error').map(e => e.message)]
    warnings = [...warnings, ...result.errors.filter(e => e.severity === 'warning').map(e => e.message)]

    return errors.length === 0
  }

  // Save snippet
  function handleSave() {
    if (!validate()) {
      return
    }

    onSave({
      name,
      description,
      category,
      tags,
      template,
      parameters,
      trigger: trigger || undefined,
      isFavorite
    })

    onClose()
  }

  // Handle keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  // Preview SQL
  const previewSQL = $derived.by(() => {
    if (!template) return ''
    try {
      return substituteParameters(template, previewValues)
    } catch {
      return template
    }
  })
</script>

{#if isOpen}
  <div class="editor-overlay" onclick={onClose} onkeydown={handleKeydown} role="presentation">
    <div class="editor-dialog" onclick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="editor-title">
      <!-- Header -->
      <div class="editor-header">
        <h2 id="editor-title">
          {snippet ? 'Edit Snippet' : 'Create Custom Snippet'}
        </h2>
        <button class="close-btn" onclick={onClose} title="Close (Esc)">×</button>
      </div>

      <!-- Content -->
      <div class="editor-content">
        <!-- Left: Form -->
        <div class="editor-form">
          <div class="form-section">
            <h3>Basic Information</h3>

            <div class="form-field">
              <label for="snippet-name">Name *</label>
              <input
                id="snippet-name"
                type="text"
                class="form-input"
                placeholder="e.g., My Custom Query"
                bind:value={name}
              />
            </div>

            <div class="form-field">
              <label for="snippet-description">Description</label>
              <textarea
                id="snippet-description"
                class="form-textarea"
                rows="2"
                placeholder="What does this snippet do?"
                bind:value={description}
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="snippet-category">Category</label>
                <select id="snippet-category" class="form-select" bind:value={category}>
                  {#each categories as cat}
                    <option value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  {/each}
                </select>
              </div>

              <div class="form-field">
                <label for="snippet-trigger">Trigger Word</label>
                <input
                  id="snippet-trigger"
                  type="text"
                  class="form-input"
                  placeholder="e.g., mycustom"
                  bind:value={trigger}
                />
                <small>Optional shortcut for autocomplete</small>
              </div>
            </div>

            <div class="form-field">
              <label for="tag-input">Tags</label>
              <div class="tag-input-wrapper">
                <input
                  id="tag-input"
                  type="text"
                  class="form-input"
                  placeholder="Add tag and press Enter"
                  bind:value={tagInput}
                  onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <button type="button" class="add-tag-btn" onclick={addTag}>Add</button>
              </div>
              {#if tags.length > 0}
                <div class="tag-list">
                  {#each tags as tag}
                    <span class="tag">
                      {tag}
                      <button type="button" onclick={() => removeTag(tag)}>×</button>
                    </span>
                  {/each}
                </div>
              {/if}
            </div>

            <div class="form-field">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={isFavorite} />
                Mark as favorite
              </label>
            </div>
          </div>

          <div class="form-section">
            <h3>SQL Template *</h3>
            <textarea
              class="template-editor"
              rows="8"
              placeholder="SELECT ${column} FROM ${table} WHERE ..."
              bind:value={template}
              onblur={autoDetectParameters}
            ></textarea>
            <small>Use ${'{'}paramName{'}'} for parameters</small>
            <button type="button" class="detect-btn" onclick={autoDetectParameters}>
              🔍 Auto-detect Parameters
            </button>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3>Parameters ({parameters.length})</h3>
              <button type="button" class="add-param-btn" onclick={() => addParameter()}>
                + Add Parameter
              </button>
            </div>

            {#if parameters.length === 0}
              <div class="empty-params">
                No parameters yet. Add ${'{'}paramName{'}'} in the template or click "Add Parameter".
              </div>
            {:else}
              <div class="params-list">
                {#each parameters as param, i (i)}
                  <div class="param-item">
                    <div class="param-header">
                      <span class="param-number">#{i + 1}</span>
                      <input
                        type="text"
                        class="param-name-input"
                        placeholder="Parameter name"
                        value={param.name}
                        oninput={(e) => updateParameter(i, { name: e.currentTarget.value })}
                      />
                      <button type="button" class="remove-param-btn" onclick={() => removeParameter(i)}>
                        ×
                      </button>
                    </div>

                    <div class="param-fields">
                      <input
                        type="text"
                        class="form-input"
                        placeholder="Description"
                        value={param.description}
                        oninput={(e) => updateParameter(i, { description: e.currentTarget.value })}
                      />

                      <select
                        class="form-select"
                        value={param.type}
                        onchange={(e) => updateParameter(i, { type: e.currentTarget.value as any })}
                      >
                        {#each parameterTypes as type}
                          <option value={type.value}>{type.label}</option>
                        {/each}
                      </select>

                      <input
                        type="text"
                        class="form-input"
                        placeholder="Default or placeholder"
                        value={param.placeholder || param.defaultValue || ''}
                        oninput={(e) => updateParameter(i, { placeholder: e.currentTarget.value })}
                      />

                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onchange={(e) => updateParameter(i, { required: e.currentTarget.checked })}
                        />
                        Required
                      </label>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Validation Messages -->
          {#if errors.length > 0}
            <div class="validation-errors">
              {#each errors as error}
                <div class="error-msg">❌ {error}</div>
              {/each}
            </div>
          {/if}

          {#if warnings.length > 0}
            <div class="validation-warnings">
              {#each warnings as warning}
                <div class="warning-msg">⚠️ {warning}</div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Right: Preview -->
        <div class="editor-preview">
          <h3>Live Preview</h3>

          <div class="preview-section">
            <h4>Parameter Values (for preview)</h4>
            {#if parameters.length === 0}
              <p class="preview-hint">Add parameters to see preview controls</p>
            {:else}
              <div class="preview-params">
                {#each parameters as param}
                  <div class="preview-param">
                    <label>{param.name}</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder={param.placeholder || param.name}
                      bind:value={previewValues[param.name]}
                    />
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="preview-section">
            <h4>Generated SQL</h4>
            <pre class="preview-sql">{previewSQL || template || '(empty template)'}</pre>
          </div>

          <div class="preview-section">
            <h4>Snippet Info</h4>
            <div class="snippet-info">
              <div class="info-item">
                <span class="info-label">Name:</span>
                <span class="info-value">{name || '(unnamed)'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Category:</span>
                <span class="info-value">
                  {categories.find(c => c.value === category)?.icon}
                  {categories.find(c => c.value === category)?.label}
                </span>
              </div>
              {#if trigger}
                <div class="info-item">
                  <span class="info-label">Trigger:</span>
                  <span class="info-value">{trigger}</span>
                </div>
              {/if}
              <div class="info-item">
                <span class="info-label">Parameters:</span>
                <span class="info-value">{parameters.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="editor-footer">
        <div class="footer-hint">
          Press <kbd>Esc</kbd> to cancel, <kbd>⌘S</kbd> to save
        </div>
        <div class="footer-actions">
          <button class="btn-cancel" onclick={onClose}>Cancel</button>
          <button class="btn-save" onclick={handleSave} disabled={errors.length > 0}>
            {snippet ? 'Update' : 'Create'} Snippet
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .editor-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .editor-dialog {
    background: #1F2937;
    border-radius: 12px;
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid #374151;
  }

  .editor-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .close-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #9CA3AF;
    font-size: 1.5rem;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: #374151;
    color: #F3F4F6;
  }

  .editor-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    padding: 1.5rem;
    overflow: hidden;
  }

  .editor-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-section h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-field label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
  }

  .form-field small {
    font-size: 0.75rem;
    color: #9CA3AF;
  }

  .form-input,
  .form-select,
  .form-textarea {
    padding: 0.5rem 0.75rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #F3F4F6;
    font-size: 0.875rem;
    font-family: inherit;
  }

  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #4285F4;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .template-editor {
    padding: 0.75rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #F3F4F6;
    font-size: 0.875rem;
    font-family: 'JetBrains Mono', monospace;
    resize: vertical;
  }

  .template-editor:focus {
    outline: none;
    border-color: #4285F4;
  }

  .detect-btn {
    padding: 0.5rem 1rem;
    background: #374151;
    border: 1px solid #4B5563;
    border-radius: 6px;
    color: #F3F4F6;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .detect-btn:hover {
    background: #4B5563;
  }

  .tag-input-wrapper {
    display: flex;
    gap: 0.5rem;
  }

  .add-tag-btn {
    padding: 0.5rem 1rem;
    background: #374151;
    border: 1px solid #4B5563;
    border-radius: 6px;
    color: #F3F4F6;
    font-size: 0.875rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .add-tag-btn:hover {
    background: #4B5563;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #374151;
    border-radius: 4px;
    color: #D1D5DB;
    font-size: 0.75rem;
  }

  .tag button {
    background: none;
    border: none;
    color: #9CA3AF;
    cursor: pointer;
    padding: 0;
    font-size: 1rem;
    line-height: 1;
  }

  .tag button:hover {
    color: #EF4444;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #D1D5DB;
    cursor: pointer;
  }

  .add-param-btn {
    padding: 0.5rem 1rem;
    background: #4285F4;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .add-param-btn:hover {
    background: #5294F5;
  }

  .empty-params {
    padding: 2rem;
    text-align: center;
    color: #6B7280;
    font-size: 0.875rem;
    background: #111827;
    border: 1px dashed #374151;
    border-radius: 6px;
  }

  .params-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .param-item {
    padding: 1rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .param-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .param-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    background: #374151;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .param-name-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 6px;
    color: #F3F4F6;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
  }

  .param-name-input:focus {
    outline: none;
    border-color: #4285F4;
  }

  .remove-param-btn {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #9CA3AF;
    font-size: 1.25rem;
    cursor: pointer;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .remove-param-btn:hover {
    background: #374151;
    color: #EF4444;
  }

  .param-fields {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 0.5rem;
    align-items: center;
  }

  .validation-errors,
  .validation-warnings {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .error-msg {
    padding: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: #FCA5A5;
    font-size: 0.875rem;
  }

  .warning-msg {
    padding: 0.75rem;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 6px;
    color: #FCD34D;
    font-size: 0.875rem;
  }

  .editor-preview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .editor-preview h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .preview-section h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #D1D5DB;
  }

  .preview-hint {
    color: #6B7280;
    font-size: 0.875rem;
    font-style: italic;
  }

  .preview-params {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preview-param {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .preview-param label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #9CA3AF;
    font-family: 'JetBrains Mono', monospace;
  }

  .preview-sql {
    padding: 1rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #34D399;
    font-size: 0.875rem;
    font-family: 'JetBrains Mono', monospace;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    overflow-x: auto;
  }

  .snippet-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 6px;
  }

  .info-item {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .info-label {
    color: #9CA3AF;
    font-weight: 500;
    min-width: 5rem;
  }

  .info-value {
    color: #D1D5DB;
  }

  .editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-top: 1px solid #374151;
  }

  .footer-hint {
    font-size: 0.75rem;
    color: #6B7280;
  }

  .footer-hint kbd {
    padding: 0.125rem 0.375rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 3px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: #9CA3AF;
  }

  .footer-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-cancel,
  .btn-save {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel {
    background: #374151;
    color: #D1D5DB;
  }

  .btn-cancel:hover {
    background: #4B5563;
  }

  .btn-save {
    background: #4285F4;
    color: white;
  }

  .btn-save:hover:not(:disabled) {
    background: #5294F5;
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
