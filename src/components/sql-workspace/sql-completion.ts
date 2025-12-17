/**
 * SQL Auto-completion Provider for Monaco Editor
 *
 * Provides intelligent auto-completion for:
 * - Table names
 * - Column names (context-aware)
 * - SQL keywords and functions
 */

import type { languages, editor, Position } from 'monaco-editor'

// SQL Keywords
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN',
  'LIKE', 'IS', 'NULL', 'TRUE', 'FALSE', 'AS', 'ON', 'JOIN',
  'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'NATURAL',
  'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'UNION', 'ALL', 'INTERSECT', 'EXCEPT', 'DISTINCT', 'TOP',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'VIEW', 'INDEX', 'DROP', 'ALTER', 'ADD',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'DEFAULT',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'CONVERT',
  'WITH', 'RECURSIVE', 'OVER', 'PARTITION', 'ROW_NUMBER', 'RANK',
  'DENSE_RANK', 'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE',
  'COALESCE', 'NULLIF', 'IIF', 'EXISTS'
]

// SQL Aggregate Functions
const SQL_FUNCTIONS = [
  { name: 'COUNT', signature: 'COUNT(expression)' },
  { name: 'SUM', signature: 'SUM(expression)' },
  { name: 'AVG', signature: 'AVG(expression)' },
  { name: 'MIN', signature: 'MIN(expression)' },
  { name: 'MAX', signature: 'MAX(expression)' },
  { name: 'ROUND', signature: 'ROUND(number, decimals)' },
  { name: 'FLOOR', signature: 'FLOOR(number)' },
  { name: 'CEIL', signature: 'CEIL(number)' },
  { name: 'ABS', signature: 'ABS(number)' },
  { name: 'LOWER', signature: 'LOWER(string)' },
  { name: 'UPPER', signature: 'UPPER(string)' },
  { name: 'TRIM', signature: 'TRIM(string)' },
  { name: 'LENGTH', signature: 'LENGTH(string)' },
  { name: 'SUBSTRING', signature: 'SUBSTRING(string, start, length)' },
  { name: 'CONCAT', signature: 'CONCAT(string1, string2, ...)' },
  { name: 'REPLACE', signature: 'REPLACE(string, from, to)' },
  { name: 'NOW', signature: 'NOW()' },
  { name: 'DATE', signature: 'DATE(expression)' },
  { name: 'YEAR', signature: 'YEAR(date)' },
  { name: 'MONTH', signature: 'MONTH(date)' },
  { name: 'DAY', signature: 'DAY(date)' },
  { name: 'STRFTIME', signature: "STRFTIME(format, date)" },
  { name: 'IFNULL', signature: 'IFNULL(expression, default)' },
  { name: 'TYPEOF', signature: 'TYPEOF(expression)' },
  { name: 'PRINTF', signature: "PRINTF(format, ...)" },
  { name: 'LIST', signature: 'LIST(expression)' },
  { name: 'STRING_AGG', signature: "STRING_AGG(expression, separator)" },
  { name: 'ARRAY_AGG', signature: 'ARRAY_AGG(expression)' }
]

export interface TableSchema {
  name: string
  columns: Array<{ name: string; type: string }>
}

export interface SQLCompletionProvider {
  getTables: () => Promise<string[]>
  getTableSchema: (tableName: string) => Promise<Array<{ column_name: string; column_type: string }>>
}

/**
 * Create a Monaco completion item provider for SQL
 */
export function createSQLCompletionProvider(
  monaco: typeof import('monaco-editor'),
  provider: SQLCompletionProvider
): languages.CompletionItemProvider {
  return {
    triggerCharacters: ['.', ' ', '('],

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

      // Get the text before cursor for context analysis
      const lineContent = model.getLineContent(position.lineNumber)
      const textBeforeCursor = lineContent.substring(0, position.column - 1).toLowerCase()
      const fullText = model.getValue().toLowerCase()

      const suggestions: languages.CompletionItem[] = []

      // Check context: after FROM, JOIN, or table alias
      const isAfterFrom = /\b(from|join)\s+\w*$/i.test(textBeforeCursor)
      const isAfterDot = textBeforeCursor.endsWith('.')
      const isSelectContext = /\bselect\s+[\w,\s*]*$/i.test(textBeforeCursor) && !isAfterFrom

      try {
        // Get tables for completion
        const tables = await provider.getTables()

        // If after FROM/JOIN, suggest table names
        if (isAfterFrom) {
          tables.forEach(table => {
            suggestions.push({
              label: table,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: table,
              detail: 'Table',
              documentation: `Table: ${table}`,
              range
            })
          })
          return { suggestions }
        }

        // If after a dot, try to find table name and suggest columns
        if (isAfterDot) {
          // Find the word before the dot
          const beforeDot = lineContent.substring(0, position.column - 2).split(/\s+/).pop() || ''

          // Check if it's a table name
          if (tables.includes(beforeDot)) {
            const schema = await provider.getTableSchema(beforeDot)
            schema.forEach(col => {
              const colName = col.column_name || (col as any).name
              const colType = col.column_type || (col as any).type
              suggestions.push({
                label: colName,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: colName,
                detail: colType,
                documentation: `Column: ${colName} (${colType})`,
                range
              })
            })
            return { suggestions }
          }

          // Check if it's a table alias
          const aliasPattern = new RegExp(`(\\w+)\\s+(?:as\\s+)?${beforeDot}\\b`, 'i')
          const aliasMatch = fullText.match(aliasPattern)
          if (aliasMatch && tables.includes(aliasMatch[1])) {
            const schema = await provider.getTableSchema(aliasMatch[1])
            schema.forEach(col => {
              const colName = col.column_name || (col as any).name
              const colType = col.column_type || (col as any).type
              suggestions.push({
                label: colName,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: colName,
                detail: colType,
                documentation: `Column: ${colName} (${colType})`,
                range
              })
            })
            return { suggestions }
          }
        }

        // In SELECT context or general, suggest all options
        // Add keywords
        SQL_KEYWORDS.forEach(keyword => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: 'SQL Keyword',
            range
          })
        })

        // Add functions
        SQL_FUNCTIONS.forEach(func => {
          suggestions.push({
            label: func.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func.name + '($0)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: func.signature,
            documentation: `SQL Function: ${func.signature}`,
            range
          })
        })

        // Add table names
        tables.forEach(table => {
          suggestions.push({
            label: table,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table,
            detail: 'Table',
            documentation: `Table: ${table}`,
            range
          })
        })

        // In SELECT context, also suggest column names from tables used in query
        if (isSelectContext) {
          // Find tables mentioned in the query
          const fromMatch = fullText.match(/\bfrom\s+(\w+)/i)
          if (fromMatch && tables.includes(fromMatch[1])) {
            const schema = await provider.getTableSchema(fromMatch[1])
            schema.forEach(col => {
              const colName = col.column_name || (col as any).name
              const colType = col.column_type || (col as any).type
              suggestions.push({
                label: colName,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: colName,
                detail: `${colType} (from ${fromMatch![1]})`,
                documentation: `Column: ${colName} (${colType}) from table ${fromMatch![1]}`,
                range
              })
            })
          }
        }

      } catch (error) {
        console.error('Error fetching completions:', error)
      }

      return { suggestions }
    }
  }
}

/**
 * Register SQL completion provider with Monaco
 */
export function registerSQLCompletion(
  monaco: typeof import('monaco-editor'),
  provider: SQLCompletionProvider
): void {
  monaco.languages.registerCompletionItemProvider('sql', createSQLCompletionProvider(monaco, provider))
}
