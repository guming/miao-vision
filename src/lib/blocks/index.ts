/**
 * Block Registry Index
 *
 * Re-exports the block registry.
 * Component registration is now handled by init-components.ts using the adapter layer.
 */

export { blockRegistry, shouldCreatePlaceholder } from './registry'
export type { BlockDefinition, BlockParser, BlockRenderer, RenderContext } from './registry'

// Note: Component registration moved to src/lib/core/init-components.ts
// Components are registered using the new adapter layer (defineComponent)
