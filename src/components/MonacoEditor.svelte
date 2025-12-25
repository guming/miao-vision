<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import loader from '@monaco-editor/loader'
  import type { MonacoEditor } from '@/types/editor'
  import type { SQLCompletionProvider } from './sql-workspace/sql-completion'
  import { registerSQLCompletion } from './sql-workspace/sql-completion'
  import type { SnippetCompletionProvider } from './sql-workspace/snippet-completion'
  import { registerSnippetCompletion } from './sql-workspace/snippet-completion'

  interface Props {
    value?: string
    language?: string
    theme?: string
    readOnly?: boolean
    height?: string
    onChange?: (value: string) => void
    sqlCompletionProvider?: SQLCompletionProvider
    snippetCompletionProvider?: SnippetCompletionProvider
  }

  let {
    value = $bindable(''),
    language = 'sql',
    theme = 'vs-dark',
    readOnly = false,
    height = '400px',
    onChange,
    sqlCompletionProvider,
    snippetCompletionProvider
  }: Props = $props()

  let editorContainer: HTMLDivElement
  let editor: MonacoEditor | null = null
  let monaco: typeof import('monaco-editor') | null = null
  let sqlCompletionRegistered = false
  let snippetCompletionRegistered = false
  let snippetCompletionDisposable: any = null

  onMount(async () => {
    try {
      // Load Monaco Editor
      monaco = await loader.init()

      if (!editorContainer) {
        console.error('Editor container not found')
        return
      }

      // Register SQL completion provider if provided and language is SQL
      if (language === 'sql' && sqlCompletionProvider && !sqlCompletionRegistered) {
        registerSQLCompletion(monaco, sqlCompletionProvider)
        sqlCompletionRegistered = true
      }

      // Register snippet completion provider if provided and language is SQL
      if (language === 'sql' && snippetCompletionProvider && !snippetCompletionRegistered) {
        snippetCompletionDisposable = registerSnippetCompletion(monaco, snippetCompletionProvider)
        snippetCompletionRegistered = true
      }

      // Create editor instance
      editor = monaco.editor.create(editorContainer, {
        value: value,
        language: language,
        theme: theme,
        readOnly: readOnly,
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Monaco, Consolas, Courier New, monospace',
        fontLigatures: true,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        suggestOnTriggerCharacters: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true
        }
      })

      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        const newValue = editor?.getValue() || ''
        value = newValue
        if (onChange) {
          onChange(newValue)
        }
      })

      console.log('Monaco Editor initialized')
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error)
    }
  })

  onDestroy(() => {
    // Dispose snippet completion provider
    if (snippetCompletionDisposable) {
      snippetCompletionDisposable.dispose()
      snippetCompletionDisposable = null
    }

    // Dispose editor
    if (editor) {
      editor.dispose()
      editor = null
    }
  })

  // Update editor value when prop changes
  $effect(() => {
    if (editor && value !== editor.getValue()) {
      editor.setValue(value)
    }
  })

  // Update language when prop changes
  $effect(() => {
    if (editor && monaco) {
      const model = editor.getModel()
      if (model) {
        monaco.editor.setModelLanguage(model, language)
      }
    }
  })

  // Update theme when prop changes
  $effect(() => {
    if (monaco) {
      monaco.editor.setTheme(theme)
    }
  })

  // Expose editor methods
  export function getValue(): string {
    return editor?.getValue() || ''
  }

  export function setValue(newValue: string): void {
    if (editor) {
      editor.setValue(newValue)
    }
  }

  export function getSelection(): string {
    if (editor) {
      const selection = editor.getSelection()
      if (selection) {
        return editor.getModel()?.getValueInRange(selection) || ''
      }
    }
    return ''
  }
</script>

<div class="editor-wrapper" style="height: {height}">
  <div bind:this={editorContainer} class="editor-container"></div>
</div>

<style>
  .editor-wrapper {
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    background-color: #1E1E1E;
  }

  .editor-container {
    width: 100%;
    height: 100%;
    background-color: #1E1E1E;
  }
</style>
