/**
 * Alert Component Definition (Adapter Layer)
 *
 * Declarative component definition using the new adapter layer.
 * Alert is a UI component that doesn't require SQL data.
 */

import { defineComponent, AlertSchema } from '@core/registry'
import { AlertMetadata } from './metadata'
import Alert from './Alert.svelte'
import type { AlertConfig, AlertData } from './types'

/**
 * Props passed to Alert.svelte
 */
interface AlertProps {
  data: AlertData
}

/**
 * Parse alert content - separates config from message content
 */
function parseAlertContent(content: string): { config: Partial<AlertConfig>; message: string } {
  const lines = content.split('\n')
  const configLines: string[] = []
  const contentLines: string[] = []
  let parsingConfig = true

  for (const line of lines) {
    const trimmed = line.trim()

    if (parsingConfig) {
      const colonIndex = trimmed.indexOf(':')
      // Only parse as config if colon is near the start (key: value format)
      if (colonIndex > 0 && colonIndex < 20) {
        const key = trimmed.substring(0, colonIndex).trim()
        // Only known config keys
        if (['type', 'title', 'icon', 'dismissible'].includes(key)) {
          configLines.push(line)
          continue
        }
      }

      // Empty line - still parsing config
      if (trimmed === '') {
        continue
      }

      // Not a config line - switch to content mode
      parsingConfig = false
      contentLines.push(line)
    } else {
      contentLines.push(line)
    }
  }

  // Parse config values
  const config: Partial<AlertConfig> = {}
  for (const line of configLines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      let value = line.substring(colonIndex + 1).trim()

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      switch (key) {
        case 'type':
          config.type = value as AlertConfig['type']
          break
        case 'title':
          config.title = value
          break
        case 'icon':
          config.icon = value !== 'false' && value !== '0'
          break
        case 'dismissible':
          config.dismissible = value === 'true' || value === '1'
          break
      }
    }
  }

  // Convert content to HTML paragraphs
  const message = contentLines.join('\n').trim()
  const htmlContent = message
    .split('\n\n')
    .filter(para => para.trim())
    .map(para => `<p>${para.replace(/\n/g, ' ')}</p>`)
    .join('')

  return { config, message: htmlContent }
}

/**
 * Alert component registration using adapter layer
 */
export const alertRegistration = defineComponent<AlertConfig, AlertProps>({
  metadata: AlertMetadata,
  configSchema: AlertSchema,
  component: Alert,
  containerClass: 'alert-wrapper',

  // No data binding needed - Alert doesn't use SQL data

  // Custom props builder
  buildProps: (config, _data, context) => {
    // Get the original block to access raw content
    const block = (context as any).block

    // Parse content to extract message
    let htmlContent = ''
    if (block?.content) {
      const { message } = parseAlertContent(block.content)
      htmlContent = message
    }

    return {
      data: {
        config: {
          type: config.type || 'info',
          title: config.title,
          icon: config.icon !== false,
          dismissible: config.dismissible || false
        },
        content: htmlContent
      }
    }
  }
})

export default alertRegistration
