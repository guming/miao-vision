/**
 * Registry Module
 *
 * Component registration and rendering infrastructure.
 */

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
} from './component-registry'

export {
  defineComponent,
  createRegistration,
  type ComponentDefinition,
  type DataBinding,
  type ExtendedRenderContext
} from './component-definition'

export { configParser, type ConfigSchema } from './config-parser'
export { dataResolver, type ResolveResult, type SelectOption } from './data-resolver'
export { componentMount } from './component-mount'
export { placeholderFactory } from './placeholder-factory'
export * from './schemas'
