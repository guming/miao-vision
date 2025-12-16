/**
 * Dashboard Grid Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { GridMetadata } from './metadata'
import Grid from './Grid.svelte'
import type { GridConfig, GridData } from './types'

// Schema for Grid config
const GridSchema = {
  fields: [
    { name: 'columns', type: 'number' as const, required: false, default: 12 },
    { name: 'gap', type: 'string' as const, required: false, default: '1rem' },
    { name: 'rowHeight', type: 'string' as const, required: false, default: 'auto' },
    { name: 'minRowHeight', type: 'string' as const, required: false, default: '100px' }
  ]
}

interface GridProps {
  data: GridData
}

/**
 * Parse grid config from block content
 */
function parseGridContent(content: string): Partial<GridConfig> {
  const config: Partial<GridConfig> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
      const key = trimmed.substring(0, colonIdx).trim()
      const value = trimmed.substring(colonIdx + 1).trim()

      switch (key) {
        case 'columns':
          config.columns = parseInt(value) || 12
          break
        case 'gap':
          config.gap = value
          break
        case 'rowHeight':
          config.rowHeight = value
          break
        case 'minRowHeight':
          config.minRowHeight = value
          break
      }
    }
  }

  return config
}

/**
 * Grid component registration
 */
export const gridRegistration = defineComponent<GridConfig, GridProps>({
  metadata: GridMetadata,
  configSchema: GridSchema,
  component: Grid,
  containerClass: 'grid-wrapper',

  buildProps: (config, _extractedData, context) => {
    const block = (context as any).block

    // Parse content for config
    let parsedConfig: Partial<GridConfig> = {}
    if (block?.content) {
      parsedConfig = parseGridContent(block.content)
    }

    // Merge configs
    const finalConfig: GridConfig = {
      ...config,
      ...parsedConfig
    }

    return {
      data: {
        config: finalConfig,
        items: []  // Items are handled separately via nested content
      }
    }
  }
})

export default gridRegistration
