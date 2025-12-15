<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import loader from '@monaco-editor/loader'
  import type * as Monaco from 'monaco-editor'

  interface Props {
    value?: string
    onChange?: (value: string, reportId: string) => void  // Now passes reportId
    readOnly?: boolean
    height?: string
    reportId?: string  // Track which report we're editing
  }

  let {
    value = '',
    onChange,
    readOnly = false,
    height = '600px',
    reportId = ''
  }: Props = $props()

  // Debug: Log when props are received
  console.log('🔷 MarkdownEditor: Props received')
  console.log('  reportId:', reportId)
  console.log('  value length:', value?.length || 0)
  console.log('  value preview:', value?.substring(0, 100) || '(empty)')

  let editorContainer = $state<HTMLDivElement>()
  let editor: Monaco.editor.IStandaloneCodeEditor | null = null
  let monaco: typeof Monaco | null = null
  let isUpdatingProgrammatically = false  // Flag to ignore programmatic changes
  let lastKnownReportId = reportId  // Track the report ID when the value was set

  // Debug: Track prop changes with $effect
  $effect(() => {
    console.log('🔶 MarkdownEditor $effect: Props changed')
    console.log('  reportId prop:', reportId)
    console.log('  value prop length:', value?.length || 0)
    console.log('  value prop preview:', value?.substring(0, 80) || '(empty)')
    console.log('  lastKnownReportId:', lastKnownReportId)
    console.log('  editor exists:', !!editor)
    if (editor) {
      console.log('  editor.getValue() length:', editor.getValue()?.length || 0)
      console.log('  editor.getValue() preview:', editor.getValue()?.substring(0, 80) || '(empty)')
    }
  })

  onMount(async () => {
    if (!editorContainer) {
      console.error('Editor container not found')
      return
    }

    try {
      // Load Monaco Editor
      monaco = await loader.init()

      // Register Markdown language features
      monaco.languages.register({ id: 'markdown' })

      // Create editor instance
      editor = monaco.editor.create(editorContainer, {
        value: value,
        language: 'markdown',
        theme: 'vs-dark',
        readOnly: readOnly,
        automaticLayout: true,
        minimap: {
          enabled: true
        },
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Monaco, Consolas, Courier New, monospace',
        fontLigatures: true,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        folding: true,
        // Code block folding
        foldingStrategy: 'indentation',
        // Markdown-specific settings
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false
        },
        // Bracket matching
        matchBrackets: 'always',
        // Format on paste
        formatOnPaste: true
      })

      // Listen to content changes
      editor.onDidChangeModelContent(() => {
        // Ignore ALL changes while we're programmatically updating (e.g., switching reports)
        if (isUpdatingProgrammatically) {
          console.log('📝 Editor content changed (ignored - programmatic update)')
          return
        }

        const currentValue = editor?.getValue() || ''
        console.log('📝 Editor content changed (user edit)')
        console.log('  currentValue length:', currentValue.length)
        console.log('  lastKnownReportId:', lastKnownReportId)

        if (onChange && lastKnownReportId) {
          console.log('  📤 Calling onChange with reportId:', lastKnownReportId)
          onChange(currentValue, lastKnownReportId)
        }
      })

      console.log('Markdown editor initialized')
    } catch (error) {
      console.error('Failed to initialize Markdown editor:', error)
    }
  })

  onDestroy(() => {
    editor?.dispose()
    editor = null
  })

  // Update editor value when prop changes (e.g., switching reports)
  // CRITICAL: Must update when EITHER value OR reportId changes
  $effect(() => {
    if (!editor) return

    const editorValue = editor.getValue()
    const valueChanged = value !== editorValue
    const reportChanged = reportId !== lastKnownReportId

    // Update if value changed OR if we switched to a different report
    if (valueChanged || reportChanged) {
      console.log('🔄 MarkdownEditor $effect: updating editor')
      console.log('  valueChanged:', valueChanged)
      console.log('  reportChanged:', reportChanged)
      console.log('  new value length:', value.length)
      console.log('  editor current length:', editorValue.length)
      console.log('  reportId prop:', reportId)
      console.log('  lastKnownReportId:', lastKnownReportId)

      // Set flag BEFORE setValue to ignore all change events during update
      isUpdatingProgrammatically = true
      console.log('  Set isUpdatingProgrammatically = true')

      // CRITICAL: Update lastKnownReportId BEFORE setValue
      // This ensures any subsequent user edits are attributed to the new report
      lastKnownReportId = reportId
      console.log('  Updated lastKnownReportId to:', lastKnownReportId)

      // Only preserve position if we're editing the same report
      const position = reportChanged ? null : editor.getPosition()

      editor.setValue(value)
      console.log('  Called editor.setValue()')

      // Clear flag after a short delay to ensure all Monaco events have fired
      setTimeout(() => {
        isUpdatingProgrammatically = false
        console.log('  Set isUpdatingProgrammatically = false')
      }, 50)

      // Restore position only if same report, otherwise go to top
      if (position) {
        editor.setPosition(position)
      } else if (reportChanged) {
        // For new report, scroll to top
        editor.setPosition({ lineNumber: 1, column: 1 })
        editor.revealLine(1)
      }
    }
  })

  // Update readonly state
  $effect(() => {
    if (editor) {
      editor.updateOptions({ readOnly })
    }
  })

  /**
   * Insert text at cursor position
   */
  export function insertText(text: string) {
    if (!editor) {
      return
    }

    const selection = editor.getSelection()
    if (selection) {
      editor.executeEdits('', [
        {
          range: selection,
          text: text,
          forceMoveMarkers: true
        }
      ])
      editor.focus()
    }
  }

  /**
   * Insert SQL code block
   */
  export function insertSQLBlock(name?: string) {
    const sqlBlock = name
      ? `\n\`\`\`sql ${name}\nSELECT * FROM your_table LIMIT 10\n\`\`\`\n`
      : `\n\`\`\`sql\nSELECT * FROM your_table LIMIT 10\n\`\`\`\n`
    insertText(sqlBlock)
  }

  /**
   * Insert chart code block
   */
  export function insertChartBlock() {
    const chartBlock = `\n\`\`\`chart
type: bar
data: query_result
x: column_x
y: column_y
title: Your Chart Title
\`\`\`\n`
    insertText(chartBlock)
  }

  /**
   * Insert variable placeholder
   */
  export function insertVariable(name: string) {
    insertText(`{${name}}`)
  }

  /**
   * Get current cursor position
   */
  export function getCursorPosition() {
    return editor?.getPosition() || null
  }

  /**
   * Format document
   */
  export function formatDocument() {
    if (editor) {
      editor.getAction('editor.action.formatDocument')?.run()
    }
  }
</script>

<div class="markdown-editor">
  <div
    bind:this={editorContainer}
    class="editor-container"
    style="height: {height}"
  ></div>
</div>

<style>
  .markdown-editor {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    background-color: #1E1E1E;
  }

  .editor-container {
    width: 100%;
    background-color: #1E1E1E;
  }
</style>
