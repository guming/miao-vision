/**
 * Dashboard Grid Component Metadata
 */

import { createMetadata } from '@core/registry'

export const GridMetadata = createMetadata({
  type: 'layout',
  language: 'grid',
  displayName: 'Dashboard Grid',
  description: 'Responsive grid layout for dashboard components',
  icon: '📐',
  category: 'layout',
  tags: ['layout', 'grid', 'dashboard', 'responsive'],
  props: [
    {
      name: 'columns',
      type: 'number',
      required: false,
      description: 'Number of columns (default: 12)'
    },
    {
      name: 'gap',
      type: 'string',
      required: false,
      description: 'Gap between items (default: 1rem)'
    },
    {
      name: 'rowHeight',
      type: 'string',
      required: false,
      description: 'Height of each row (default: auto)'
    }
  ],
  examples: [
    `\`\`\`grid
columns: 3
gap: 1.5rem
\`\`\`

{grid-item col=1 colSpan=2}
Content spanning 2 columns
{/grid-item}

{grid-item col=3}
Sidebar content
{/grid-item}`
  ]
})
