/**
 * Image Component Definition (Adapter Layer)
 *
 * Simple component without data binding.
 */

import { defineComponent, ImageSchema } from '@core/registry'
import { ImageMetadata } from './metadata'
import Image from './Image.svelte'
import type { ImageConfig } from './types'

/**
 * Image component registration using adapter layer
 */
export const imageRegistration = defineComponent<ImageConfig, ImageConfig>({
  metadata: ImageMetadata,
  configSchema: ImageSchema,
  component: Image,
  containerClass: 'image-wrapper',

  // No data binding needed - image just displays static content
  dataBinding: undefined,

  // Pass config directly as props
  buildProps: (config) => {
    return config
  }
})

export default imageRegistration
