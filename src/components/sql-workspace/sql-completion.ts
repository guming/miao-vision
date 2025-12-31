/**
 * SQL Auto-completion Provider for Monaco Editor
 *
 * Provides intelligent auto-completion for:
 * - Table names (context-aware after FROM, JOIN)
 * - Column names (context-aware in SELECT, WHERE, GROUP BY, ORDER BY)
 * - SQL keywords and clauses
 * - DuckDB functions with signatures
 * - Table aliases
 */

import type { languages, editor, Position } from 'monaco-editor'

// SQL Keywords organized by category
const SQL_KEYWORDS = {
  clauses: [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY',
    'LIMIT', 'OFFSET', 'WITH', 'AS'
  ],
  joins: [
    'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
    'FULL JOIN', 'CROSS JOIN', 'NATURAL JOIN', 'LEFT OUTER JOIN',
    'RIGHT OUTER JOIN', 'FULL OUTER JOIN', 'ON', 'USING'
  ],
  operators: [
    'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'ILIKE',
    'IS', 'IS NOT', 'NULL', 'TRUE', 'FALSE', 'EXISTS',
    'ANY', 'ALL', 'SOME'
  ],
  setOps: [
    'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'DISTINCT'
  ],
  dml: [
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE'
  ],
  ddl: [
    'CREATE', 'TABLE', 'VIEW', 'INDEX', 'DROP', 'ALTER', 'ADD',
    'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'CONSTRAINT', 'DEFAULT',
    'NOT NULL', 'UNIQUE', 'CHECK'
  ],
  window: [
    'OVER', 'PARTITION BY', 'ROWS', 'RANGE', 'UNBOUNDED',
    'PRECEDING', 'FOLLOWING', 'CURRENT ROW'
  ],
  control: [
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ],
  orderDir: [
    'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST'
  ]
}

