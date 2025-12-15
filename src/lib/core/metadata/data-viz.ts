/**
 * Data Visualization Component Metadata Definitions
 */

import { createMetadata, type ComponentMetadata } from '../component-registry'

/**
 * Big Value
 */
export const BigValueMetadata = createMetadata({
  type: 'data-viz',
  language: 'bigvalue',
  displayName: 'Big Value',
  description: 'Display a single large metric value with optional formatting',
  icon: '🔢',
  category: 'metric',
  tags: ['data-viz', 'metric', 'kpi', 'number'],
  props: [
    {
      name: 'query',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data (should return single row)',
      examples: ['total_revenue', 'user_count']
    },
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Column name containing the value to display',
      examples: ['revenue', 'total', 'count']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Title displayed above the value',
      examples: ['Total Revenue', 'Active Users', 'YTD Sales']
    },
    {
      name: 'format',
      type: 'string',
      required: false,
      default: 'number',
      description: 'Value format type',
      options: ['number', 'currency', 'percent', 'text']
    },
    {
      name: 'prefix',
      type: 'string',
      required: false,
      description: 'Text to display before the value',
      examples: ['$', '€', '#']
    },
    {
      name: 'suffix',
      type: 'string',
      required: false,
      description: 'Text to display after the value',
      examples: ['%', ' users', ' items']
    },
    {
      name: 'decimals',
      type: 'number',
      required: false,
      description: 'Number of decimal places to display'
    }
  ],
  examples: [
    `\`\`\`bigvalue
query: total_revenue
value: revenue
title: Total Revenue
format: currency
\`\`\``
  ]
})

/**
 * Data Table
 */
export const DataTableMetadata = createMetadata({
  type: 'data-viz',
  language: 'datatable',
  displayName: 'Data Table',
  description: 'Display query results in a rich, interactive table',
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
      default: false,
      description: 'Enable search functionality'
    },
    {
      name: 'sortable',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable column sorting'
    },
    {
      name: 'exportable',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable CSV export'
    },
    {
      name: 'pageSize',
      type: 'number',
      required: false,
      default: 10,
      description: 'Rows per page'
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
\`\`\``
  ]
})

/**
 * All data-viz metadata
 */
export const DATA_VIZ_METADATA: ComponentMetadata[] = [
  BigValueMetadata,
  DataTableMetadata
]
