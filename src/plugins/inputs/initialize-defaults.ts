/**
 * Initialize Input Defaults
 *
 * Scans parsed code blocks for input components and initializes their default values
 */

import type { ParsedCodeBlock } from '@/types/report'
import type { InputStore } from '@app/stores/report-inputs'

/**
 * Parse input config from block content
 */
function parseInputConfig(content: string): { name?: string; defaultValue?: string } {
  const config: { name?: string; defaultValue?: string } = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim()
      const value = trimmed.substring(colonIndex + 1).trim()

      if (key === 'name') {
        config.name = value
      } else if (key === 'defaultValue' || key === 'default') {
        config.defaultValue = value
      }
    }
  }

  return config
}

/**
 * Initialize default values for input components
 *
 * Scans all parsed code blocks looking for input types (dropdown, buttongroup, etc.)
 * and sets their default values in the input store if not already set
 */
export function initializeInputDefaults(
  codeBlocks: ParsedCodeBlock[],
  inputStore: InputStore
): void {
  const inputTypes = ['dropdown', 'buttongroup', 'slider', 'checkbox', 'textinput', 'daterange']

  for (const block of codeBlocks) {
    if (!inputTypes.includes(block.language)) continue

    // Parse config from metadata or content
    let name: string | undefined
    let defaultValue: string | undefined

    if (block.metadata && 'name' in block.metadata) {
      name = block.metadata.name as string
      defaultValue = 'defaultValue' in block.metadata ? (block.metadata.defaultValue as string) : undefined
    } else {
      const config = parseInputConfig(block.content)
      name = config.name
      defaultValue = config.defaultValue
    }

    // Set default value if name exists and not already set
    if (name && defaultValue !== undefined && !inputStore.has(name)) {
      console.log(`  Setting default value for input "${name}":`, defaultValue)
      inputStore.setValue(name, defaultValue)
    }
  }
}