// DuckDB Functions organized by category
const DUCKDB_FUNCTIONS = {
  aggregate: [
    { name: 'COUNT', signature: 'COUNT(expression)', doc: 'Count non-null values' },
    { name: 'SUM', signature: 'SUM(expression)', doc: 'Sum of values' },
    { name: 'AVG', signature: 'AVG(expression)', doc: 'Average of values' },
    { name: 'MIN', signature: 'MIN(expression)', doc: 'Minimum value' },
    { name: 'MAX', signature: 'MAX(expression)', doc: 'Maximum value' },
    { name: 'STDDEV', signature: 'STDDEV(expression)', doc: 'Standard deviation' },
    { name: 'VARIANCE', signature: 'VARIANCE(expression)', doc: 'Variance' },
    { name: 'MEDIAN', signature: 'MEDIAN(expression)', doc: 'Median value' },
    { name: 'MODE', signature: 'MODE(expression)', doc: 'Most frequent value' },
    { name: 'STRING_AGG', signature: "STRING_AGG(expression, separator)", doc: 'Concatenate strings' },
    { name: 'ARRAY_AGG', signature: 'ARRAY_AGG(expression)', doc: 'Aggregate into array' },
    { name: 'LIST', signature: 'LIST(expression)', doc: 'Aggregate into list' },
    { name: 'FIRST', signature: 'FIRST(expression)', doc: 'First value in group' },
    { name: 'LAST', signature: 'LAST(expression)', doc: 'Last value in group' },
    { name: 'APPROX_COUNT_DISTINCT', signature: 'APPROX_COUNT_DISTINCT(expression)', doc: 'Approximate distinct count' },
    { name: 'ARG_MIN', signature: 'ARG_MIN(arg, val)', doc: 'Value of arg at min val' },
    { name: 'ARG_MAX', signature: 'ARG_MAX(arg, val)', doc: 'Value of arg at max val' }
  ],
  window: [
    { name: 'ROW_NUMBER', signature: 'ROW_NUMBER() OVER (...)', doc: 'Sequential row number' },
    { name: 'RANK', signature: 'RANK() OVER (...)', doc: 'Rank with gaps' },
    { name: 'DENSE_RANK', signature: 'DENSE_RANK() OVER (...)', doc: 'Rank without gaps' },
    { name: 'NTILE', signature: 'NTILE(n) OVER (...)', doc: 'Divide into n buckets' },
    { name: 'LAG', signature: 'LAG(expression, offset, default) OVER (...)', doc: 'Value from previous row' },
    { name: 'LEAD', signature: 'LEAD(expression, offset, default) OVER (...)', doc: 'Value from next row' },
    { name: 'FIRST_VALUE', signature: 'FIRST_VALUE(expression) OVER (...)', doc: 'First value in window' },
    { name: 'LAST_VALUE', signature: 'LAST_VALUE(expression) OVER (...)', doc: 'Last value in window' },
    { name: 'NTH_VALUE', signature: 'NTH_VALUE(expression, n) OVER (...)', doc: 'Nth value in window' },
    { name: 'PERCENT_RANK', signature: 'PERCENT_RANK() OVER (...)', doc: 'Relative rank (0-1)' },
    { name: 'CUME_DIST', signature: 'CUME_DIST() OVER (...)', doc: 'Cumulative distribution' }
  ],
  numeric: [
    { name: 'ROUND', signature: 'ROUND(number, decimals)', doc: 'Round to decimals' },
    { name: 'FLOOR', signature: 'FLOOR(number)', doc: 'Round down' },
    { name: 'CEIL', signature: 'CEIL(number)', doc: 'Round up' },
    { name: 'CEILING', signature: 'CEILING(number)', doc: 'Round up' },
    { name: 'TRUNC', signature: 'TRUNC(number, decimals)', doc: 'Truncate decimals' },
    { name: 'ABS', signature: 'ABS(number)', doc: 'Absolute value' },
    { name: 'SIGN', signature: 'SIGN(number)', doc: 'Sign (-1, 0, 1)' },
    { name: 'POWER', signature: 'POWER(base, exponent)', doc: 'Power function' },
    { name: 'SQRT', signature: 'SQRT(number)', doc: 'Square root' },
    { name: 'CBRT', signature: 'CBRT(number)', doc: 'Cube root' },
    { name: 'LN', signature: 'LN(number)', doc: 'Natural logarithm' },
    { name: 'LOG', signature: 'LOG(base, number)', doc: 'Logarithm' },
    { name: 'LOG10', signature: 'LOG10(number)', doc: 'Base-10 logarithm' },
    { name: 'LOG2', signature: 'LOG2(number)', doc: 'Base-2 logarithm' },
    { name: 'EXP', signature: 'EXP(number)', doc: 'e^number' },
    { name: 'MOD', signature: 'MOD(dividend, divisor)', doc: 'Modulo' },
    { name: 'PI', signature: 'PI()', doc: 'Value of PI' },
    { name: 'RANDOM', signature: 'RANDOM()', doc: 'Random number 0-1' },
    { name: 'GREATEST', signature: 'GREATEST(a, b, ...)', doc: 'Largest value' },
    { name: 'LEAST', signature: 'LEAST(a, b, ...)', doc: 'Smallest value' }
  ],
  string: [
    { name: 'LOWER', signature: 'LOWER(string)', doc: 'Convert to lowercase' },
    { name: 'UPPER', signature: 'UPPER(string)', doc: 'Convert to uppercase' },
    { name: 'INITCAP', signature: 'INITCAP(string)', doc: 'Capitalize words' },
    { name: 'TRIM', signature: 'TRIM(string)', doc: 'Remove whitespace' },
    { name: 'LTRIM', signature: 'LTRIM(string)', doc: 'Remove leading whitespace' },
    { name: 'RTRIM', signature: 'RTRIM(string)', doc: 'Remove trailing whitespace' },
    { name: 'LENGTH', signature: 'LENGTH(string)', doc: 'String length' },
    { name: 'CHAR_LENGTH', signature: 'CHAR_LENGTH(string)', doc: 'Character count' },
    { name: 'SUBSTRING', signature: 'SUBSTRING(string, start, length)', doc: 'Extract substring' },
    { name: 'LEFT', signature: 'LEFT(string, count)', doc: 'Left characters' },
    { name: 'RIGHT', signature: 'RIGHT(string, count)', doc: 'Right characters' },
    { name: 'CONCAT', signature: 'CONCAT(string1, string2, ...)', doc: 'Concatenate strings' },
    { name: 'CONCAT_WS', signature: "CONCAT_WS(separator, string1, ...)", doc: 'Concatenate with separator' },
    { name: 'REPLACE', signature: 'REPLACE(string, from, to)', doc: 'Replace substring' },
    { name: 'REGEXP_REPLACE', signature: 'REGEXP_REPLACE(string, pattern, replacement)', doc: 'Regex replace' },
    { name: 'REGEXP_EXTRACT', signature: 'REGEXP_EXTRACT(string, pattern)', doc: 'Extract regex match' },
    { name: 'REGEXP_MATCHES', signature: 'REGEXP_MATCHES(string, pattern)', doc: 'Check regex match' },
    { name: 'SPLIT_PART', signature: 'SPLIT_PART(string, delimiter, part)', doc: 'Get part after split' },
    { name: 'REPEAT', signature: 'REPEAT(string, count)', doc: 'Repeat string' },
    { name: 'REVERSE', signature: 'REVERSE(string)', doc: 'Reverse string' },
    { name: 'LPAD', signature: 'LPAD(string, length, pad)', doc: 'Pad left' },
    { name: 'RPAD', signature: 'RPAD(string, length, pad)', doc: 'Pad right' },
    { name: 'POSITION', signature: 'POSITION(substring IN string)', doc: 'Find position' },
    { name: 'STRPOS', signature: 'STRPOS(string, substring)', doc: 'Find position' },
    { name: 'STARTS_WITH', signature: 'STARTS_WITH(string, prefix)', doc: 'Check prefix' },
    { name: 'ENDS_WITH', signature: 'ENDS_WITH(string, suffix)', doc: 'Check suffix' },
    { name: 'CONTAINS', signature: 'CONTAINS(string, search)', doc: 'Check contains' },
    { name: 'PRINTF', signature: "PRINTF(format, ...)", doc: 'Format string' }
  ],
  datetime: [
    { name: 'NOW', signature: 'NOW()', doc: 'Current timestamp' },
    { name: 'CURRENT_DATE', signature: 'CURRENT_DATE', doc: 'Current date' },
    { name: 'CURRENT_TIME', signature: 'CURRENT_TIME', doc: 'Current time' },
    { name: 'CURRENT_TIMESTAMP', signature: 'CURRENT_TIMESTAMP', doc: 'Current timestamp' },
    { name: 'DATE', signature: 'DATE(expression)', doc: 'Convert to date' },
    { name: 'TIME', signature: 'TIME(expression)', doc: 'Convert to time' },
    { name: 'TIMESTAMP', signature: 'TIMESTAMP(expression)', doc: 'Convert to timestamp' },
    { name: 'YEAR', signature: 'YEAR(date)', doc: 'Extract year' },
    { name: 'MONTH', signature: 'MONTH(date)', doc: 'Extract month' },
    { name: 'DAY', signature: 'DAY(date)', doc: 'Extract day' },
    { name: 'DAYOFWEEK', signature: 'DAYOFWEEK(date)', doc: 'Day of week (1-7)' },
    { name: 'DAYOFYEAR', signature: 'DAYOFYEAR(date)', doc: 'Day of year' },
    { name: 'WEEK', signature: 'WEEK(date)', doc: 'Week of year' },
    { name: 'QUARTER', signature: 'QUARTER(date)', doc: 'Quarter (1-4)' },
    { name: 'HOUR', signature: 'HOUR(time)', doc: 'Extract hour' },
    { name: 'MINUTE', signature: 'MINUTE(time)', doc: 'Extract minute' },
    { name: 'SECOND', signature: 'SECOND(time)', doc: 'Extract second' },
    { name: 'EPOCH', signature: 'EPOCH(timestamp)', doc: 'Unix timestamp' },
    { name: 'DATE_PART', signature: "DATE_PART('part', date)", doc: 'Extract date part' },
    { name: 'DATE_TRUNC', signature: "DATE_TRUNC('precision', date)", doc: 'Truncate date' },
    { name: 'DATE_DIFF', signature: "DATE_DIFF('unit', start, end)", doc: 'Date difference' },
    { name: 'DATE_ADD', signature: "DATE_ADD(date, INTERVAL n unit)", doc: 'Add to date' },
    { name: 'DATE_SUB', signature: "DATE_SUB(date, INTERVAL n unit)", doc: 'Subtract from date' },
    { name: 'STRFTIME', signature: "STRFTIME(format, date)", doc: 'Format date' },
    { name: 'STRPTIME', signature: "STRPTIME(string, format)", doc: 'Parse date' },
    { name: 'AGE', signature: 'AGE(date1, date2)', doc: 'Interval between dates' },
    { name: 'MAKE_DATE', signature: 'MAKE_DATE(year, month, day)', doc: 'Create date' },
    { name: 'MAKE_TIME', signature: 'MAKE_TIME(hour, minute, second)', doc: 'Create time' },
    { name: 'MAKE_TIMESTAMP', signature: 'MAKE_TIMESTAMP(year, month, day, hour, minute, second)', doc: 'Create timestamp' }
  ],
  conditional: [
    { name: 'COALESCE', signature: 'COALESCE(value1, value2, ...)', doc: 'First non-null value' },
    { name: 'NULLIF', signature: 'NULLIF(value1, value2)', doc: 'Null if equal' },
    { name: 'IFNULL', signature: 'IFNULL(expression, default)', doc: 'Default if null' },
    { name: 'IIF', signature: 'IIF(condition, true_value, false_value)', doc: 'Inline if' },
    { name: 'IF', signature: 'IF(condition, true_value, false_value)', doc: 'Conditional' }
  ],
  conversion: [
    { name: 'CAST', signature: 'CAST(expression AS type)', doc: 'Convert type' },
    { name: 'TRY_CAST', signature: 'TRY_CAST(expression AS type)', doc: 'Convert or null' },
    { name: 'TYPEOF', signature: 'TYPEOF(expression)', doc: 'Get type name' }
  ],
  list: [
    { name: 'LIST_VALUE', signature: 'LIST_VALUE(value1, value2, ...)', doc: 'Create list' },
    { name: 'LIST_EXTRACT', signature: 'LIST_EXTRACT(list, index)', doc: 'Get list element' },
    { name: 'LIST_CONCAT', signature: 'LIST_CONCAT(list1, list2)', doc: 'Concatenate lists' },
    { name: 'LIST_CONTAINS', signature: 'LIST_CONTAINS(list, element)', doc: 'Check if contains' },
    { name: 'LIST_SORT', signature: 'LIST_SORT(list)', doc: 'Sort list' },
    { name: 'LIST_REVERSE', signature: 'LIST_REVERSE(list)', doc: 'Reverse list' },
    { name: 'LIST_DISTINCT', signature: 'LIST_DISTINCT(list)', doc: 'Unique elements' },
    { name: 'LEN', signature: 'LEN(list)', doc: 'List length' },
    { name: 'UNNEST', signature: 'UNNEST(list)', doc: 'Expand list to rows' }
  ],
  struct: [
    { name: 'STRUCT_PACK', signature: "STRUCT_PACK(key := value, ...)", doc: 'Create struct' },
    { name: 'STRUCT_EXTRACT', signature: "STRUCT_EXTRACT(struct, 'key')", doc: 'Get struct field' },
    { name: 'ROW', signature: 'ROW(value1, value2, ...)', doc: 'Create row' }
  ]
}

