/**
 * Image Component Metadata
 *
 * Display images in reports with various styling options
 */

import { createMetadata } from '@core/registry'

export const ImageMetadata = createMetadata({
  type: 'data-viz',
  language: 'image',
  displayName: 'Image',
  description: 'Display images in reports',
  icon: '🖼️',
  category: 'data-display',
  tags: ['image', 'photo', 'picture', 'media'],
  props: [
    {
      name: 'src',
      type: 'string',
      required: true,
      description: 'Image source URL or path',
      examples: ['/images/logo.png', 'https://example.com/image.jpg', './data/chart.png']
    },
    {
      name: 'alt',
      type: 'string',
      required: false,
      description: 'Alternative text for accessibility',
      examples: ['Company Logo', 'Sales Chart']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Image title'
    },
    {
      name: 'caption',
      type: 'string',
      required: false,
      description: 'Caption displayed below the image'
    },
    {
      name: 'width',
      type: 'string',
      required: false,
      description: 'Image width (px or %)',
      examples: ['300', '50%', 'auto']
    },
    {
      name: 'height',
      type: 'string',
      required: false,
      description: 'Image height (px or %)',
      examples: ['200', 'auto']
    },
    {
      name: 'link',
      type: 'string',
      required: false,
      description: 'URL to navigate when image is clicked',
      examples: ['https://example.com', '/products/123']
    },
    {
      name: 'align',
      type: 'string',
      required: false,
      default: 'center',
      description: 'Image alignment',
      options: ['left', 'center', 'right']
    },
    {
      name: 'fit',
      type: 'string',
      required: false,
      default: 'contain',
      description: 'How image should fit in container',
      options: ['contain', 'cover', 'fill', 'scale-down']
    },
    {
      name: 'rounded',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Apply rounded corners'
    },
    {
      name: 'shadow',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Apply shadow effect'
    }
  ],
  examples: [
    `\`\`\`image
src: /images/company-logo.png
alt: Company Logo
width: 200
align: center
\`\`\``,
    `\`\`\`image
src: https://example.com/chart.png
caption: Q4 Sales Performance
width: 600
shadow: true
rounded: true
\`\`\``,
    `\`\`\`image
src: ./data/product.jpg
alt: Product Photo
link: https://example.com/products/123
width: 400
height: 300
fit: cover
\`\`\``
  ]
})
