/**
 * TextInput Component Types
 */

export interface TextInputConfig {
  name: string              // Input variable name (e.g., 'search_term')
  title?: string            // Display title above input
  placeholder?: string      // Placeholder text
  defaultValue?: string     // Default value
  debounce?: number         // Debounce delay in ms (default: 300)
  minLength?: number        // Minimum input length to trigger update
  maxLength?: number        // Maximum input length
  pattern?: string          // Regex pattern for validation
  inputType?: 'text' | 'search' | 'email' | 'url' | 'tel'  // HTML input type
}

export interface TextInputData {
  config: TextInputConfig
}
