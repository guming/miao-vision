/**
 * Tooltip Component Types
 */

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipConfig {
  text: string            // Tooltip text content
  position?: TooltipPosition  // Position relative to trigger (default: top)
  icon?: string           // Optional icon to show with trigger
  trigger?: string        // Trigger text/label
  delay?: number          // Delay before showing (ms, default: 200)
}

export interface TooltipData {
  config: TooltipConfig
  text: string
  trigger: string
  icon?: string
}
