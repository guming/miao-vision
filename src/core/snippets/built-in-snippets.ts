/**
 * Built-in SQL Snippets Library
 *
 * This module provides a curated collection of SQL snippets for common
 * BI analysis patterns. Each snippet is battle-tested and follows best practices.
 *
 * Design Principles:
 * - Start with most commonly used patterns
 * - Clear, self-documenting SQL
 * - Sensible defaults
 * - Comprehensive parameter descriptions
 * - DuckDB-WASM compatible
 *
 * @module core/snippets/built-in-snippets
 */

import type { SQLSnippet } from '@/types/snippet'

/**
 * Generate unique ID for built-in snippets
 */
function builtInId(name: string): string {
  return `builtin-${name}`
}

/**
 * Current timestamp for consistent creation dates
 */
const NOW = new Date()

// ============================================================================
// TIME SERIES ANALYSIS
// ============================================================================

/**
 * Week over Week Growth
 *
 * Calculates percentage change compared to last week.
 * Essential for tracking weekly KPI trends.
 */
const weekOverWeekGrowth: SQLSnippet = {
  id: builtInId('wow-growth'),
  name: 'Week over Week Growth',
  description: 'Calculate week-over-week percentage change for a metric',
  category: 'time-series',
  tags: ['growth', 'wow', 'comparison', 'kpi', 'weekly'],
  trigger: 'wow',
  template: `WITH this_week AS (
  SELECT SUM(\${metric}) as value
  FROM \${table}
  WHERE \${date_column} >= date_trunc('week', CURRENT_DATE)
),
last_week AS (
  SELECT SUM(\${metric}) as value
  FROM \${table}
  WHERE \${date_column} >= date_trunc('week', CURRENT_DATE - INTERVAL 7 DAY)
    AND \${date_column} < date_trunc('week', CURRENT_DATE)
)
SELECT
  this_week.value as this_week_value,
  last_week.value as last_week_value,
  ((this_week.value - last_week.value) / NULLIF(last_week.value, 0) * 100) as wow_growth_pct
FROM this_week, last_week`,
  parameters: [
    {
      name: 'metric',
      description: 'The metric column to calculate (e.g., revenue, orders)',
      type: 'column',
      placeholder: 'revenue',
      required: true
    },
    {
      name: 'table',
      description: 'Source table name',
      type: 'table',
      placeholder: 'sales',
      required: true
    },
    {
      name: 'date_column',
      description: 'Date column for time filtering',
      type: 'column',
      placeholder: 'order_date',
      required: true
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

/**
 * Month over Month Growth
 *
 * Compares current month performance with previous month.
 */
const monthOverMonthGrowth: SQLSnippet = {
  id: builtInId('mom-growth'),
  name: 'Month over Month Growth',
  description: 'Calculate month-over-month percentage change',
  category: 'time-series',
  tags: ['growth', 'mom', 'monthly', 'trend', 'kpi'],
  trigger: 'mom',
  template: `WITH this_month AS (
  SELECT SUM(\${metric}) as value
  FROM \${table}
  WHERE \${date_column} >= date_trunc('month', CURRENT_DATE)
),
last_month AS (
  SELECT SUM(\${metric}) as value
  FROM \${table}
  WHERE \${date_column} >= date_trunc('month', CURRENT_DATE - INTERVAL 1 MONTH)
    AND \${date_column} < date_trunc('month', CURRENT_DATE)
)
SELECT
  this_month.value as this_month_value,
  last_month.value as last_month_value,
  ((this_month.value - last_month.value) / NULLIF(last_month.value, 0) * 100) as mom_growth_pct
FROM this_month, last_month`,
  parameters: [
    {
      name: 'metric',
      description: 'Metric to measure',
      type: 'column',
      placeholder: 'revenue',
      required: true
    },
    {
      name: 'table',
      description: 'Source table',
      type: 'table',
      placeholder: 'sales',
      required: true
    },
    {
      name: 'date_column',
      description: 'Date column',
      type: 'column',
      placeholder: 'order_date',
      required: true
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

/**
 * Moving Average (7-day)
 *
 * Smooths noisy data using 7-day rolling average.
 * Great for identifying trends in daily metrics.
 */
const movingAverage7d: SQLSnippet = {
  id: builtInId('ma7'),
  name: 'Moving Average (7-day)',
  description: '7-day rolling average for smoothing trends',
  category: 'time-series',
  tags: ['moving-average', 'rolling', 'trend', 'smoothing', '7day'],
  trigger: 'ma7',
  template: `SELECT
  \${date_column},
  \${metric},
  AVG(\${metric}) OVER (
    ORDER BY \${date_column}
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as ma_7d
FROM \${table}
ORDER BY \${date_column}`,
  parameters: [
    {
      name: 'date_column',
      description: 'Date column for ordering',
      type: 'column',
      placeholder: 'order_date',
      required: true
    },
    {
      name: 'metric',
      description: 'Metric to smooth',
      type: 'column',
      placeholder: 'daily_revenue',
      required: true
    },
    {
      name: 'table',
      description: 'Source table',
      type: 'table',
      placeholder: 'daily_sales',
      required: true
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

/**
 * Moving Average (30-day)
 *
 * Longer-term trend analysis with 30-day window.
 */
const movingAverage30d: SQLSnippet = {
  id: builtInId('ma30'),
  name: 'Moving Average (30-day)',
  description: '30-day rolling average for long-term trends',
  category: 'time-series',
  tags: ['moving-average', 'rolling', 'trend', '30day'],
  trigger: 'ma30',
  template: `SELECT
  \${date_column},
  \${metric},
  AVG(\${metric}) OVER (
    ORDER BY \${date_column}
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) as ma_30d
FROM \${table}
ORDER BY \${date_column}`,
  parameters: [
    {
      name: 'date_column',
      type: 'column',
      description: 'Date column',
      placeholder: 'order_date',
      required: true
    },
    {
      name: 'metric',
      type: 'column',
      description: 'Metric to average',
      placeholder: 'revenue',
      required: true
    },
    {
      name: 'table',
      type: 'table',
      description: 'Source table',
      placeholder: 'sales',
      required: true
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

// ============================================================================
// WINDOW FUNCTIONS
// ============================================================================

/**
 * Rank by Metric
 *
 * Ranks rows by a metric (e.g., top products, customers, regions).
 * Uses RANK() to handle ties properly.
 */
const rankByMetric: SQLSnippet = {
  id: builtInId('rank'),
  name: 'Rank by Metric',
  description: 'Rank rows by a metric (e.g., top products by revenue)',
  category: 'window-function',
  tags: ['rank', 'top-n', 'window-function', 'leaderboard'],
  trigger: 'rank',
  template: `SELECT
  \${dimension},
  \${metric},
  RANK() OVER (ORDER BY \${metric} DESC) as rank,
  PERCENT_RANK() OVER (ORDER BY \${metric} DESC) as percentile
FROM \${table}
WHERE \${filter}
ORDER BY rank
LIMIT \${limit}`,
  parameters: [
    {
      name: 'dimension',
      type: 'column',
      description: 'Dimension to rank (e.g., product, customer)',
      placeholder: 'product_name',
      required: true
    },
    {
      name: 'metric',
      type: 'column',
      description: 'Metric to rank by',
      placeholder: 'revenue',
      required: true
    },
    {
      name: 'table',
      type: 'table',
      description: 'Source table',
      placeholder: 'sales',
      required: true
    },
    {
      name: 'filter',
      type: 'string',
      description: 'Filter condition (optional)',
      defaultValue: '1=1',
      placeholder: "order_date >= '2024-01-01'",
      required: false
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Number of top results',
      defaultValue: '10',
      placeholder: '10',
      required: false
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

/**
 * Running Total
 *
 * Calculates cumulative sum over time.
 * Essential for tracking year-to-date, month-to-date metrics.
 */
const runningTotal: SQLSnippet = {
  id: builtInId('running-total'),
  name: 'Running Total (Cumulative Sum)',
  description: 'Calculate cumulative sum over time',
  category: 'window-function',
  tags: ['cumulative', 'running-total', 'sum', 'ytd', 'mtd'],
  trigger: 'cumsum',
  template: `SELECT
  \${date_column},
  \${metric},
  SUM(\${metric}) OVER (
    ORDER BY \${date_column}
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) as running_total
FROM \${table}
ORDER BY \${date_column}`,
  parameters: [
    {
      name: 'date_column',
      type: 'column',
      description: 'Date column for ordering',
      placeholder: 'order_date',
      required: true
    },
    {
      name: 'metric',
      type: 'column',
      description: 'Metric to sum',
      placeholder: 'revenue',
      required: true
    },
    {
      name: 'table',
      type: 'table',
      description: 'Source table',
      placeholder: 'sales',
      required: true
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

/**
 * LAG Comparison
 *
 * Compares current value with previous period.
 * Useful for period-over-period analysis.
 */
const lagComparison: SQLSnippet = {
  id: builtInId('lag'),
  name: 'Compare with Previous Period (LAG)',
  description: 'Compare current value with previous period using LAG',
  category: 'window-function',
  tags: ['lag', 'previous', 'comparison', 'period-over-period'],
  trigger: 'lag',
  template: `SELECT
  \${date_column},
  \${metric},
  LAG(\${metric}, 1) OVER (ORDER BY \${date_column}) as previous_period,
  \${metric} - LAG(\${metric}, 1) OVER (ORDER BY \${date_column}) as change,
  ((\${metric} - LAG(\${metric}, 1) OVER (ORDER BY \${date_column})) /
   NULLIF(LAG(\${metric}, 1) OVER (ORDER BY \${date_column}), 0) * 100) as change_pct
FROM \${table}
ORDER BY \${date_column}`,
  parameters: [
    {
      name: 'date_column',
      type: 'column',
      description: 'Date column',
      placeholder: 'month',
      required: true
    },
    {
      name: 'metric',
      type: 'column',
      description: 'Metric to compare',
      placeholder: 'monthly_revenue',
      required: true
    },
    {
      name: 'table',
      type: 'table',
      description: 'Source table',
      placeholder: 'monthly_metrics',
      required: true
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Group By Summary
 *
 * Standard aggregation with group by.
 * Most common pattern in BI analysis.
 */
const groupBySummary: SQLSnippet = {
  id: builtInId('group-by'),
  name: 'Group By Summary',
  description: 'Aggregate metrics by dimension with GROUP BY',
  category: 'aggregation',
  tags: ['group-by', 'aggregate', 'sum', 'count'],
  trigger: 'groupby',
  template: `SELECT
  \${dimension},
  COUNT(*) as row_count,
  SUM(\${metric}) as total_\${metric},
  AVG(\${metric}) as avg_\${metric},
  MIN(\${metric}) as min_\${metric},
  MAX(\${metric}) as max_\${metric}
FROM \${table}
WHERE \${filter}
GROUP BY \${dimension}
ORDER BY total_\${metric} DESC
LIMIT \${limit}`,
  parameters: [
    {
      name: 'dimension',
      type: 'column',
      description: 'Dimension to group by',
      placeholder: 'product_category',
      required: true
    },
    {
      name: 'metric',
      type: 'column',
      description: 'Metric to aggregate',
      placeholder: 'revenue',
      required: true
    },
    {
      name: 'table',
      type: 'table',
      description: 'Source table',
      placeholder: 'sales',
      required: true
    },
    {
      name: 'filter',
      type: 'string',
      description: 'Filter condition',
      defaultValue: '1=1',
      placeholder: "status = 'completed'",
      required: false
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Result limit',
      defaultValue: '100',
      placeholder: '100',
      required: false
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

// ============================================================================
// DATA QUALITY
// ============================================================================

/**
 * NULL Value Analysis
 *
 * Checks for NULL values in columns.
 * Essential for data quality validation.
 */
const nullCheck: SQLSnippet = {
  id: builtInId('null-check'),
  name: 'NULL Value Analysis',
  description: 'Analyze NULL values in columns',
  category: 'data-quality',
  tags: ['null', 'data-quality', 'validation', 'completeness'],
  trigger: 'nullcheck',
  template: `SELECT
  '\${table}' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) - COUNT(\${column}) as null_count,
  (COUNT(*) - COUNT(\${column}))::FLOAT / COUNT(*) * 100 as null_percentage
FROM \${table}`,
  parameters: [
    {
      name: 'table',
      type: 'table',
      description: 'Table to analyze',
      placeholder: 'sales',
      required: true
    },
    {
      name: 'column',
      type: 'column',
      description: 'Column to check for NULLs',
      placeholder: 'customer_id',
      required: true
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

/**
 * Duplicate Detection
 *
 * Finds duplicate records based on key columns.
 */
const duplicateDetection: SQLSnippet = {
  id: builtInId('duplicates'),
  name: 'Detect Duplicate Records',
  description: 'Find duplicate records based on key columns',
  category: 'data-quality',
  tags: ['duplicates', 'data-quality', 'validation', 'uniqueness'],
  trigger: 'duplicates',
  template: `SELECT
  \${key_columns},
  COUNT(*) as duplicate_count
FROM \${table}
GROUP BY \${key_columns}
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT \${limit}`,
  parameters: [
    {
      name: 'key_columns',
      type: 'string',
      description: 'Columns to check for duplicates (comma-separated)',
      placeholder: 'order_id, customer_id',
      required: true
    },
    {
      name: 'table',
      type: 'table',
      description: 'Table to analyze',
      placeholder: 'orders',
      required: true
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Result limit',
      defaultValue: '50',
      placeholder: '50',
      required: false
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

// ============================================================================
// STATISTICAL
// ============================================================================

/**
 * Percentiles
 *
 * Calculates distribution percentiles (25th, 50th, 75th, 95th).
 * Essential for understanding data distribution.
 */
const percentiles: SQLSnippet = {
  id: builtInId('percentiles'),
  name: 'Calculate Percentiles',
  description: 'Calculate common percentiles (25th, 50th, 75th, 95th)',
  category: 'statistical',
  tags: ['percentile', 'quantile', 'distribution', 'median'],
  trigger: 'percentile',
  template: `SELECT
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY \${metric}) as p25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY \${metric}) as p50_median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY \${metric}) as p75,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY \${metric}) as p95
FROM \${table}
WHERE \${filter}`,
  parameters: [
    {
      name: 'metric',
      type: 'column',
      description: 'Metric to analyze',
      placeholder: 'order_value',
      required: true
    },
    {
      name: 'table',
      type: 'table',
      description: 'Source table',
      placeholder: 'orders',
      required: true
    },
    {
      name: 'filter',
      type: 'string',
      description: 'Filter condition',
      defaultValue: '1=1',
      placeholder: "status = 'completed'",
      required: false
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

// ============================================================================
// DATE MANIPULATION
// ============================================================================

/**
 * Date Range Filter
 *
 * Common date filtering patterns.
 */
const dateRangeFilter: SQLSnippet = {
  id: builtInId('date-range'),
  name: 'Date Range Filter',
  description: 'Filter data by date range with common patterns',
  category: 'date-manipulation',
  tags: ['date', 'filter', 'range', 'time'],
  trigger: 'daterange',
  template: `SELECT *
FROM \${table}
WHERE \${date_column} >= CURRENT_DATE - INTERVAL \${days} DAY
  AND \${date_column} < CURRENT_DATE
ORDER BY \${date_column} DESC`,
  parameters: [
    {
      name: 'table',
      type: 'table',
      description: 'Source table',
      placeholder: 'sales',
      required: true
    },
    {
      name: 'date_column',
      type: 'column',
      description: 'Date column',
      placeholder: 'order_date',
      required: true
    },
    {
      name: 'days',
      type: 'number',
      description: 'Number of days to look back',
      defaultValue: '30',
      placeholder: '30',
      required: false
    }
  ],
  isBuiltIn: true,
  isFavorite: false,
  usageCount: 0,
  createdAt: NOW,
  lastModified: NOW
}

// ============================================================================
// EXPORT ALL BUILT-IN SNIPPETS
// ============================================================================

/**
 * All built-in snippets
 *
 * Ordered by category and usage frequency
 */
export const BUILTIN_SNIPPETS: SQLSnippet[] = [
  // Time Series (most commonly used)
  weekOverWeekGrowth,
  monthOverMonthGrowth,
  movingAverage7d,
  movingAverage30d,

  // Window Functions
  rankByMetric,
  runningTotal,
  lagComparison,

  // Aggregation
  groupBySummary,

  // Data Quality
  nullCheck,
  duplicateDetection,

  // Statistical
  percentiles,

  // Date Manipulation
  dateRangeFilter
]

/**
 * Get all built-in snippets
 */
export function getBuiltInSnippets(): SQLSnippet[] {
  return BUILTIN_SNIPPETS
}

/**
 * Get snippets by category
 */
export function getSnippetsByCategory(category: string): SQLSnippet[] {
  return BUILTIN_SNIPPETS.filter(s => s.category === category)
}

/**
 * Get snippet by trigger word
 */
export function getSnippetByTrigger(trigger: string): SQLSnippet | undefined {
  return BUILTIN_SNIPPETS.find(s => s.trigger === trigger)
}

/**
 * Search snippets by keyword
 */
export function searchSnippets(query: string): SQLSnippet[] {
  const lowerQuery = query.toLowerCase()
  return BUILTIN_SNIPPETS.filter(s =>
    s.name.toLowerCase().includes(lowerQuery) ||
    s.description.toLowerCase().includes(lowerQuery) ||
    s.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Get most popular snippets (by category priority)
 *
 * Returns snippets likely to be most useful for BI analysts
 */
export function getPopularSnippets(limit: number = 5): SQLSnippet[] {
  // Priority order: time-series > window-function > aggregation
  return BUILTIN_SNIPPETS.slice(0, limit)
}
