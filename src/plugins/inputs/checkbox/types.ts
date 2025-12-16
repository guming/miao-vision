/**
 * Checkbox Component Types
 */

export interface CheckboxConfig {
  name: string           // Input variable name
  label?: string         // Display label
  defaultValue?: boolean // Default checked state
  description?: string   // Optional description text
}

export interface CheckboxData {
  config: CheckboxConfig
}
