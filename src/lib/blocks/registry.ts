/**
 * Block Registry System
 *
 * Extensible system for registering and rendering different block types
 * This allows easy addition of new component types without modifying core renderer
 */

import type { ParsedCodeBlock, ReportBlock } from '@/types/report'

/**
 * Context passed to block parsers and renderers
 */
export interface RenderContext {
  blocks: ReportBlock[]           // All executed blocks in the report
  inputs: Record<string, any>     // Current input values
  metadata: Record<string, any>   // Report metadata
}

/**
 * Block parser function type
 * Takes a parsed code block and context, returns component props
 */
export type BlockParser<T = any> = (
  block: ParsedCodeBlock,
  context: RenderContext
) => T | null

/**
 * Block renderer function type
 * Takes a container element and data, mounts the component
 */
export type BlockRenderer<T = any> = (
  container: HTMLElement,
  data: T,
  context: RenderContext
) => void | Promise<void>

/**
 * Block definition
 */
export interface BlockDefinition<T = any> {
  language: string                // Code block language identifier (e.g., 'bigvalue', 'dropdown')
  parser: BlockParser<T>          // Parse code block content into component props
  renderer: BlockRenderer<T>      // Render component to DOM
  description?: string            // Human-readable description
}

/**
 * Global block registry
 */
class BlockRegistry {
  private blocks = new Map<string, BlockDefinition>()

  /**
   * Register a new block type
   */
  register<T = any>(definition: BlockDefinition<T>): void {
    if (this.blocks.has(definition.language)) {
      console.warn(`Block type "${definition.language}" is already registered. Overwriting.`)
    }
    this.blocks.set(definition.language, definition)
    console.log(`✅ Registered block type: ${definition.language}`)
  }

  /**
   * Get block definition by language
   */
  get(language: string): BlockDefinition | undefined {
    return this.blocks.get(language)
  }

  /**
   * Check if a block type is registered
   */
  has(language: string): boolean {
    return this.blocks.has(language)
  }

  /**
   * Get all registered block types
   */
  getAll(): string[] {
    return Array.from(this.blocks.keys())
  }

  /**
   * Clear all registrations (mainly for testing)
   */
  clear(): void {
    this.blocks.clear()
  }
}

/**
 * Singleton instance
 */
export const blockRegistry = new BlockRegistry()

/**
 * Helper to check if a language should have a placeholder in markdown
 */
export function shouldCreatePlaceholder(language: string): boolean {
  // SQL blocks are handled differently (they are executed, not rendered as components)
  if (language === 'sql') {
    return true
  }

  // Chart blocks are also special (rendered via vgplot/D3)
  // Support both generic 'chart' and specific types
  const chartTypes = ['chart', 'line', 'area', 'bar', 'scatter', 'histogram', 'pie']
  if (chartTypes.includes(language)) {
    return true
  }

  // Check if registered in block registry
  return blockRegistry.has(language)
}
