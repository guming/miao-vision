/**
 * SQL Snippet Auto-completion Provider for Monaco Editor
 *
 * Provides snippet-based auto-completion:
 * - Trigger word expansion (e.g., "wow" → Week-over-Week template)
 * - Snippet browsing in autocomplete list
 * - Parameter placeholder highlighting
 * - Integration with snippet store
 */

import type { languages, editor, Position, IRange } from 'monaco-editor'
import type { SQLSnippet } from '@/types/snippet'

export interface SnippetCompletionProvider {
  /**
   * Get all available snippets (built-in + custom)
   */
  getSnippets: () => SQLSnippet[]

  /**
   * Record snippet usage for analytics
   */
  recordUsage?: (snippetId: string) => void
}

/**
 * Get category icon/emoji for snippet
 */
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'time-series': '📈',
    'aggregation': '∑',
    'window-function': '🪟',
    'cohort': '👥',
    'statistical': '📊',
    'joins': '🔗',
    'date-manipulation': '📅',
    'data-quality': '✓',
    'formatting': '🎨',
    'custom': '⭐'
  }
  return icons[category] || '📝'
}

/**
 * Convert snippet template to Monaco snippet syntax
 *
 * Transforms ${paramName} to ${1:paramName} for tab stops
 * Parameters are numbered in order of appearance
 */
function convertTemplateToMonacoSnippet(template: string, snippet: SQLSnippet): string {
  let result = template
  let tabStopIndex = 1

  // Replace each ${paramName} with ${tabStopIndex:paramName}
  for (const param of snippet.parameters) {
    const placeholder = `\${${param.name}}`
    const monacoPlaceholder = `\${${tabStopIndex}:${param.placeholder || param.name}}`

    // Escape special regex characters in placeholder
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedPlaceholder, 'g')

    result = result.replace(regex, monacoPlaceholder)
    tabStopIndex++
  }

  // Add final tab stop at the end
  result += '$0'

  return result
}

/**
 * Create completion item for a snippet
 */
function createSnippetCompletionItem(
  monaco: typeof import('monaco-editor'),
  snippet: SQLSnippet,
  range: IRange,
  matchType: 'trigger' | 'name' | 'tag'
): languages.CompletionItem {
  const icon = getCategoryIcon(snippet.category)
  const label = matchType === 'trigger' && snippet.trigger
    ? snippet.trigger
    : snippet.name

  // Build documentation
  const docs = [
    `${icon} **${snippet.name}**`,
    '',
    snippet.description,
    '',
    '**Category:** ' + snippet.category.replace('-', ' '),
    ''
  ]

  if (snippet.trigger) {
    docs.push(`**Trigger:** ${snippet.trigger}`)
  }

  if (snippet.tags.length > 0) {
    docs.push(`**Tags:** ${snippet.tags.join(', ')}`)
  }

  if (snippet.parameters.length > 0) {
    docs.push('', '**Parameters:**')
    snippet.parameters.forEach(param => {
      docs.push(`- \`${param.name}\`: ${param.description}`)
    })
  }

  if (snippet.usageCount > 0) {
    docs.push('', `Used ${snippet.usageCount} times`)
  }

  // Convert template to Monaco snippet syntax
  const insertText = convertTemplateToMonacoSnippet(snippet.template, snippet)

  // Determine sort order (favorites and frequently used first)
  let sortText = 'z' // Default: lowest priority
  if (snippet.isFavorite) {
    sortText = 'a' // Highest priority
  } else if (snippet.usageCount > 10) {
    sortText = 'b' // High priority
  } else if (snippet.usageCount > 0) {
    sortText = 'c' // Medium priority
  } else if (snippet.isBuiltIn) {
    sortText = 'd' // Built-in snippets
  }

  return {
    label: {
      label: label,
      description: snippet.description.substring(0, 50) + (snippet.description.length > 50 ? '...' : '')
    },
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: `${icon} ${snippet.category} snippet`,
    documentation: {
      value: docs.join('\n'),
      isTrusted: true
    },
    sortText: sortText + label.toLowerCase(),
    filterText: [
      label,
      snippet.name,
      snippet.trigger,
      ...snippet.tags
    ].filter(Boolean).join(' '),
    range
  }
}

/**
 * Create a Monaco completion item provider for SQL snippets
 */
export function createSnippetCompletionProvider(
  monaco: typeof import('monaco-editor'),
  provider: SnippetCompletionProvider
): languages.CompletionItemProvider {
  return {
    // Trigger on space and alphanumeric characters
    triggerCharacters: [' '],

    async provideCompletionItems(
      model: editor.ITextModel,
      position: Position
    ): Promise<languages.CompletionList> {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }

      const currentWord = word.word.toLowerCase()

      const suggestions: languages.CompletionItem[] = []

      try {
        const snippets = provider.getSnippets()

        for (const snippet of snippets) {
          let shouldInclude = false
          let matchType: 'trigger' | 'name' | 'tag' = 'name'

          // Check if current word matches trigger
          if (snippet.trigger && currentWord === snippet.trigger.toLowerCase()) {
            shouldInclude = true
            matchType = 'trigger'
          }

          // Check if current word is part of snippet name
          if (snippet.name.toLowerCase().includes(currentWord)) {
            shouldInclude = true
            matchType = 'name'
          }

          // Check if current word matches any tag
          if (snippet.tags.some(tag => tag.toLowerCase().includes(currentWord))) {
            shouldInclude = true
            matchType = 'tag'
          }

          // Include all snippets if no word is typed yet (empty context)
          if (currentWord.length === 0 || currentWord.length < 2) {
            shouldInclude = true
          }

          if (shouldInclude) {
            const item = createSnippetCompletionItem(monaco, snippet, range, matchType)
            suggestions.push(item)
          }
        }

        // Sort suggestions by sortText
        suggestions.sort((a, b) => {
          const sortA = typeof a.sortText === 'string' ? a.sortText : ''
          const sortB = typeof b.sortText === 'string' ? b.sortText : ''
          return sortA.localeCompare(sortB)
        })

      } catch (error) {
        console.error('[SnippetCompletion] Error fetching snippets:', error)
      }

      return {
        suggestions,
        incomplete: false
      }
    },

    /**
     * Resolve additional details for a completion item
     */
    resolveCompletionItem(item: languages.CompletionItem): languages.CompletionItem {
      // Could add additional details here if needed
      return item
    }
  }
}

/**
 * Register snippet completion provider with Monaco
 *
 * This registers a separate completion provider that works alongside
 * the existing SQL completion provider.
 */
export function registerSnippetCompletion(
  monaco: typeof import('monaco-editor'),
  provider: SnippetCompletionProvider
): any {
  return monaco.languages.registerCompletionItemProvider(
    'sql',
    createSnippetCompletionProvider(monaco, provider)
  )
}

/**
 * Adapter to use snippet store with Monaco completion provider
 *
 * Usage:
 * ```typescript
 * import { snippetStore } from '@app/stores/snippet.svelte'
 * import { createSnippetStoreAdapter } from './snippet-completion'
 *
 * const adapter = createSnippetStoreAdapter(snippetStore)
 * registerSnippetCompletion(monaco, adapter)
 * ```
 */
export function createSnippetStoreAdapter(
  store: {
    allSnippets: SQLSnippet[]
    recordUsage: (id: string) => void
  }
): SnippetCompletionProvider {
  return {
    getSnippets: () => store.allSnippets,
    recordUsage: (id: string) => store.recordUsage(id)
  }
}