export interface TableSchema {
  name: string
  columns: Array<{ name: string; type: string }>
}

export interface SQLCompletionProvider {
  getTables: () => Promise<string[]>
  getTableSchema: (tableName: string) => Promise<Array<{ column_name: string; column_type: string }>>
}

/**
 * Query context information
 */
interface QueryContext {
  clause: 'SELECT' | 'FROM' | 'WHERE' | 'JOIN' | 'ORDER BY' | 'GROUP BY' | 'HAVING' | 'ON' | 'OTHER'
  tables: string[]
  aliases: Map<string, string>  // alias -> table name
  isAfterDot: boolean
  wordBeforeDot: string
}

/**
 * Parse query to extract context information
 */
function parseQueryContext(
  fullText: string,
  textBeforeCursor: string,
  tables: string[]
): QueryContext {
  const lowerText = textBeforeCursor.toLowerCase()
  const lowerFull = fullText.toLowerCase()

  // Determine current clause
  let clause: QueryContext['clause'] = 'OTHER'
  if (/\b(order\s+by)\s+[\w,\s.]*$/i.test(lowerText)) {
    clause = 'ORDER BY'
  } else if (/\b(group\s+by)\s+[\w,\s.]*$/i.test(lowerText)) {
    clause = 'GROUP BY'
  } else if (/\bhaving\s+[\w\s.(),]*$/i.test(lowerText)) {
    clause = 'HAVING'
  } else if (/\bwhere\s+[\w\s.(),]*$/i.test(lowerText)) {
    clause = 'WHERE'
  } else if (/\bon\s+[\w\s.(),]*$/i.test(lowerText)) {
    clause = 'ON'
  } else if (/\b(from|join)\s+\w*$/i.test(lowerText)) {
    clause = 'FROM'
  } else if (/\bselect\s+[\w,\s*().]*$/i.test(lowerText) && !/\bfrom\b/i.test(lowerText)) {
    clause = 'SELECT'
  }

  // Extract tables and aliases from query
  const foundTables: string[] = []
  const aliases = new Map<string, string>()

  // Match: FROM table [AS] alias, JOIN table [AS] alias
  const tablePattern = /\b(?:from|join)\s+(\w+)(?:\s+(?:as\s+)?(\w+))?/gi
  let match
  while ((match = tablePattern.exec(lowerFull)) !== null) {
    const tableName = match[1]
    const alias = match[2]
    if (tables.some(t => t.toLowerCase() === tableName)) {
      foundTables.push(tableName)
      if (alias) {
        aliases.set(alias.toLowerCase(), tableName)
      }
    }
  }

  // Check for dot notation
  const isAfterDot = textBeforeCursor.trimEnd().endsWith('.')
  const wordBeforeDot = isAfterDot
    ? (textBeforeCursor.slice(0, -1).split(/\s+/).pop() || '').toLowerCase()
    : ''

  return {
    clause,
    tables: foundTables,
    aliases,
    isAfterDot,
    wordBeforeDot
  }
}

