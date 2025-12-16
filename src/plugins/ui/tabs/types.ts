/**
 * Tabs Component Types
 */

export interface TabsConfig {
  defaultTab?: number      // Default active tab index (0-based)
  variant?: 'default' | 'pills' | 'underline'  // Tab style
  fullWidth?: boolean      // Tabs take full width
  lazy?: boolean           // Only render active tab content
}

export interface TabConfig {
  label: string           // Tab label
  icon?: string           // Optional icon
  disabled?: boolean      // Disabled state
}

export interface TabsData {
  config: TabsConfig
  tabs: TabConfig[]
  contents: string[]      // HTML content for each tab
}
