/**
 * DimensionGrid Component Metadata
 */

import { createMetadata } from '@core/registry'

export const dimensionGridMetadata = createMetadata({
  type: 'input',
  language: 'dimensiongrid',
  displayName: 'Dimension Grid',
  description: 'Multi-dimensional grid selection for filtering',
  icon: '🔲',
  category: 'input',
  tags: ['input', 'grid', 'filter', 'multi-select', 'dimension'],
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Input variable name for referencing in SQL'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Grid title displayed above the grid'
    },
    {
      name: 'columns',
      type: 'number',
      required: false,
      description: 'Number of columns in the grid (default: 4)'
    },
    {
      name: 'multiple',
      type: 'boolean',
      required: false,
      description: 'Allow multiple selections (default: false)'
    },
    {
      name: 'showCounts',
      type: 'boolean',
      required: false,
      description: 'Show item counts (default: false)'
    },
    {
      name: 'defaultValue',
      type: 'string',
      required: false,
      description: 'Default selected value(s)'
    },
    {
      name: 'gap',
      type: 'string',
      required: false,
      description: 'Gap between items (default: 0.75rem)'
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      description: 'Array of items with label, value, icon, count, color'
    }
  ],
  examples: [
    `\`\`\`dimensiongrid
name: selected_category
title: Categories
columns: 4
items:
  - label: Sales
    value: sales
    icon: 💰
  - label: Marketing
    value: marketing
    icon: 📢
  - label: Engineering
    value: engineering
    icon: 💻
  - label: HR
    value: hr
    icon: 👥
\`\`\``,
    `\`\`\`dimensiongrid
name: selected_regions
title: Select Regions
columns: 3
multiple: true
showCounts: true
items:
  - label: North
    value: north
    count: 1250
  - label: South
    value: south
    count: 890
  - label: East
    value: east
    count: 1120
\`\`\``
  ]
})
