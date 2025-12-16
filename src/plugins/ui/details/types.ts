/**
 * Details Component Types
 */

export interface DetailsConfig {
  title: string            // Section title (required)
  icon?: string            // Optional icon
  defaultOpen?: boolean    // Default expanded state (default: false)
  bordered?: boolean       // Show border (default: true)
}

export interface DetailsData {
  config: DetailsConfig
  content: string          // HTML content
}
