/**
 * Slider Component Module
 */

// Types
export type { SliderConfig, SliderData } from './types'

// Metadata
export { SliderMetadata } from './metadata'

// Component registration (adapter layer)
export { sliderRegistration } from './definition'

// Component
export { default as Slider } from './Slider.svelte'
