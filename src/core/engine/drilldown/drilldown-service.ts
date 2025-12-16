/**
 * Drill-down Service
 *
 * Handles drill-down actions: setting inputs, navigation, modals, etc.
 */

import type {
  DrilldownConfig,
  DrilldownContext,
  DrilldownResult,
  DrilldownAction,
  DrilldownValueMapping
} from './types'
import type { InputStore, InputValue } from '@/app/stores/report-inputs'

/**
 * Drill-down service singleton
 */
class DrilldownService {
  private inputStore: InputStore | null = null
  private listeners: Map<string, (event: { config: DrilldownConfig; context: DrilldownContext }) => void> = new Map()

  /**
   * Initialize with input store
   */
  setInputStore(store: InputStore): void {
    this.inputStore = store
  }

  /**
   * Execute a drill-down action
   */
  async execute(config: DrilldownConfig, context: DrilldownContext): Promise<DrilldownResult> {
    if (!config.enabled) {
      return { success: false, action: config.action.type, error: 'Drill-down not enabled' }
    }

    console.log('🔍 Drill-down:', config.action.type, context)

    switch (config.action.type) {
      case 'setInput':
        return this.executeSetInput(config.action, context)

      case 'navigate':
        return this.executeNavigate(config.action, context)

      case 'modal':
        return this.executeModal(config.action, context)

      case 'expand':
        return this.executeExpand(config.action, context)

      default:
        return {
          success: false,
          action: (config.action as DrilldownAction).type,
          error: 'Unknown action type'
        }
    }
  }

  /**
   * Execute setInput action - set input variables from row data
   */
  private executeSetInput(
    action: { type: 'setInput'; mappings: DrilldownValueMapping[]; clearOthers?: string[] },
    context: DrilldownContext
  ): DrilldownResult {
    if (!this.inputStore) {
      return { success: false, action: 'setInput', error: 'Input store not initialized' }
    }

    const updatedInputs: string[] = []

    // Clear specified inputs first
    if (action.clearOthers) {
      for (const inputName of action.clearOthers) {
        this.inputStore.setValue(inputName, null)
      }
    }

    // Set values from row data
    for (const mapping of action.mappings) {
      const value = context.rowData[mapping.column]
      if (value !== undefined) {
        const transformedValue = this.transformValue(value, mapping.transform) as InputValue
        this.inputStore.setValue(mapping.inputName, transformedValue)
        updatedInputs.push(mapping.inputName)
        console.log(`  📝 Set ${mapping.inputName} = ${transformedValue}`)
      }
    }

    // Emit event for listeners
    this.notifyListeners('setInput', { config: { enabled: true, action }, context })

    return {
      success: true,
      action: 'setInput',
      updatedInputs
    }
  }

