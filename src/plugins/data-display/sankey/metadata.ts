/**
 * Sankey Diagram Component Metadata
 */

import { createMetadata } from '@core/registry'

export const SankeyMetadata = createMetadata({
  type: 'data-viz',
  language: 'sankey',
  displayName: 'Sankey Diagram',
  description: 'Display flow relationships between nodes using a Sankey diagram',
  icon: '🔀',
  category: 'chart',
  tags: ['data-viz', 'chart', 'sankey', 'flow', 'relationship', 'alluvial'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['user_flow', 'budget_allocation']
    },
    {
      name: 'sourceColumn',
      type: 'string',
      required: true,
      description: 'Column containing source node names',
      examples: ['from_page', 'source_category']
    },
    {
      name: 'targetColumn',
      type: 'string',
      required: true,
      description: 'Column containing target node names',
      examples: ['to_page', 'target_category']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing flow values',
      examples: ['users', 'amount', 'count']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    },
    {
      name: 'subtitle',
      type: 'string',
      required: false,
      description: 'Chart subtitle'
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 400,
      description: 'Chart height in pixels'
    },
    {
      name: 'nodeWidth',
      type: 'number',
      required: false,
      default: 20,
      description: 'Node bar width in pixels'
    },
    {
      name: 'nodePadding',
      type: 'number',
      required: false,
      default: 10,
      description: 'Padding between nodes in pixels'
    },
    {
      name: 'colorScheme',
      type: 'string',
      required: false,
      default: 'default',
      description: 'Color scheme for nodes',
      options: ['default', 'category', 'blue', 'green', 'warm', 'cool']
    },
    {
      name: 'showLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show node labels'
    },
    {
      name: 'showValues',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show values on nodes'
    },
    {
      name: 'linkOpacity',
      type: 'number',
      required: false,
      default: 0.5,
      description: 'Link opacity (0-1)'
    }
  ],
  examples: [
    `\`\`\`sankey
data: user_flow
sourceColumn: from_page
targetColumn: to_page
valueColumn: users
title: User Navigation Flow
\`\`\``,
    `\`\`\`sankey
data: budget_allocation
sourceColumn: department
targetColumn: expense_category
valueColumn: amount
colorScheme: blue
showValues: true
\`\`\``
  ]
})
