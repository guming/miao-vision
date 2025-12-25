<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import loader from '@monaco-editor/loader'
  import type { editor as MonacoEditorNamespace } from 'monaco-editor'

  interface Props {
    /** Original content (left side) */
    original: string

    /** Modified content (right side) */
    modified: string

    /** Language for syntax highlighting */
    language?: string

    /** Editor theme */
    theme?: string

    /** Height of the diff editor */
    height?: string

    /** Make modified side read-only */
    readOnly?: boolean

    /** Show inline diff (single view) instead of side-by-side */
    inlineDiff?: boolean
  }

  let {
    original = '',
    modified = '',
    language = 'markdown',
    theme = 'vs-dark',
    height = '600px',
    readOnly = true,
    inlineDiff = false
  }: Props = $props()

  let editorContainer: HTMLDivElement
  let diffEditor: MonacoEditorNamespace.IStandaloneDiffEditor | null = null
  let monaco: typeof import('monaco-editor') | null = null

  onMount(async () => {
    try {
      // Load Monaco Editor
      monaco = await loader.init()

      if (!editorContainer) {
        console.error('Diff editor container not found')
        return
      }

      // Create diff editor instance
      diffEditor = monaco.editor.createDiffEditor(editorContainer, {
        theme: theme,
        automaticLayout: true,
        readOnly: readOnly,
        renderSideBySide: !inlineDiff,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Monaco, Consolas, Courier New, monospace',
        fontLigatures: true,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        diffWordWrap: 'on',
        // Diff-specific options
        ignoreTrimWhitespace: true,
        renderIndicators: true,
        originalEditable: false,
        enableSplitViewResizing: true
      })

      // Set the models for original and modified content
      const originalModel = monaco.editor.createModel(original, language)
      const modifiedModel = monaco.editor.createModel(modified, language)

      diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel
      })

      console.log('Monaco Diff Editor initialized')
    } catch (error) {
      console.error('Failed to initialize Monaco Diff Editor:', error)
    }
  })

  onDestroy(() => {
    if (diffEditor) {
      const model = diffEditor.getModel()
      if (model) {
        model.original?.dispose()
        model.modified?.dispose()
      }
      diffEditor.dispose()
    }
  })

  // Update content when props change
  $effect(() => {
    if (diffEditor && monaco) {
      const model = diffEditor.getModel()
      if (model) {
        // Update original
        if (model.original && model.original.getValue() !== original) {
          model.original.setValue(original)
        }

        // Update modified
        if (model.modified && model.modified.getValue() !== modified) {
          model.modified.setValue(modified)
        }
      }
    }
  })

  // Public methods for parent components
  export function getOriginalValue(): string {
    return diffEditor?.getModel()?.original?.getValue() || ''
  }

  export function getModifiedValue(): string {
    return diffEditor?.getModel()?.modified?.getValue() || ''
  }

  export function getDiffChanges() {
    return diffEditor?.getLineChanges() || []
  }
</script>

<div class="monaco-diff-editor" style="height: {height}">
  <div bind:this={editorContainer} class="diff-editor-container"></div>
</div>

<style>
  .monaco-diff-editor {
    width: 100%;
    overflow: hidden;
    border: 1px solid #1F2937;
    border-radius: 8px;
  }

  .diff-editor-container {
    width: 100%;
    height: 100%;
  }
</style>
