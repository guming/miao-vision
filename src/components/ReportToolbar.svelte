<script lang="ts">
  import type MarkdownEditor from './MarkdownEditor.svelte'

  interface Props {
    editor?: MarkdownEditor | null
    onExecute?: () => void
    onSave?: () => void
    isExecuting?: boolean
    isSaving?: boolean
  }

  let {
    editor = $bindable(null),
    onExecute,
    onSave,
    isExecuting = false,
    isSaving = false
  }: Props = $props()

  function handleInsertSQL() {
    if (editor) {
      editor.insertSQLBlock()
    }
  }

  function handleInsertChart() {
    if (editor) {
      editor.insertChartBlock()
    }
  }

  function handleInsertVariable() {
    const varName = prompt('Enter variable name:')
    if (varName && editor) {
      editor.insertVariable(varName)
    }
  }

  function handleExecute() {
    if (onExecute && !isExecuting) {
      onExecute()
    }
  }

  function handleSave() {
    if (onSave && !isSaving) {
      onSave()
    }
  }

  function handleFormat() {
    if (editor) {
      editor.formatDocument()
    }
  }
</script>

<div class="report-toolbar">
  <div class="toolbar-section">
    <span class="section-label">Insert:</span>

    <button
      class="toolbar-btn"
      onclick={handleInsertSQL}
      title="Insert SQL Query Block"
    >
      📊 SQL Query
    </button>

    <button
      class="toolbar-btn"
      onclick={handleInsertChart}
      title="Insert Chart Block"
    >
      📈 Chart
    </button>

    <button
      class="toolbar-btn"
      onclick={handleInsertVariable}
      title="Insert Variable"
    >
      🔤 Variable
    </button>
  </div>

  <div class="toolbar-divider"></div>

  <div class="toolbar-section">
    <button
      class="toolbar-btn"
      onclick={handleFormat}
      title="Format Document"
    >
      ✨ Format
    </button>
  </div>

  <div class="toolbar-spacer"></div>

  <div class="toolbar-section">
    <button
      class="toolbar-btn btn-save"
      onclick={handleSave}
      disabled={isSaving}
      title="Save Report"
    >
      {isSaving ? '💾 Saving...' : '💾 Save'}
    </button>

    <button
      class="toolbar-btn btn-execute"
      onclick={handleExecute}
      disabled={isExecuting}
      title="Execute Report"
    >
      {isExecuting ? '⏳ Executing...' : '▶ Execute'}
    </button>
  </div>
</div>

<style>
  .report-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background-color: #1F2937;
    border-bottom: 1px solid #4B5563;
    flex-wrap: wrap;
  }

  .toolbar-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-label {
    font-size: 0.85rem;
    opacity: 0.7;
    margin-right: 0.25rem;
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background-color: #4B5563;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .toolbar-btn {
    padding: 0.5rem 1rem;
    background-color: #374151;
    border: 1px solid #4B5563;
    border-radius: 4px;
    color: #F3F4F6;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(66, 133, 244, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%);
    border-color: #667eea;
  }

  .toolbar-btn:active:not(:disabled) {
    transform: translateY(1px);
  }

  .toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-save {
    background-color: rgba(102, 126, 234, 0.2);
    border-color: rgba(102, 126, 234, 0.3);
  }

  .btn-save:hover:not(:disabled) {
    background-color: rgba(102, 126, 234, 0.3);
    border-color: rgba(102, 126, 234, 0.5);
  }

  .btn-execute {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
    border-color: rgba(102, 126, 234, 0.5);
    font-weight: 500;
  }

  .btn-execute:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%);
    border-color: rgba(102, 126, 234, 0.7);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .report-toolbar {
      gap: 0.25rem;
    }

    .toolbar-btn {
      padding: 0.4rem 0.75rem;
      font-size: 0.85rem;
    }

    .section-label {
      display: none;
    }
  }
</style>
