/**
 * Chart Component Metadata Definitions
 */

import { createMetadata, type ComponentMetadata } from '@core/registry'

/**
 * Generic Chart (works with any chart type specified in YAML)
 */
export const ChartMetadata = createMetadata({
  type: 'chart',
  language: 'chart',
  displayName: 'Chart',
  description: 'Generic chart component that supports multiple visualization types',
  icon: '📊',
  category: 'visualization',
  tags: ['chart', 'visualization', 'data'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data'
    },
    {
      name: 'chartType',
      type: 'string',
      required: false,
      description: 'Type of chart (line, bar, area, scatter, etc.)',
      examples: ['line', 'bar', 'area', 'scatter']
    }
  ]
})

/**
 * Line Chart
 */
export const LineChartMetadata = createMetadata({
  type: 'chart',
  language: 'line',
  displayName: 'Line Chart',
  description: 'Visualize trends over time with connected lines',
  icon: '📈',
  category: 'time-series',
  tags: ['chart', 'time-series', 'trend', 'line'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_data', 'regional_sales']
    },
    {
      name: 'x',
      type: 'string',
      required: true,
      description: 'Column name for X-axis',
      examples: ['month', 'date', 'category']
    },
    {
      name: 'y',
      type: 'string',
      required: true,
      description: 'Column name for Y-axis',
      examples: ['revenue', 'count', 'value']
    },
    {
      name: 'group',
      type: 'string',
      required: false,
      description: 'Column name for grouping/coloring multiple series',
      examples: ['region', 'product_type']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title (supports ${inputs.xxx} template variables)',
      examples: ['Revenue Trend', 'Sales by Month - ${inputs.region}']
    },
    {
      name: 'xLabel',
      type: 'string',
      required: false,
      description: 'X-axis label',
      examples: ['Month', 'Date']
    },
    {
      name: 'yLabel',
      type: 'string',
      required: false,
      description: 'Y-axis label',
      examples: ['Revenue ($)', 'Count']
    },
    {
      name: 'width',
      type: 'number',
      required: false,
      default: 680,
      description: 'Chart width in pixels'
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 400,
      description: 'Chart height in pixels'
    },
    {
      name: 'xScaleType',
      type: 'string',
      required: false,
      description: 'X-axis scale type',
      options: ['point', 'linear', 'log', 'sqrt', 'time', 'utc']
    }
  ],
  examples: [
    `\`\`\`line
data: sales_data
x: month
y: revenue
title: Monthly Revenue Trend
\`\`\``
  ]
})

/**
 * Area Chart
 */
export const AreaChartMetadata = createMetadata({
  type: 'chart',
  language: 'area',
  displayName: 'Area Chart',
  description: 'Show trends over time with filled areas',
  icon: '🌊',
  category: 'time-series',
  tags: ['chart', 'time-series', 'trend', 'area'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data'
    },
    {
      name: 'x',
      type: 'string',
      required: true,
      description: 'Column name for X-axis'
    },
    {
      name: 'y',
      type: 'string',
      required: true,
      description: 'Column name for Y-axis'
    },
    {
      name: 'group',
      type: 'string',
      required: false,
      description: 'Column name for grouping/coloring'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    },
    {
      name: 'fillOpacity',
      type: 'number',
      required: false,
      default: 0.7,
      description: 'Fill opacity (0-1)'
    },
    {
      name: 'curve',
      type: 'string',
      required: false,
      default: 'linear',
      description: 'Curve interpolation type',
      options: ['linear', 'step', 'basis', 'monotone']
    },
    {
      name: 'stacked',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Stack multiple series'
    }
  ]
})

/**
 * Bar Chart
 */