  /**
   * Execute navigate action - scroll to section or navigate
   */
  private executeNavigate(
    action: { type: 'navigate'; target: string; params?: Record<string, string> },
    context: DrilldownContext
  ): DrilldownResult {
    // Find target element
    const targetElement = document.querySelector(`#${action.target}`) ||
                          document.querySelector(`[data-section="${action.target}"]`)

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })

      // Set URL params if specified
      if (action.params) {
        const url = new URL(window.location.href)
        for (const [column, paramName] of Object.entries(action.params)) {
          const value = context.rowData[column]
          if (value !== undefined) {
            url.searchParams.set(paramName, String(value))
          }
        }
        window.history.pushState({}, '', url.toString())
      }

      return { success: true, action: 'navigate' }
    }

    return { success: false, action: 'navigate', error: `Target "${action.target}" not found` }
  }

  /**
   * Execute modal action - show detail modal (placeholder for now)
   */
  private executeModal(
    action: { type: 'modal'; titleTemplate?: string; displayColumns?: string[] },
    context: DrilldownContext
  ): DrilldownResult {
    // Emit event for modal handler
    this.notifyListeners('modal', { config: { enabled: true, action }, context })

    console.log('📋 Modal requested:', {
      title: this.interpolateTemplate(action.titleTemplate || 'Details', context.rowData),
      columns: action.displayColumns,
      data: context.rowData
    })

    return { success: true, action: 'modal' }
  }

  /**
   * Execute expand action - expand row (placeholder for now)
   */
  private executeExpand(
    action: { type: 'expand'; displayColumns?: string[] },
    context: DrilldownContext
  ): DrilldownResult {
    // Emit event for expand handler
    this.notifyListeners('expand', { config: { enabled: true, action }, context })

    return { success: true, action: 'expand' }
  }

  /**
   * Transform value based on type
   */
  private transformValue(value: unknown, transform?: 'string' | 'number' | 'date'): unknown {
    if (!transform) return value

    switch (transform) {
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      case 'date':
        return value instanceof Date ? value.toISOString() : String(value)
      default:
        return value
    }
  }

  /**
   * Interpolate template string with row data
   */
  private interpolateTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return data[key] !== undefined ? String(data[key]) : `{${key}}`
    })
  }

  /**
   * Subscribe to drill-down events
   */
  onDrilldown(id: string, callback: (event: { config: DrilldownConfig; context: DrilldownContext }) => void): void {
    this.listeners.set(id, callback)
  }

  /**
   * Unsubscribe from drill-down events
   */
  offDrilldown(id: string): void {
    this.listeners.delete(id)
  }

  /**
   * Notify all listeners of a drill-down event
   */
  private notifyListeners(_actionType: string, event: { config: DrilldownConfig; context: DrilldownContext }): void {
    for (const callback of this.listeners.values()) {
      try {
        callback(event)
      } catch (err) {
        console.error('Drill-down listener error:', err)
      }
    }
  }

  /**
   * Parse drill-down config from block content
   */
  static parseConfig(content: string): Partial<DrilldownConfig> | null {
    const lines = content.split('\n')
    let inDrilldown = false
    const config: Partial<DrilldownConfig> = {}
    const mappings: DrilldownValueMapping[] = []

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed === 'drilldown:' || trimmed.startsWith('drilldown:')) {
        inDrilldown = true
        const afterColon = trimmed.substring(10).trim()
        if (afterColon === 'true' || afterColon === '') {
          config.enabled = true
        } else if (afterColon === 'false') {
          return null
        }
        continue
      }

      if (inDrilldown && trimmed.startsWith('- ')) {
        // Parse mapping: "- column: inputName" or "- column → inputName"
        const mapping = trimmed.substring(2).trim()
        const arrowMatch = mapping.match(/^(\w+)\s*[→:]\s*(\w+)$/)
        if (arrowMatch) {
          mappings.push({
            column: arrowMatch[1],
            inputName: arrowMatch[2]
          })
        }
        continue
      }

      if (inDrilldown && trimmed.includes(':')) {
        const colonIdx = trimmed.indexOf(':')
        const key = trimmed.substring(0, colonIdx).trim()
        const value = trimmed.substring(colonIdx + 1).trim()

        switch (key) {
          case 'action':
            // Parse action type
            if (value === 'setInput' || value === 'navigate' || value === 'modal' || value === 'expand') {
              (config as any).actionType = value
            }
            break
          case 'target':
            (config as any).target = value
            break
          case 'tooltip':
            config.tooltip = value
            break
          case 'cursor':
            if (value === 'pointer' || value === 'zoom-in') {
              config.cursor = value
            }
            break
          case 'highlight':
            config.hoverHighlight = value === 'true'
            break
        }
      }

      // Stop parsing drilldown section when hitting another top-level key
      if (inDrilldown && !trimmed.startsWith('-') && !trimmed.startsWith(' ') && trimmed.includes(':') && !trimmed.startsWith('drilldown')) {
        inDrilldown = false
      }
    }

    // Build final config
    if (config.enabled && mappings.length > 0) {
      config.action = {
        type: 'setInput',
        mappings
      }
    }

    return config.enabled ? config : null
  }
}

// Export singleton instance
export const drilldownService = new DrilldownService()
export { DrilldownService }
