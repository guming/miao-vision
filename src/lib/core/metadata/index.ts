/**
 * Component Metadata Index
 *
 * Central export point for all component metadata
 */

export * from './charts'
export * from './inputs'
export * from './data-viz'

import { CHART_METADATA } from './charts'
import { INPUT_METADATA } from './inputs'
import { DATA_VIZ_METADATA } from './data-viz'
import type { ComponentMetadata } from '../component-registry'

/**
 * All component metadata
 */
export const ALL_METADATA: ComponentMetadata[] = [
  ...CHART_METADATA,
  ...INPUT_METADATA,
  ...DATA_VIZ_METADATA
]

/**
 * Get metadata by language
 */
export function getMetadataByLanguage(language: string): ComponentMetadata | undefined {
  return ALL_METADATA.find(m => m.language === language)
}

/**
 * Get metadata by category
 */
export function getMetadataByCategory(category: string): ComponentMetadata[] {
  return ALL_METADATA.filter(m => m.metadata.category === category)
}

/**
 * Get all component languages
 */
export function getAllLanguages(): string[] {
  return ALL_METADATA.map(m => m.language)
}
