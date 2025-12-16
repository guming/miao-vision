/**
 * Note Component Types
 *
 * GitHub-style admonition/callout component
 */

export type NoteType = 'note' | 'tip' | 'important' | 'warning' | 'caution'

export interface NoteConfig {
  type?: NoteType          // Note type (default: 'note')
  title?: string           // Custom title (optional, defaults to type name)
  collapsible?: boolean    // Make note collapsible (default: false)
  defaultOpen?: boolean    // If collapsible, default open state (default: true)
}

export interface NoteData {
  config: NoteConfig
  content: string          // HTML content
}
