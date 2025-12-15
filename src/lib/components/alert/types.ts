/**
 * Alert Component Types
 */

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'tip' | 'note'

export interface AlertConfig {
  type?: AlertType
  title?: string
  icon?: boolean
  dismissible?: boolean
}

export interface AlertData {
  config: AlertConfig
  content: string  // HTML content to display
}
