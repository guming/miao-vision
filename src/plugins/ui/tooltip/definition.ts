/**
 * Tooltip Component Definition (Adapter Layer)
 */

import { defineComponent } from '@core/registry'
import { TooltipMetadata } from './metadata'
import Tooltip from './Tooltip.svelte'
import type { TooltipConfig, TooltipData } from './types'

// Schema for Tooltip config
const TooltipSchema = {
  fields: [
    { name: 'text', type: 'string' as const, required: true },
    { name: 'trigger', type: 'string' as const, default: 'ℹ️' },
    { name: 'position', type: 'string' as const, default: 'top' },
    { name: 'icon', type: 'string' as const },
    { name: 'delay', type: 'number' as const, default: 200 }
  ]
}

interface TooltipProps {
  data: TooltipData
}

/**
 * Tooltip component registration
 */
export const tooltipRegistration = defineComponent<TooltipConfig, TooltipProps>({
  metadata: TooltipMetadata,
  configSchema: TooltipSchema,
  component: Tooltip,
  containerClass: 'tooltip-wrapper',

  buildProps: (config, _data, _context) => {
    return {
      data: {
        config,
        text: config.text,
        trigger: config.trigger || 'ℹ️',
        icon: config.icon
      }
    }
  }
})

export default tooltipRegistration
