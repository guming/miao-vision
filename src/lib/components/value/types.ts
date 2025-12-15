/**
 * Value Component Types
 */

export interface ValueConfig {
  data: string            // SQL result name to use as data source
  column: string          // Column name to extract the value from
  row?: number            // Row index (default: 0)
  format?: 'auto' | 'number' | 'currency' | 'percent' | 'date' | 'text'
  precision?: number      // Decimal precision (default: 2)
  prefix?: string         // Text before value
  suffix?: string         // Text after value
  placeholder?: string    // Text when value is null (default: '-')
  class?: string          // Additional CSS classes
}

export interface ValueData {
  value: any              // The extracted value
  config: ValueConfig     // Configuration
}
