/**
 * KPI Grid Component Metadata
 */

import { createMetadata } from '@core/registry'

export const KPIGridMetadata = createMetadata({
  type: 'data-viz',
  language: 'kpigrid',
  displayName: 'KPI Grid',
  description: 'Grid layout of KPI cards for dashboard overview',
  icon: '📊',
  category: 'data-viz',
  tags: ['kpi', 'dashboard', 'metrics', 'grid', 'cards'],
  props: [
    {
      name: 'query',
      type: 'string',
      required: true,
      description: 'SQL result name to use as data source'
    },
    {
      name: 'columns',
      type: 'number',
      required: false,
      description: 'Number of columns (default: auto-fit)'
    },
    {
      name: 'gap',
      type: 'string',
      required: false,
      description: 'Gap between cards (default: 1rem)'
    },
    {
      name: 'cards',
      type: 'array',
      required: true,
      description: 'Array of KPI card configurations'
    }
  ],
  examples: [
    `\`\`\`kpigrid
query: metrics_summary
columns: 4
cards:
  - label: Total Revenue
    value: revenue
    format: currency
    icon: 💰
    color: green
  - label: Orders
    value: orders
    format: number
    icon: 📦
    color: blue
  - label: Conversion
    value: conversion
    format: percent
    icon: 📈
    color: purple
\`\`\``
  ]
})
