/**
 * ButtonGroup Component Types
 */

export interface ButtonGroupOption {
  value: string
  label: string
}

export interface ButtonGroupConfig {
  name: string                  // Input variable name
  title?: string                // Display title
  data?: string                 // SQL data source name (alternative to inline options)
  value?: string                // Value column name (if using SQL data)
  label?: string                // Label column name (if using SQL data)
  options?: ButtonGroupOption[] // Inline options (alternative to SQL data)
  defaultValue?: string
}

export interface ButtonGroupData {
  config: ButtonGroupConfig
  options: ButtonGroupOption[]
}
