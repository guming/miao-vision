/**
 * DataTable Component Metadata
 */

import { createMetadata } from '@core/registry'

export const DataTableMetadata = createMetadata({
  type: 'data-viz',
  language: 'datatable',
  displayName: 'Data Table',
  description: 'Display query results in a rich, interactive table with search, sort, and export',
  icon: '📋',
  category: 'table',
  tags: ['data-viz', 'table', 'grid', 'data'],
  props: [
    {
      name: 'query',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_data', 'customer_list']
    },
    {
      name: 'columns',
      type: 'array',
      required: false,
      description: 'Column configuration (name, label, format, align)',
      examples: ['[{"name": "month", "label": "Month"}]']
    },
    {
      name: 'searchable',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable search functionality'
    },
    {
      name: 'sortable',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable column sorting'
    },
    {
      name: 'exportable',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable CSV export'
    },
    {
      name: 'filterable',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable column-level filtering'
    },
    {
      name: 'summaryRow',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable summary row at bottom'
    },
    {
      name: 'maxHeight',
      type: 'number',
      required: false,
      default: 600,
      description: 'Max table height in pixels'
    }
  ],
  examples: [
    `\`\`\`datatable
query: sales_data
searchable: true
sortable: true
exportable: true
columns:
  - name: month
    label: Month
    format: text
  - name: revenue
    label: Revenue
    format: currency
    align: right
\`\`\``
  ]
})
