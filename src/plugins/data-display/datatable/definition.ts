/**
 * DataTable Component Definition (Adapter Layer)
 *
 * Declarative component definition using the new adapter layer.
 */

import { defineComponent, DataTableSchema } from '@core/registry'
import { DataTableMetadata } from './metadata'
import DataTable from './DataTable.svelte'
import { inferColumnType } from './formatter'
import type {
  DataTableConfig,
  DataTableData,
  ColumnConfig,
  ColumnMeta,
  FormatType,
  DrilldownConfig,
  DrilldownMapping
} from './types'

/**
 * Props passed to DataTable.svelte
 */
interface DataTableProps {
  data: DataTableData
  inputStore?: any
}

/**
 * Map column type to default format
 */
function typeToFormat(type: ColumnMeta['type']): FormatType {
  switch (type) {
    case 'number':
      return 'number'
    case 'date':
      return 'date'
    case 'boolean':
      return 'text'
    default:
      return 'text'
  }
}

/**
 * Auto-detect column metadata from data
 */
function detectColumnMetadata(data: any[], columns: string[]): ColumnMeta[] {
  return columns.map(colName => {
    const values = data.map(row => row[colName])
    const type = inferColumnType(values)
    const sample = values.filter(v => v !== null && v !== undefined).slice(0, 5)

    return {
      name: colName,
      type,
      sample
    }
  })
}

/**
 * Parse drilldown configuration from block content
 */
function parseDrilldownConfig(content: string): DrilldownConfig | undefined {
  const lines = content.split('\n')
  let inDrilldown = false
  let inMappings = false
  const mappings: DrilldownMapping[] = []
  let cursor: 'pointer' | 'zoom-in' = 'pointer'
  let highlight = true
  let tooltip: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()

    // Start of drilldown section
    if (trimmed === 'drilldown:' || trimmed.startsWith('drilldown:')) {
      inDrilldown = true
      const afterColon = trimmed.substring(10).trim()
      if (afterColon === 'false') {
        return undefined
      }
      continue
    }

    // Stop at next top-level key
    if (inDrilldown && !trimmed.startsWith('-') && !trimmed.startsWith(' ') && trimmed.includes(':') && !trimmed.startsWith('drilldown')) {
      if (!trimmed.startsWith('cursor') && !trimmed.startsWith('highlight') && !trimmed.startsWith('tooltip') && !trimmed.startsWith('mappings')) {
        break
      }
    }

    if (!inDrilldown) continue

    // Parse mappings list
    if (trimmed === 'mappings:') {
      inMappings = true
      continue
    }

    // Parse mapping item: "- column → inputName" or "- column: inputName"
    if (inMappings && trimmed.startsWith('-')) {
      const mapping = trimmed.substring(1).trim()
      const arrowMatch = mapping.match(/^(\w+)\s*[→:]\s*(\w+)(?:\s*\((\w+)\))?$/)
      if (arrowMatch) {
        mappings.push({
          column: arrowMatch[1],
          inputName: arrowMatch[2],
          transform: arrowMatch[3] as 'string' | 'number' | 'date' | undefined
        })
      }
      continue
    }

    // Parse other drilldown properties
    if (trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':')
      const key = trimmed.substring(0, colonIdx).trim()
      const value = trimmed.substring(colonIdx + 1).trim()

      switch (key) {
        case 'cursor':
          if (value === 'pointer' || value === 'zoom-in') {
            cursor = value
          }
          break
        case 'highlight':
          highlight = value !== 'false'
          break
        case 'tooltip':
          tooltip = value
          break
      }
    }
  }

  // Only return config if we have mappings
  if (mappings.length > 0) {
    return {
      enabled: true,
      mappings,
      cursor,
      highlight,
      tooltip
    }
  }

  return undefined
}

/**
 * Merge user-defined columns with auto-detected metadata
 */
function mergeColumnConfig(
  userColumns: ColumnConfig[] | undefined,
  metadata: ColumnMeta[]
): ColumnConfig[] {
  if (!userColumns || userColumns.length === 0) {
    return metadata.map(meta => ({
      name: meta.name,
      label: meta.name,
      format: typeToFormat(meta.type),
      align: meta.type === 'number' ? 'right' : 'left'
    }))
  }

  const columnMap = new Map(userColumns.map(col => [col.name, col]))

  return metadata.map(meta => {
    const userCol = columnMap.get(meta.name)

    return {
      name: meta.name,
      label: userCol?.label || meta.name,
      format: userCol?.format || typeToFormat(meta.type),
      align: userCol?.align || (meta.type === 'number' ? 'right' : 'left'),
      width: userCol?.width,
      visible: userCol?.visible,
      resizable: userCol?.resizable,
      summary: userCol?.summary,
      conditionalFormat: userCol?.conditionalFormat,
      showDataBar: userCol?.showDataBar,
      colorScale: userCol?.colorScale,
      iconSet: userCol?.iconSet
    }
  })
}

/**
 * DataTable component registration using adapter layer
 */
export const dataTableRegistration = defineComponent<DataTableConfig, DataTableProps>({
  metadata: DataTableMetadata,
  configSchema: DataTableSchema,
  component: DataTable,
  containerClass: 'datatable-wrapper',

  // Data binding: extract table data from SQL query result
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, config) => {
      const { columns, data } = queryResult

      // Auto-detect column metadata
      const metadata = detectColumnMetadata(data, columns)

      // Merge with user-defined column config
      const finalColumns = mergeColumnConfig(config.columns, metadata)

      return {
        columns: finalColumns,
        rows: data,
        metadata
      }
    }
  },

  // Build props
  buildProps: (config, extractedData, context) => {
    if (!extractedData) return null

    const { columns, rows } = extractedData as {
      columns: ColumnConfig[]
      rows: any[]
      metadata: ColumnMeta[]
    }

    // Parse drilldown config from block content
    const block = (context as any).block
    let drilldown = config.drilldown
    if (!drilldown && block?.content) {
      drilldown = parseDrilldownConfig(block.content)
    }

    // Get inputStore from context for drill-down
    const inputStore = (context as any).inputStore

    return {
      data: {
        config: {
          ...config,
          drilldown
        },
        columns,
        rows,
        filteredRows: rows,
        sortState: null,
        searchQuery: ''
      },
      inputStore
    }
  }
})

export default dataTableRegistration
