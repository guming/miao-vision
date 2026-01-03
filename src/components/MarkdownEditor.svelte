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
    onAIGenerate?: () => void  // Callback when AI generate is requested
  }

  let {
    value = '',
    onChange,
    readOnly = false,
    height = '600px',
    reportId = '',
    onAIGenerate
  }: Props = $props()

  let editorContainer = $state<HTMLDivElement>()
  let editor: Monaco.editor.IStandaloneCodeEditor | null = null
  let monaco: typeof Monaco | null = null
  let isUpdatingProgrammatically = false  // Flag to ignore programmatic changes
  let isSilentEdit = false  // Flag for edits that shouldn't trigger onChange (e.g., AI command cleanup)
  let lastKnownReportId = ''  // Tracks which report is currently in editor

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

      // Register slash command completion provider
      monaco.languages.registerCompletionItemProvider('markdown', {
        triggerCharacters: ['/'],
        provideCompletionItems: (model, position) => {
          const lineContent = model.getLineContent(position.lineNumber)
          const textBeforeCursor = lineContent.substring(0, position.column - 1)

          // Only show suggestions if "/" is at the start of line or after whitespace
          if (!textBeforeCursor.match(/(?:^|\s)\/$/)) {
            return { suggestions: [] }
          }

          const range = {
            startLineNumber: position.lineNumber,
            startColumn: position.column - 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          }

          const suggestions: Monaco.languages.CompletionItem[] = [
            {
              label: '/ai',
              kind: monaco!.languages.CompletionItemKind.Function,
              insertText: '',
              range,
              detail: 'AI 生成图表',
              documentation: '使用 AI 根据数据自动生成图表配置',
              sortText: '0',
              command: {
                id: 'miao.aiGenerate',
                title: 'AI Generate'
              }
            },
            {
              label: '/sql',
              kind: monaco!.languages.CompletionItemKind.Snippet,
              insertText: '```sql ${1:query_name}\nSELECT * FROM ${2:table}\n```',
              insertTextRules: monaco!.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: '插入 SQL 查询块',
              documentation: '创建一个新的 SQL 查询块'
            },
            {
              label: '/chart',
              kind: monaco!.languages.CompletionItemKind.Snippet,
              insertText: '```chart\ntype: ${1|bar,line,pie,area,scatter|}\ndata: ${2:query_name}\nx: ${3:column_x}\ny: ${4:column_y}\ntitle: ${5:Chart Title}\n```',
              insertTextRules: monaco!.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: '插入图表块',
              documentation: '创建一个新的图表配置块'
            },
            {
              label: '/table',
              kind: monaco!.languages.CompletionItemKind.Snippet,
              insertText: '```datatable\nquery: ${1:query_name}\nsearchable: true\nsortable: true\n```',
              insertTextRules: monaco!.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: '插入数据表格',
              documentation: '创建一个交互式数据表格'
            },
            {
              label: '/bigvalue',
              kind: monaco!.languages.CompletionItemKind.Snippet,
              insertText: '```bigvalue\nquery: ${1:query_name}\nvalue: ${2:column}\ntitle: ${3:Title}\nformat: ${4|number,currency,percent|}\n```',
              insertTextRules: monaco!.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: '插入大数值展示',
              documentation: '创建一个突出显示的数值卡片'
            },
            {
              label: '/dropdown',
              kind: monaco!.languages.CompletionItemKind.Snippet,
              insertText: '```dropdown\nname: ${1:filter_name}\nlabel: ${2:Select Option}\noptions:\n  - ${3:Option 1}\n  - ${4:Option 2}\n```',
              insertTextRules: monaco!.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: '插入下拉选择器',
              documentation: '创建一个下拉筛选控件'
            }
          ]

          return { suggestions }
        }
      })

      // Register AI generate command
      monaco.editor.registerCommand('miao.aiGenerate', () => {
        if (onAIGenerate) {
          // Remove the "/" that was typed (silent edit to avoid triggering preview refresh)
          const position = editor?.getPosition()
          if (position && editor) {
            const range = {
              startLineNumber: position.lineNumber,
              startColumn: position.column - 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            }
            isSilentEdit = true
            editor.executeEdits('ai-cleanup', [{ range, text: '' }])
            isSilentEdit = false
          }
          onAIGenerate()
        }
      })

      // Listen to content changes
      editor.onDidChangeModelContent(() => {
        // Ignore changes while programmatically updating (e.g., switching reports)
        // or during silent edits (e.g., AI command cleanup)
        if (isUpdatingProgrammatically || isSilentEdit) return

        const currentValue = editor?.getValue() || ''
        if (onChange && lastKnownReportId) {
          onChange(currentValue, lastKnownReportId)
        }
      })

      // Track initial report
      lastKnownReportId = reportId
    } catch (error) {
      console.error('Failed to initialize Markdown editor:', error)
    }
  })

  onDestroy(() => {
    editor?.dispose()
    editor = null
  })

  // Update editor value when prop changes (e.g., switching reports)
  $effect(() => {
    if (!editor) return

    const editorValue = editor.getValue()
    const valueChanged = value !== editorValue
    const reportChanged = reportId !== lastKnownReportId

    // Update if value changed OR if we switched to a different report
    if (valueChanged || reportChanged) {
      // Set flag BEFORE setValue to ignore all change events during update
      isUpdatingProgrammatically = true

      // Update lastKnownReportId BEFORE setValue so user edits go to new report
      lastKnownReportId = reportId

      // Only preserve position if we're editing the same report
      const position = reportChanged ? null : editor.getPosition()

      editor.setValue(value)

      // Clear flag after Monaco events have fired
      setTimeout(() => {
        isUpdatingProgrammatically = false
      }, 50)

      // Restore position only if same report, otherwise go to top
      if (position) {
        editor.setPosition(position)
      } else if (reportChanged) {
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
