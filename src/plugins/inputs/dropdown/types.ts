/**
 * Dropdown Component Types
 */

export interface DropdownConfig {
  name: string                  // Input variable name (e.g., 'selected_region')
  data: string                  // SQL result name to use as data source
  value: string                 // Column name for option values
  label?: string                // Column name for option labels (default: same as value)
  title?: string                // Display title above dropdown
  placeholder?: string          // Placeholder text (default: "Select...")
  defaultValue?: string | null  // Default selected value
  multiple?: boolean            // Allow multiple selections (default: false)
}

export interface DropdownOption {
  value: string
  label: string
}

export interface DropdownData {
  config: DropdownConfig
  options: DropdownOption[]
}
