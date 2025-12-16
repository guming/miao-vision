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

// Database
export { duckDBManager, DuckDBManager } from './database/duckdb'
export { loadDataIntoTable, dropTable } from './database/table-loader'
export {
  initializeMosaic,
  isMosaicInitialized,
  coordinator,
  getVgplotContext
} from './database/mosaic'
export { interpolateSQL } from './database/template'

// Markdown
export { parseMarkdown } from './markdown/parser'

// Shared utilities
export * from './shared/pure'
