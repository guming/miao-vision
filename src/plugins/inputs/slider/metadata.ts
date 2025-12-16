/**
 * Slider Component Metadata
 */

import { createMetadata } from '@core/registry'

export const SliderMetadata = createMetadata({
  type: 'input',
  language: 'slider',
  displayName: 'Slider',
  description: 'Numeric slider input for range selection',
  icon: '🎚️',
  category: 'input',
  tags: ['input', 'slider', 'range', 'number'],
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Input variable name for referencing in SQL',
      examples: ['price_threshold', 'quantity_filter']
    },
    {
      name: 'min',
      type: 'number',
      required: false,
      description: 'Minimum slider value (default: 0)'
    },
    {
      name: 'max',
      type: 'number',
      required: false,
      description: 'Maximum slider value (default: 100)'
    },
    {
      name: 'step',
      type: 'number',
      required: false,
      description: 'Step increment (default: 1)'
    },
    {
      name: 'defaultValue',
      type: 'number',
      required: false,
      description: 'Default slider position'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Title displayed above the slider'
    },
    {
      name: 'format',
      type: 'string',
      required: false,
      description: 'Value format: number, currency, percent'
    }
  ],
  examples: [
    `\`\`\`slider
name: price_threshold
title: Maximum Price
min: 0
max: 1000
step: 10
defaultValue: 500
format: currency
\`\`\``
  ]
})
