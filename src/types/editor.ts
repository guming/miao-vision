import type * as Monaco from 'monaco-editor'

export interface EditorOptions {
  value?: string
  language?: string
  theme?: string
  readOnly?: boolean
  minimap?: boolean
  lineNumbers?: 'on' | 'off' | 'relative'
  fontSize?: number
}

export interface EditorInstance {
  getValue: () => string
  setValue: (value: string) => void
  getSelection: () => string
  dispose: () => void
}

export type MonacoEditor = Monaco.editor.IStandaloneCodeEditor
