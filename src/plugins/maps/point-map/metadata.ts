/**
 * PointMap Component Metadata
 *
 * Display individual points/markers on a map based on latitude/longitude coordinates
 */

import { createMetadata } from '@core/registry'

export const PointMapMetadata = createMetadata({
  type: 'data-viz',
  language: 'pointmap',
  displayName: 'Point Map',
  description: 'Display data points on a map using lat/lon coordinates',
  icon: '📍',
  category: 'map',
  tags: ['map', 'markers', 'points', 'location', 'visualization'],
  props: [
    {
      name: 'query',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['store_locations', 'customer_addresses']
    },
    {
      name: 'latitude',
      type: 'string',
      required: true,
      description: 'Column containing latitude coordinates',
      examples: ['lat', 'latitude', 'coord_lat']
    },
    {
      name: 'longitude',
      type: 'string',
      required: true,
      description: 'Column containing longitude coordinates',
      examples: ['lon', 'longitude', 'coord_lon']
    },
    {
      name: 'name',
      type: 'string',
      required: false,
      description: 'Column containing point names/labels',
      examples: ['store_name', 'location_name', 'title']
    },
    {
      name: 'value',
      type: 'string',
      required: false,
      description: 'Column containing values to display',
      examples: ['sales', 'count', 'rating']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Map title',
      examples: ['Store Locations', 'Customer Distribution']
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      description: 'Column for marker colors (hex values)',
      examples: ['color', 'marker_color']
    },
    {
      name: 'icon',
      type: 'string',
      required: false,
      description: 'Column for marker icons (emoji or icon names)',
      examples: ['icon', 'marker_icon']
    },
    {
      name: 'markerColor',
      type: 'string',
      required: false,
      default: 'blue',
      description: 'Default marker color',
      options: ['blue', 'red', 'green', 'orange', 'yellow', 'violet', 'grey', 'black']
    },
    {
      name: 'markerSize',
      type: 'string',
      required: false,
      default: 'medium',
      description: 'Marker size',
      options: ['small', 'medium', 'large']
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
      examples: ['[37.7749, -122.4194]', '[40.7128, -74.0060]']
    },
    {
      name: 'cluster',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable marker clustering for many points'
    },
    {
      name: 'clusterRadius',
      type: 'number',
      required: false,
      default: 80,
      description: 'Cluster radius in pixels'
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
      examples: ['{name}', '{name}: {value}', '<b>{name}</b><br>{value}']
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
    `\`\`\`pointmap
query: store_locations
latitude: lat
longitude: lon
name: store_name
value: sales
title: Store Locations
markerColor: blue
height: 600
\`\`\``,
    `\`\`\`pointmap
query: earthquakes
latitude: latitude
longitude: longitude
name: location
value: magnitude
title: Recent Earthquakes
markerColor: red
cluster: true
tooltipTemplate: {name}<br>Magnitude: {value}
\`\`\``
  ]
})
