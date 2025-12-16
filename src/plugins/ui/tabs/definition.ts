/**
 * Tabs Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { TabsMetadata } from './metadata'
import Tabs from './Tabs.svelte'
import type { TabsConfig, TabsData, TabConfig } from './types'

// Schema for tabs config
const TabsSchema = {
  fields: [
    { name: 'defaultTab', type: 'number' as const, default: 0 },
    { name: 'variant', type: 'string' as const, default: 'default' },
    { name: 'fullWidth', type: 'boolean' as const, default: false },
    { name: 'lazy', type: 'boolean' as const, default: false }
  ]
}

/**
 * Props passed to Tabs.svelte
 */
interface TabsProps {
  data: TabsData
}

/**
 * Parse tabs from markdown list format
 * ```tabs
 * - Overview
 * - Details
 * - History
 * ```
 */
function parseTabsList(content: string): TabConfig[] {
  const lines = content.trim().split('\n')
  const tabs: TabConfig[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match list items: "- Label" or "* Label"
    const match = trimmed.match(/^[-*]\s+(.+)$/)
    if (match) {
      const labelPart = match[1].trim()
      // Check for icon: "📊 Overview" or just "Overview"
      const iconMatch = labelPart.match(/^(\p{Emoji})\s+(.+)$/u)
      if (iconMatch) {
        tabs.push({
          label: iconMatch[2],
          icon: iconMatch[1]
        })
      } else {
        tabs.push({ label: labelPart })
      }
    }
  }

  return tabs
}

/**
 * Parse config and tabs from block content
 */
function parseTabsContent(content: string): { config: Partial<TabsConfig>; tabs: TabConfig[] } {
  const tabs = parseTabsList(content)
  const config: Partial<TabsConfig> = {}
  const lines = content.trim().split('\n')

  for (const line of lines) {
    const configMatch = line.match(/^(\w+):\s*(.+)$/)
    if (configMatch) {
      const [, key, value] = configMatch
      if (key === 'defaultTab') config.defaultTab = parseInt(value)
      if (key === 'variant') config.variant = value as TabsConfig['variant']
      if (key === 'fullWidth') config.fullWidth = value === 'true'
      if (key === 'lazy') config.lazy = value === 'true'
    }
  }

  return { config, tabs }
}

/**
 * Tabs component registration using adapter layer
 */
export const tabsRegistration = defineComponent<TabsConfig, TabsProps>({
  metadata: TabsMetadata,
  configSchema: TabsSchema,
  component: Tabs,
  containerClass: 'tabs-wrapper',

  // Build props for Tabs.svelte
  buildProps: (config, _data, context) => {
    // Get the original block to access raw content
    const block = (context as any).block

    // Parse content to extract tabs
    let tabs: TabConfig[] = []
    let parsedConfig: Partial<TabsConfig> = {}

    if (block?.content) {
      const parsed = parseTabsContent(block.content)
      tabs = parsed.tabs
      parsedConfig = parsed.config
    }

    // Merge parsed config with schema-parsed config
    const finalConfig: TabsConfig = {
      ...config,
      ...parsedConfig
    }

    // Contents will be populated by the renderer from subsequent {tab} blocks
    // For now, return empty contents - they'll be filled by the report execution
    return {
      data: {
        config: finalConfig,
        tabs,
        contents: tabs.map(() => '<p class="text-gray-400">Tab content</p>')
      }
    }
  }
})

export default tabsRegistration
