/**
 * Slider Component Types
 */

export interface SliderConfig {
  name: string              // Input variable name
  min?: number              // Minimum value (default: 0)
  max?: number              // Maximum value (default: 100)
  step?: number             // Step increment (default: 1)
  defaultValue?: number     // Default value
  title?: string            // Display title
  showValue?: boolean       // Show current value (default: true)
  showMinMax?: boolean      // Show min/max labels (default: true)
  format?: 'number' | 'currency' | 'percent'  // Value format
}

export interface SliderData {
  config: SliderConfig
}
