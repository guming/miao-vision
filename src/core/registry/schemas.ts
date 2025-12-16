/**
 * Component Configuration Schemas
 *
 * Pre-defined schemas for all component types.
 * These schemas drive the ConfigParser to validate and parse component configurations.
 */

import type { ConfigSchema } from './config-parser'

/**
 * Dropdown component schema
 *
 * Example:
 * ```dropdown
 * name: category_filter
 * data: categories_query
 * value: category_id
 * label: category_name
 * defaultValue: all
 * ```
 */
export const DropdownSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'data', type: 'string', required: true },
    { name: 'value', type: 'string', required: true },
    { name: 'label', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'defaultValue', type: 'string' }
  ]
}

/**
 * ButtonGroup component schema
 *
 * Example with static options:
 * ```buttongroup
 * name: time_range
 * defaultValue: 7d
 * options:
 *   - 1d: Last Day
 *   - 7d: Last Week
 *   - 30d: Last Month
 * ```
 *
 * Example with dynamic data:
 * ```buttongroup
 * name: region_filter
 * data: regions_query
 * value: region_code
 * label: region_name
 * ```
 */
export const ButtonGroupSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'data', type: 'string' },
    { name: 'value', type: 'string' },
    { name: 'label', type: 'string' },
    { name: 'defaultValue', type: 'string' },
    { name: 'title', type: 'string' }
  ],
  sections: [
    {
      name: 'options',
      itemFields: [
        { name: 'value', type: 'string', required: true },
        { name: 'label', type: 'string' }
      ]
    }
  ]
}

/**
 * BigValue component schema
 *
 * Example:
 * ```bigvalue
 * query: total_sales
 * value: sum_amount
 * title: Total Revenue
 * format: currency
 * comparison: last_month_sales
 * comparisonLabel: vs last month
 * ```
 */
export const BigValueSchema: ConfigSchema = {
  fields: [
    { name: 'query', type: 'string', required: true },
    { name: 'value', type: 'string', required: true },
    { name: 'title', type: 'string' },
    {
      name: 'format',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'comparison', type: 'string' },
    { name: 'comparisonLabel', type: 'string' }
  ]
}

/**
 * Value component schema
 *
 * Example:
 * ```value
 * query: metrics
 * column: active_users
 * format: number
 * prefix: $
 * suffix: USD
 * ```
 */
export const ValueSchema: ConfigSchema = {
  fields: [
    { name: 'query', type: 'string', required: true },
    { name: 'column', type: 'string', required: true },
    { name: 'row', type: 'number', default: 0 },
    { name: 'format', type: 'enum', enum: ['number', 'currency', 'percent', 'date', 'text'] },
    { name: 'prefix', type: 'string' },
    { name: 'suffix', type: 'string' },
    { name: 'placeholder', type: 'string', default: '-' }
  ]
}

/**
 * DataTable component schema
 *
 * Example:
 * ```datatable
 * query: sales_data
 * searchable: true
 * sortable: true
 * exportable: true
 * rowHeight: 36
 * maxHeight: 600
 * columns:
 *   - name: order_id
 *     label: Order ID
 *     align: left
 *   - name: amount
 *     label: Amount
 *     format: currency
 *     align: right
 *   - name: created_at
 *     label: Date
 *     format: date
 * ```
 */
export const DataTableSchema: ConfigSchema = {
  fields: [
    { name: 'query', type: 'string', required: true },
    { name: 'searchable', type: 'boolean', default: true },
    { name: 'sortable', type: 'boolean', default: true },
    { name: 'exportable', type: 'boolean', default: true },
    { name: 'paginate', type: 'boolean', default: true },
    { name: 'pageSize', type: 'number', default: 10 },
    { name: 'rowHeight', type: 'number', default: 36 },
    { name: 'maxHeight', type: 'number', default: 600 }
  ],
  sections: [
    {
      name: 'columns',
      itemFields: [
        { name: 'name', type: 'string', required: true },
        { name: 'label', type: 'string' },
        {
          name: 'format',
          type: 'enum',
          enum: ['number', 'currency', 'percent', 'date', 'text']
        },
        { name: 'align', type: 'enum', enum: ['left', 'right', 'center'] },
        { name: 'width', type: 'string' }
      ]
    }
  ]
}

