/**
 * Image Component Types
 */

export interface ImageConfig {
  // Required
  src: string

  // Optional
  alt?: string
  title?: string
  caption?: string
  width?: number | string
  height?: number | string
  link?: string
  align?: 'left' | 'center' | 'right'
  fit?: 'contain' | 'cover' | 'fill' | 'scale-down'
  rounded?: boolean
  shadow?: boolean
}