export const BarChartMetadata = createMetadata({
  type: 'chart',
  language: 'bar',
  displayName: 'Bar Chart',
  description: 'Compare values across categories',
  icon: '📊',
  category: 'comparison',
  tags: ['chart', 'comparison', 'categorical', 'bar'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data'
    },
    {
      name: 'x',
      type: 'string',
      required: true,
      description: 'Column name for X-axis (categories)'
    },
    {
      name: 'y',
      type: 'string',
      required: true,
      description: 'Column name for Y-axis (values)'
    },
    {
      name: 'group',
      type: 'string',
      required: false,
      description: 'Column name for grouping/coloring'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    },
    {
      name: 'xLabel',
      type: 'string',
      required: false,
      description: 'X-axis label'
    },
    {
      name: 'yLabel',
      type: 'string',
      required: false,
      description: 'Y-axis label'
    }
  ],
  examples: [
    `\`\`\`bar
data: product_sales
x: product
y: units_sold
title: Units Sold by Product
\`\`\``
  ]
})

/**
 * Scatter Plot
 */
export const ScatterChartMetadata = createMetadata({
  type: 'chart',
  language: 'scatter',
  displayName: 'Scatter Plot',
  description: 'Explore relationships between two variables',
  icon: '🔵',
  category: 'correlation',
  tags: ['chart', 'correlation', 'scatter', 'distribution'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data'
    },
    {
      name: 'x',
      type: 'string',
      required: true,
      description: 'Column name for X-axis'
    },
    {
      name: 'y',
      type: 'string',
      required: true,
      description: 'Column name for Y-axis'
    },
    {
      name: 'group',
      type: 'string',
      required: false,
      description: 'Column name for grouping/coloring points'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    }
  ]
})

/**
 * Histogram
 */
export const HistogramMetadata = createMetadata({
  type: 'chart',
  language: 'histogram',
  displayName: 'Histogram',
  description: 'Show distribution of numerical data',
  icon: '📉',
  category: 'distribution',
  tags: ['chart', 'distribution', 'histogram'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data'
    },
    {
      name: 'x',
      type: 'string',
      required: true,
      description: 'Column name for the value to bin'
    },
    {
      name: 'bins',
      type: 'number',
      required: false,
      default: 20,
      description: 'Number of bins'
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    }
  ]
})

/**
 * Pie Chart
 */
export const PieChartMetadata = createMetadata({
  type: 'chart',
  language: 'pie',
  displayName: 'Pie Chart',
  description: 'Show proportions of a whole as slices',
  icon: '🥧',
  category: 'comparison',
  tags: ['chart', 'proportion', 'pie', 'donut'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['sales_by_category', 'market_share']
    },
    {
      name: 'x',
      type: 'string',
      required: true,
      description: 'Column name for category labels (slices)',
      examples: ['category', 'region', 'product']
    },
    {
      name: 'y',
      type: 'string',
      required: true,
      description: 'Column name for values (slice size)',
      examples: ['revenue', 'count', 'percentage']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    },
    {
      name: 'innerRadius',
      type: 'number',
      required: false,
      default: 0,
      description: 'Inner radius for donut chart (0 = pie, >0 = donut)',
      examples: ['0', '50', '80']
    },
    {
      name: 'showLabels',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show category labels on slices'
    },
    {
      name: 'showPercentages',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show percentage values on slices'
    },
    {
      name: 'padAngle',
      type: 'number',
      required: false,
      default: 0.02,
      description: 'Gap between slices (in radians)'
    },
    {
      name: 'cornerRadius',
      type: 'number',
      required: false,
      default: 3,
      description: 'Rounded corners on slices'
    },
    {
      name: 'width',
      type: 'number',
      required: false,
      default: 500,
      description: 'Chart width in pixels'
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 400,
      description: 'Chart height in pixels'
    }
  ],
  examples: [
    `\`\`\`pie
data: sales_by_category
x: category
y: revenue
title: Revenue by Category
\`\`\``,
    `\`\`\`pie
data: market_share
x: company
y: share
title: Market Share
innerRadius: 60
\`\`\``
  ]
})

/**
 * All chart metadata
 */
export const CHART_METADATA: ComponentMetadata[] = [
  LineChartMetadata,
  AreaChartMetadata,
  BarChartMetadata,
  ScatterChartMetadata,
  HistogramMetadata,
  PieChartMetadata
]
