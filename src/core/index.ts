/**
 * Core Module - Miaoshou Vision Engine
 *
 * Central export point for core framework functionality.
 * Plugins should import from @core instead of individual files.
 */

// Registry - Component registration system
export {
  ComponentRegistry,
  componentRegistry,
  shouldCreatePlaceholder,
  createMetadata,
  type ComponentMetadata,
  type ComponentCategory,
  type PropType,
  type PropDefinition,
  type RegisteredComponent,
  type RenderContext,
  type ComponentParser,
  type ComponentRenderer
} from './registry/component-registry'

export {
  defineComponent,
  createRegistration,
  type ComponentDefinition,
  type DataBinding,
  type ExtendedRenderContext
} from './registry/component-definition'

export { configParser, type ConfigSchema } from './registry/config-parser'
export { dataResolver, type ResolveResult, type SelectOption } from './registry/data-resolver'
export { componentMount } from './registry/component-mount'
export { placeholderFactory } from './registry/placeholder-factory'
export * from './registry/schemas'

// Engine - Execution engine
export { blockRenderer, type BlockRenderContext } from './engine/block-renderer'

// Database (uses new connector system via compat layer)
export {
  duckDBManager,
  DuckDBManager,
  loadDataIntoTable,
  dropTable,
  initializeMosaic,
  isMosaicInitialized,
  coordinator,
  getVgplotContext
} from './database'
export { interpolateSQL } from './database/template'

// Connectors (new pluggable connector system)
export {
  // Connector types
  type Connector,
  type ConnectorConfig,
  type ConnectorType,
  type ConnectionStatus,
  type QueryResult as ConnectorQueryResult,
  type QueryOptions,
  // WasmConnector
  WasmConnector,
  createWasmConnector,
  isOPFSSupported,
  // Registry
  ConnectorRegistry,
  // Result utilities
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr
} from './connectors'

// Markdown
export { parseMarkdown } from './markdown/parser'

// Shared utilities
export * from './shared/pure'

// Format system
export {
  fmt,
  formatters,
  createFormatter,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact,
  formatBytes,
  formatDate,
  formatDateTime,
  formatRelative,
  type FormatType,
  type FormatOptions
} from './shared/format'