/**
 * Alert component schema
 *
 * Example:
 * ```alert
 * type: warning
 * title: Important Notice
 * ```
 * This is the alert message content.
 */
export const AlertSchema: ConfigSchema = {
  fields: [
    {
      name: 'type',
      type: 'enum',
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info'
    },
    { name: 'title', type: 'string' }
  ]
}

/**
 * Slider input schema
 *
 * Example:
 * ```slider
 * name: price_range
 * title: Maximum Price
 * min: 0
 * max: 1000
 * step: 10
 * defaultValue: 500
 * format: currency
 * ```
 */
export const SliderSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'min', type: 'number', default: 0 },
    { name: 'max', type: 'number', default: 100 },
    { name: 'step', type: 'number', default: 1 },
    { name: 'defaultValue', type: 'number' },
    { name: 'showValue', type: 'boolean', default: true },
    { name: 'showMinMax', type: 'boolean', default: true },
    { name: 'format', type: 'enum', enum: ['number', 'currency', 'percent'], default: 'number' }
  ]
}

/**
 * Checkbox input schema
 *
 * Example:
 * ```checkbox
 * name: include_inactive
 * label: Include inactive items
 * defaultValue: false
 * ```
 */
export const CheckboxSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'label', type: 'string' },
    { name: 'defaultValue', type: 'boolean', default: false }
  ]
}

/**
 * TextInput schema
 *
 * Example:
 * ```textinput
 * name: search_query
 * title: Search Products
 * placeholder: Search...
 * debounce: 300
 * ```
 */
export const TextInputSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'placeholder', type: 'string' },
    { name: 'defaultValue', type: 'string', default: '' },
    { name: 'debounce', type: 'number', default: 300 },
    { name: 'minLength', type: 'number', default: 0 },
    { name: 'maxLength', type: 'number' },
    { name: 'inputType', type: 'enum', enum: ['text', 'search', 'email', 'url', 'tel'], default: 'text' }
  ]
}

/**
 * DateRange input schema
 *
 * Example:
 * ```daterange
 * name: date_filter
 * title: Select Date Range
 * startDefault: 2024-01-01
 * endDefault: 2024-12-31
 * presets: true
 * ```
 */
export const DateRangeSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'startDefault', type: 'string' },
    { name: 'endDefault', type: 'string' },
    { name: 'minDate', type: 'string' },
    { name: 'maxDate', type: 'string' },
    { name: 'presets', type: 'boolean', default: false }
  ]
}

/**
 * Chart component schema (generic)
 *
 * Example:
 * ```chart
 * data: sales_by_month
 * x: month
 * y: revenue
 * type: line
 * ```
 */
export const ChartSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'x', type: 'string', required: true },
    { name: 'y', type: 'string', required: true },
    {
      name: 'type',
      type: 'enum',
      enum: ['line', 'bar', 'area', 'scatter', 'pie'],
      default: 'line'
    },
    { name: 'color', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'xLabel', type: 'string' },
    { name: 'yLabel', type: 'string' }
  ]
}

/**
 * Schema registry - maps component types to their schemas
 */
export const SchemaRegistry: Record<string, ConfigSchema> = {
  dropdown: DropdownSchema,
  buttongroup: ButtonGroupSchema,
  bigvalue: BigValueSchema,
  value: ValueSchema,
  datatable: DataTableSchema,
  alert: AlertSchema,
  slider: SliderSchema,
  checkbox: CheckboxSchema,
  textinput: TextInputSchema,
  daterange: DateRangeSchema,
  chart: ChartSchema
}

/**
 * Get schema by component type
 */
export function getSchema(componentType: string): ConfigSchema | undefined {
  return SchemaRegistry[componentType.toLowerCase()]
}

/**
 * Check if a schema exists for a component type
 */
export function hasSchema(componentType: string): boolean {
  return componentType.toLowerCase() in SchemaRegistry
}