/**
 * Create a Monaco completion item provider for SQL
 */
export function createSQLCompletionProvider(
  monaco: typeof import('monaco-editor'),
  provider: SQLCompletionProvider
): languages.CompletionItemProvider {
  return {
    triggerCharacters: ['.', ' ', '(', ','],

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

      const lineContent = model.getLineContent(position.lineNumber)
      const textBeforeCursor = lineContent.substring(0, position.column - 1)
      const fullText = model.getValue()

      const suggestions: languages.CompletionItem[] = []

      try {
        const tables = await provider.getTables()
        const ctx = parseQueryContext(fullText, textBeforeCursor, tables)

        // After dot: suggest columns from table/alias
        if (ctx.isAfterDot && ctx.wordBeforeDot) {
          // Resolve table name from alias or direct reference
          let tableName = ctx.aliases.get(ctx.wordBeforeDot)
          if (!tableName) {
            tableName = tables.find(t => t.toLowerCase() === ctx.wordBeforeDot)
          }

          if (tableName) {
            const schema = await provider.getTableSchema(tableName)
            schema.forEach(col => {
              const colName = col.column_name || (col as any).name
              const colType = col.column_type || (col as any).type
              suggestions.push({
                label: colName,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: colName,
                detail: colType,
                documentation: `Column from ${tableName}: ${colName} (${colType})`,
                sortText: '0' + colName, // Prioritize columns
                range
              })
            })
          }
          return { suggestions }
        }

        // FROM/JOIN clause: suggest table names
        if (ctx.clause === 'FROM') {
          tables.forEach(table => {
            suggestions.push({
              label: table,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: table,
              detail: 'Table',
              documentation: `Table: ${table}`,
              sortText: '0' + table,
              range
            })
          })
          return { suggestions }
        }

        // SELECT, WHERE, GROUP BY, ORDER BY, HAVING, ON: suggest columns first
        if (['SELECT', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'ON'].includes(ctx.clause)) {
          // Suggest columns from tables in query
          for (const tableName of ctx.tables) {
            try {
              const schema = await provider.getTableSchema(tableName)
              schema.forEach(col => {
                const colName = col.column_name || (col as any).name
                const colType = col.column_type || (col as any).type
                suggestions.push({
                  label: colName,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: colName,
                  detail: `${colType} (${tableName})`,
                  documentation: `Column: ${colName} (${colType}) from ${tableName}`,
                  sortText: '0' + colName,
                  range
                })

                // Also suggest with table prefix
                suggestions.push({
                  label: `${tableName}.${colName}`,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: `${tableName}.${colName}`,
                  detail: colType,
                  documentation: `Column: ${tableName}.${colName} (${colType})`,
                  sortText: '1' + colName,
                  range
                })
              })
            } catch {
              // Ignore schema errors
            }
          }

          // For ORDER BY, add ASC/DESC
          if (ctx.clause === 'ORDER BY') {
            SQL_KEYWORDS.orderDir.forEach(dir => {
              suggestions.push({
                label: dir,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: dir,
                detail: 'Order direction',
                sortText: '2' + dir,
                range
              })
            })
          }
        }

        // Add all functions
        const allFunctions = [
          ...DUCKDB_FUNCTIONS.aggregate,
          ...DUCKDB_FUNCTIONS.window,
          ...DUCKDB_FUNCTIONS.numeric,
          ...DUCKDB_FUNCTIONS.string,
          ...DUCKDB_FUNCTIONS.datetime,
          ...DUCKDB_FUNCTIONS.conditional,
          ...DUCKDB_FUNCTIONS.conversion,
          ...DUCKDB_FUNCTIONS.list,
          ...DUCKDB_FUNCTIONS.struct
        ]

        allFunctions.forEach(func => {
          suggestions.push({
            label: func.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func.name + '($0)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: func.signature,
            documentation: `${func.doc}\n\nSignature: ${func.signature}`,
            sortText: '3' + func.name,
            range
          })
        })

        // Add all keywords
        const allKeywords = [
          ...SQL_KEYWORDS.clauses,
          ...SQL_KEYWORDS.joins,
          ...SQL_KEYWORDS.operators,
          ...SQL_KEYWORDS.setOps,
          ...SQL_KEYWORDS.dml,
          ...SQL_KEYWORDS.ddl,
          ...SQL_KEYWORDS.window,
          ...SQL_KEYWORDS.control
        ]

        allKeywords.forEach(keyword => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: 'SQL Keyword',
            sortText: '4' + keyword,
            range
          })
        })

        // Add table names (lower priority in general context)
        tables.forEach(table => {
          suggestions.push({
            label: table,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table,
            detail: 'Table',
            documentation: `Table: ${table}`,
            sortText: '5' + table,
            range
          })
        })

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
