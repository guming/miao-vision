/**
 * Adapters Layer
 *
 * Unified abstraction layer for component configuration, data resolution,
 * mounting, and placeholder generation.
 *
 * This layer eliminates duplicate code across component parsers and renderers.
 */

// Layer 1: Configuration Parsing
export {
  ConfigParser,
  configParser,
  type FieldType,
  type FieldSchema,
  type SectionSchema,
  type ConfigSchema,
  type ParseResult
} from './config-parser'

// Pre-defined Schemas
export {
  DropdownSchema,
  ButtonGroupSchema,
  BigValueSchema,
  ValueSchema,
  DataTableSchema,
  AlertSchema,
  SliderSchema,
  CheckboxSchema,
  TextInputSchema,
  DateRangeSchema,
  ChartSchema,
  SchemaRegistry,
  getSchema,
  hasSchema
} from './schemas'

// Layer 2: Data Resolution
export {
  DataResolver,
  dataResolver,
  type ResolveResult,
  type SelectResolveOptions,
  type SelectOption,
  type SingleValueOptions,
  type TableData,
  type DataSourceStatus
} from './data-resolver'

// Layer 3: Placeholder Generation
export {
  PlaceholderFactory,
  placeholderFactory,
  type PlaceholderType,
  type PlaceholderOptions
} from './placeholder-factory'

// Layer 4: Component Mounting
export {
  ComponentMount,
  componentMount,
  quickMount,
  mountReplace,
  type MountedComponent,
  type MountOptions
} from './component-mount'

// Layer 5: Component Definition
export {
  createRegistration,
  defineComponent,
  createSelectOptionsTransform,
  createSingleValueTransform,
  createTableDataTransform,
  hasProps,
  type ComponentDefinition,
  type DataBinding,
  type ExtendedRenderContext
} from './component-definition'
