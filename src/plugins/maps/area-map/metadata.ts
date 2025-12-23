/**
 * AreaMap Component Metadata
 *
 * Choropleth map for visualizing data across geographic regions
 */

import { createMetadata } from '@core/registry'

export const AreaMapMetadata = createMetadata({
  type: 'data-viz',
  language: 'areamap',
  displayName: 'Area Map (Choropleth)',
  description: 'Visualize data across geographic areas with color-coded regions',
  icon: '🗺️',
  category: 'map',
  tags: ['map', 'choropleth', 'geography', 'regions', 'visualization'],
  props: [
    {
      name: 'query',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_by_state', 'population_by_country']
    },
    {
      name: 'areaId',
      type: 'string',
      required: true,
      description: 'Column containing area identifiers (must match GeoJSON properties)',
      examples: ['state_code', 'country_iso', 'region_id']
    },
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Column containing the value to visualize',
      examples: ['total_sales', 'population', 'percentage']
    },
    {
      name: 'geoJson',
      type: 'string',
      required: true,
      description: 'GeoJSON data source (URL or inline object)',
      examples: [
        '/data/us-states.geojson',
        '/data/world-countries.geojson'
      ]
    },
    {
      name: 'areaName',
      type: 'string',
      required: false,
      description: 'Column containing area display names',
      examples: ['state_name', 'country_name']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Map title',
      examples: ['Sales by State', 'Population Density']
    },
    {
      name: 'geoJsonKey',
      type: 'string',
      required: false,
      default: 'id',
      description: 'Property in GeoJSON to match with areaId',
      examples: ['id', 'STATE', 'ISO_A2']
    },
    {
      name: 'colorScale',
      type: 'string',
      required: false,
      default: 'sequential',
      description: 'Color scale type',
      options: ['sequential', 'diverging', 'categorical']
    },
    {
      name: 'colorScheme',
      type: 'string',
      required: false,
      default: 'Blues',
      description: 'Color scheme name',
      examples: ['Blues', 'Greens', 'Reds', 'YlOrRd', 'RdYlGn']
    },
    {
      name: 'colorBuckets',
      type: 'number',
      required: false,
      default: 5,
      description: 'Number of color categories'
    },
    {
      name: 'colors',
      type: 'array',
      required: false,
      description: 'Custom color palette (hex colors)',
      examples: ['["#f7fbff", "#08519c"]', '["#fee5d9", "#a50f15"]']
    },
    {
      name: 'format',
      type: 'string',
      required: false,
      default: 'number',
      description: 'Value format',
      options: ['number', 'currency', 'percent', 'compact']
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 500,
      description: 'Map height in pixels'
    },
    {
      name: 'showLegend',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show color legend'
    },
    {
      name: 'legendPosition',
      type: 'string',
      required: false,
      default: 'topright',
      description: 'Legend position',
      options: ['topright', 'topleft', 'bottomright', 'bottomleft']
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
      examples: ['{areaName}: {formatted}', '<b>{areaName}</b><br>{formatted}']
    }
  ],
  examples: [
    `\`\`\`areamap
query: sales_by_state
areaId: state_code
value: total_sales
areaName: state_name
geoJson: /data/us-states.geojson
geoJsonKey: STATE
title: Sales by State
format: currency
colorScheme: Blues
\`\`\``,
    `\`\`\`areamap
query: population_by_country
areaId: country_iso
value: population
geoJson: /data/world.geojson
geoJsonKey: ISO_A2
title: World Population
format: compact
colorScheme: YlOrRd
colorBuckets: 7
\`\`\``
  ]
})
