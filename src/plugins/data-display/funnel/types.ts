/**
 * Funnel Component Types
 *
 * Configuration and data types for the Funnel visualization.
 */

/**
 * Funnel component configuration from markdown
 */
export interface FunnelConfig {
  /** Query name providing the data */
  data: string

  /** Column containing stage names/labels */
  nameColumn: string

  /** Column containing stage values */
  valueColumn: string

  /** Chart title */
  title?: string

  /** Chart subtitle */
  subtitle?: string

  /** Show value labels on bars */
  showValues?: boolean

  /** Show percentage labels */
  showPercent?: boolean

  /** Percentage base: 'first' (vs first stage) or 'previous' (vs previous stage) */
  percentBase?: 'first' | 'previous'

  /** Number format for values */
  valueFormat?: 'number' | 'currency' | 'percent'

  /** Currency symbol for currency format */
  currencySymbol?: string

  /** Number of decimal places */
  decimals?: number

  /** Color scheme: 'default', 'gradient', or custom colors */
  colorScheme?: 'default' | 'gradient' | 'blue' | 'green' | 'orange'

  /** Custom colors array (overrides colorScheme) */
  colors?: string[]

  /** Funnel alignment: 'center', 'left', 'right' */
  align?: 'center' | 'left' | 'right'

  /** Height in pixels */
  height?: number

  /** Show connector lines between stages */
  showConnectors?: boolean

  /** Additional CSS class */
  class?: string
}

/**
 * Individual funnel stage data
 */
export interface FunnelStage {
  /** Stage name/label */
  name: string

  /** Stage value */
  value: number

  /** Percentage of first stage (conversion rate) */
  percentOfFirst: number

  /** Percentage of previous stage (step conversion) */
  percentOfPrevious: number

  /** Formatted value string */
  formattedValue: string

  /** Width as percentage (0-100) */
  widthPercent: number

  /** Color for this stage */
  color: string
}

/**
 * Processed funnel data passed to component
 */
export interface FunnelData {
  /** Array of funnel stages */
  stages: FunnelStage[]

  /** Title */
  title?: string

  /** Subtitle */
  subtitle?: string

  /** Total conversion rate (last/first) */
  totalConversion: number

  /** Component configuration */
  config: FunnelConfig
}
