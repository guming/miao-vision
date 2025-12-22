/**
 * BoxPlot Component Metadata
 */

import { createMetadata } from '@core/registry'

export const BoxPlotMetadata = createMetadata({
  type: 'data-viz',
  language: 'boxplot',
  displayName: 'Box Plot',
  description: 'Display statistical distribution with quartiles, median, and outliers',
  icon: '\u{1F4E6}',
  category: 'chart',
  tags: ['data-viz', 'chart', 'boxplot', 'statistics', 'quartiles', 'distribution', 'outliers'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['test_scores', 'response_times']
    },
    {
      name: 'valueColumn',
      type: 'string',
      required: true,
      description: 'Column containing numeric values',
      examples: ['score', 'duration', 'value']
    },
    {
      name: 'groupColumn',
      type: 'string',
      required: false,
      description: 'Column for grouping into multiple box plots',
      examples: ['category', 'region', 'department']
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
      default: 300,
      description: 'Chart height in pixels'
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      default: '#3B82F6',
      description: 'Box color'
    },
    {
      name: 'showOutliers',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show outlier points'
    },
    {
      name: 'showMean',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether to show mean marker'
    },
    {
      name: 'orientation',
      type: 'string',
      required: false,
      default: 'vertical',
      description: 'Chart orientation',
      options: ['vertical', 'horizontal']
    }
  ],
  examples: [
    `\`\`\`boxplot
data: test_scores
valueColumn: score
groupColumn: subject
title: Test Score Distribution
color: #10B981
\`\`\``,
    `\`\`\`boxplot
data: response_times
valueColumn: duration_ms
title: API Response Time Distribution
orientation: horizontal
showMean: true
\`\`\``
  ]
})
