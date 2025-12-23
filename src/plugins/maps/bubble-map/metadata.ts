/**
 * BubbleMap Component Metadata
 *
 * Display bubble markers on a map with sizes proportional to values
 */

import { createMetadata } from '@core/registry'

export const BubbleMapMetadata = createMetadata({
  type: 'data-viz',
  language: 'bubblemap',
  displayName: 'Bubble Map',
  description: 'Display proportional bubbles on a map using lat/lon and size values',
  icon: '🫧',
  category: 'map',
  tags: ['map', 'bubbles', 'circles', 'proportional', 'visualization'],
  props: [
    {
      name: 'query',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_by_city', 'population_by_location']
    },
    {
      name: 'latitude',
      type: 'string',
      required: true,
      description: 'Column containing latitude coordinates',
      examples: ['lat', 'latitude']
    },
    {
      name: 'longitude',
      type: 'string',
      required: true,
      description: 'Column containing longitude coordinates',
      examples: ['lon', 'longitude']
    },
    {
      name: 'size',
      type: 'string',
      required: true,
      description: 'Column containing values for bubble sizes',
      examples: ['sales', 'population', 'count']
    },
    {
      name: 'name',
      type: 'string',
      required: false,
      description: 'Column containing bubble names/labels',
      examples: ['city', 'location_name']
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      description: 'Column for bubble colors (hex values)',
      examples: ['color', 'category_color']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Map title',
      examples: ['Sales by City', 'Population Distribution']
    },
    {
      name: 'minSize',
      type: 'number',
      required: false,
      default: 5,
      description: 'Minimum bubble radius in pixels'
    },
    {
      name: 'maxSize',
      type: 'number',
      required: false,
      default: 30,
      description: 'Maximum bubble radius in pixels'
    },
    {
      name: 'fillOpacity',
      type: 'number',
      required: false,
      default: 0.6,
      description: 'Bubble fill opacity (0-1)'
    },
    {
      name: 'strokeColor',
      type: 'string',
      required: false,
      default: '#ffffff',
      description: 'Bubble stroke color'
    },
    {
      name: 'strokeWidth',
      type: 'number',
      required: false,
      default: 2,
      description: 'Bubble stroke width in pixels'
    },
    {
      name: 'colorScheme',
      type: 'string',
      required: false,
      default: 'blue',
      description: 'Default bubble color scheme',
      examples: ['blue', 'red', 'green', '#4287f5']
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 500,
      description: 'Map height in pixels'
    },
    {
      name: 'zoom',
      type: 'number',
      required: false,
      default: 10,
      description: 'Initial zoom level (1-18)'
    },
    {
      name: 'center',
      type: 'array',
      required: false,
      description: 'Map center coordinates [lat, lon]',
      examples: ['[37.7749, -122.4194]']
    },
    {
      name: 'showTooltip',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show tooltip on hover'
    },
    {
      name: 'tooltipTemplate',
      type: 'string',
      required: false,
      description: 'Tooltip template string',
      examples: ['{name}: {size}', '<b>{name}</b><br>Value: {size}']
    },
    {
      name: 'tilesUrl',
      type: 'string',
      required: false,
      description: 'Custom tile layer URL'
    },
    {
      name: 'attribution',
      type: 'string',
      required: false,
      description: 'Map attribution text'
    }
  ],
  examples: [
    `\`\`\`bubblemap
query: sales_by_city
latitude: lat
longitude: lon
size: total_sales
name: city_name
title: Sales by City
colorScheme: #4287f5
minSize: 10
maxSize: 40
\`\`\``,
    `\`\`\`bubblemap
query: earthquake_data
latitude: latitude
longitude: longitude
size: magnitude
name: location
color: depth_color
title: Earthquake Magnitudes
tooltipTemplate: {name}<br>Magnitude: {size}
\`\`\``
  ]
})
