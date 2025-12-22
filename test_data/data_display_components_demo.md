---
title: Data Display Components Demo
---

# Data Display Components Demo

This demo showcases all 18 data display components available in Miaoshou Vision.

---

## 1. BigValue & Value

Display single key metrics prominently.

```sql revenue_metric
SELECT 1250000 as value, 125000 as comparison
```

```bigvalue
data: revenue_metric
value: value
title: Total Revenue
format: currency
comparison: comparison
comparisonLabel: vs Last Month
```

```sql growth_rate
SELECT 23.5 as rate
```

```value
data: growth_rate
value: rate
title: Growth Rate
format: percent
```

---

## 2. Delta

Show value changes with directional indicators.

```sql monthly_change
SELECT 15.8 as change, 'increase' as direction
```

```delta
data: monthly_change
value: change
direction: direction
title: Monthly Change
format: percent
```

---

## 3. Sparkline

Compact trend visualization.

```sql daily_sales
SELECT * FROM (VALUES
  (1, 120), (2, 145), (3, 132), (4, 167), (5, 155),
  (6, 178), (7, 165), (8, 189), (9, 201), (10, 195),
  (11, 210), (12, 225)
) AS t(day, sales)
```

```sparkline
data: daily_sales
valueColumn: sales
title: Daily Sales Trend
color: #3b82f6
showArea: true
```

---

## 4. Progress

Display completion status.

```sql project_progress
SELECT 'Project Alpha' as project, 75 as progress
```

```progress
data: project_progress
value: progress
title: Project Alpha
max: 100
showLabel: true
color: #22c55e
```

---

## 5. KPIGrid

Dashboard-style KPI cards.

```sql kpi_data
SELECT * FROM (VALUES
  ('Revenue', 1250000, 'currency', 12.5, 'up'),
  ('Users', 45678, 'number', 8.3, 'up'),
  ('Conversion', 3.45, 'percent', -2.1, 'down'),
  ('Orders', 12543, 'number', 15.7, 'up')
) AS t(metric, value, format, change, trend)
```

```kpigrid
data: kpi_data
labelColumn: metric
valueColumn: value
formatColumn: format
changeColumn: change
trendColumn: trend
columns: 4
```

---

## 6. DataTable

Full-featured data table with sorting, filtering, and export.

```sql sales_team
SELECT * FROM (VALUES
  ('Alice', 'North', 125000, 21.6, 45),
  ('Bob', 'South', 143000, 19.6, 52),
  ('Carol', 'East', 98000, 16.3, 38),
  ('David', 'West', 167000, 23.4, 61),
  ('Eve', 'North', 134000, 23.9, 48)
) AS t(rep, region, revenue, margin, deals)
```

```datatable
query: sales_team
sortable: true
searchable: true
exportable: true
```

---

## 7. Funnel

Visualize conversion stages.

```sql conversion_funnel
SELECT * FROM (VALUES
  ('Visitors', 10000),
  ('Sign-ups', 3500),
  ('Active Users', 2100),
  ('Paid Users', 850),
  ('Premium', 320)
) AS t(stage, count)
```

```funnel
data: conversion_funnel
labelColumn: stage
valueColumn: count
title: Conversion Funnel
showPercentage: true
```

---

## 8. Calendar Heatmap

Activity over time visualization.

```sql activity_data
SELECT * FROM (VALUES
  ('2024-01-15', 5), ('2024-01-16', 12), ('2024-01-17', 8),
  ('2024-01-18', 15), ('2024-01-19', 3), ('2024-01-20', 0),
  ('2024-01-21', 7), ('2024-01-22', 18), ('2024-01-23', 22),
  ('2024-01-24', 14), ('2024-01-25', 9), ('2024-01-26', 6),
  ('2024-01-27', 2), ('2024-01-28', 11), ('2024-01-29', 16),
  ('2024-01-30', 20), ('2024-01-31', 25)
) AS t(date, contributions)
```

```calendar-heatmap
data: activity_data
dateColumn: date
valueColumn: contributions
title: Activity Heatmap
```

---

## 9. Sankey

Flow and relationship visualization.

```sql flow_data
SELECT * FROM (VALUES
  ('Marketing', 'Website', 1000),
  ('Marketing', 'Social', 800),
  ('Website', 'Signup', 600),
  ('Website', 'Bounce', 400),
  ('Social', 'Signup', 300),
  ('Social', 'Bounce', 500),
  ('Signup', 'Purchase', 450),
  ('Signup', 'Abandon', 450)
) AS t(source, target, value)
```

```sankey
data: flow_data
sourceColumn: source
targetColumn: target
valueColumn: value
title: User Flow
```

---

## 10. Treemap

Hierarchical data as nested rectangles.

```sql category_sales
SELECT * FROM (VALUES
  ('Electronics', 'Phones', 450000),
  ('Electronics', 'Laptops', 380000),
  ('Electronics', 'Tablets', 220000),
  ('Clothing', 'Mens', 280000),
  ('Clothing', 'Womens', 320000),
  ('Clothing', 'Kids', 150000),
  ('Home', 'Furniture', 190000),
  ('Home', 'Decor', 120000)
) AS t(category, subcategory, sales)
```

```treemap
data: category_sales
labelColumn: subcategory
valueColumn: sales
parentColumn: category
title: Sales by Category
valueFormat: currency
```

---

## 11. Histogram

Distribution visualization.

```sql score_distribution
SELECT * FROM (VALUES
  (45), (52), (58), (62), (65), (68), (70), (72), (74), (75),
  (76), (78), (79), (80), (81), (82), (83), (84), (85), (85),
  (86), (87), (88), (89), (90), (91), (92), (93), (95), (98)
) AS t(score)
```

```histogram
data: score_distribution
valueColumn: score
title: Score Distribution
bins: 10
color: #8b5cf6
```

---

## 12. BoxPlot

Statistical distribution with quartiles.

```sql department_salaries
SELECT * FROM (VALUES
  ('Engineering', 85000), ('Engineering', 92000), ('Engineering', 78000),
  ('Engineering', 110000), ('Engineering', 95000), ('Engineering', 88000),
  ('Marketing', 65000), ('Marketing', 72000), ('Marketing', 58000),
  ('Marketing', 80000), ('Marketing', 68000), ('Marketing', 75000),
  ('Sales', 55000), ('Sales', 120000), ('Sales', 85000),
  ('Sales', 95000), ('Sales', 70000), ('Sales', 110000)
) AS t(department, salary)
```

```boxplot
data: department_salaries
categoryColumn: department
valueColumn: salary
title: Salary Distribution by Department
valueFormat: currency
```

---

## 13. Gauge

Single value on a radial scale.

```sql performance_score
SELECT 78 as score
```

```gauge
data: performance_score
value: score
title: Performance Score
min: 0
max: 100
thresholds:
  - value: 40
    color: "#ef4444"
  - value: 70
    color: "#f59e0b"
  - value: 100
    color: "#22c55e"
```

---

## 14. Bullet Chart

Compare actual vs target values.

```sql quarterly_targets
SELECT * FROM (VALUES
  ('Q1 Revenue', 850000, 1000000, 750000),
  ('Q2 Revenue', 920000, 1000000, 800000),
  ('Q3 Revenue', 1050000, 1000000, 900000),
  ('Q4 Revenue', 780000, 1200000, 850000)
) AS t(metric, actual, target, baseline)
```

```bullet
data: quarterly_targets
labelColumn: metric
valueColumn: actual
targetColumn: target
title: Quarterly Performance vs Target
valueFormat: currency
```

---

## 15. Waterfall

Incremental changes visualization.

```sql profit_breakdown
SELECT * FROM (VALUES
  ('Revenue', 500000, false),
  ('COGS', -180000, false),
  ('Gross Profit', 0, true),
  ('Operating Exp', -120000, false),
  ('Marketing', -45000, false),
  ('R&D', -35000, false),
  ('Net Income', 0, true)
) AS t(category, amount, is_total)
```

```waterfall
data: profit_breakdown
labelColumn: category
valueColumn: amount
totalColumn: is_total
title: Profit Breakdown
valueFormat: currency
positiveColor: #22c55e
negativeColor: #ef4444
totalColor: #3b82f6
```

---

## 16. Radar Chart

Multi-dimensional comparison.

```sql skill_assessment
SELECT * FROM (VALUES
  ('JavaScript', 85),
  ('Python', 70),
  ('SQL', 90),
  ('DevOps', 65),
  ('Design', 55),
  ('Communication', 80)
) AS t(skill, score)
```

```radar
data: skill_assessment
labelColumn: skill
valueColumn: score
title: Developer Skills Assessment
fill: true
showDots: true
```

### Multi-Series Radar

```sql team_comparison
SELECT * FROM (VALUES
  ('Speed', 'Team A', 85),
  ('Quality', 'Team A', 90),
  ('Innovation', 'Team A', 75),
  ('Collaboration', 'Team A', 88),
  ('Delivery', 'Team A', 82),
  ('Speed', 'Team B', 78),
  ('Quality', 'Team B', 72),
  ('Innovation', 'Team B', 88),
  ('Collaboration', 'Team B', 80),
  ('Delivery', 'Team B', 90)
) AS t(metric, team, score)
```

```radar
data: team_comparison
labelColumn: metric
valueColumn: score
seriesColumn: team
title: Team Performance Comparison
colors: ["#3b82f6", "#ef4444"]
```

---

## 17. Heatmap (Matrix)

2D data visualization with color intensity.

```sql correlation_matrix
SELECT * FROM (VALUES
  ('Revenue', 'Users', 0.85),
  ('Revenue', 'Sessions', 0.72),
  ('Revenue', 'Conversion', 0.91),
  ('Users', 'Revenue', 0.85),
  ('Users', 'Sessions', 0.95),
  ('Users', 'Conversion', 0.68),
  ('Sessions', 'Revenue', 0.72),
  ('Sessions', 'Users', 0.95),
  ('Sessions', 'Conversion', 0.55),
  ('Conversion', 'Revenue', 0.91),
  ('Conversion', 'Users', 0.68),
  ('Conversion', 'Sessions', 0.55)
) AS t(metric_x, metric_y, correlation)
```

```heatmap
data: correlation_matrix
xColumn: metric_x
yColumn: metric_y
valueColumn: correlation
title: Metric Correlations
minColor: #fecaca
midColor: #fef3c7
maxColor: #bbf7d0
showValues: true
```

### Sales Pivot Heatmap

```sql monthly_sales_pivot
SELECT * FROM (VALUES
  ('Jan', 'Electronics', 45000),
  ('Jan', 'Clothing', 32000),
  ('Jan', 'Home', 28000),
  ('Feb', 'Electronics', 52000),
  ('Feb', 'Clothing', 38000),
  ('Feb', 'Home', 31000),
  ('Mar', 'Electronics', 61000),
  ('Mar', 'Clothing', 42000),
  ('Mar', 'Home', 35000),
  ('Apr', 'Electronics', 58000),
  ('Apr', 'Clothing', 45000),
  ('Apr', 'Home', 38000)
) AS t(month, category, sales)
```

```heatmap
data: monthly_sales_pivot
xColumn: month
yColumn: category
valueColumn: sales
title: Monthly Sales by Category
valueFormat: currency
cellWidth: 60
cellHeight: 50
```

---

## Component Summary

| Component | Use Case |
|-----------|----------|
| BigValue | Hero metrics, KPIs |
| Value | Inline single values |
| Delta | Change indicators |
| Sparkline | Compact trends |
| Progress | Completion status |
| KPIGrid | Dashboard summaries |
| DataTable | Tabular data with features |
| Funnel | Conversion stages |
| CalendarHeatmap | Activity over time |
| Sankey | Flow relationships |
| Treemap | Hierarchical proportions |
| Histogram | Value distribution |
| BoxPlot | Statistical summaries |
| Gauge | Single value on scale |
| BulletChart | Actual vs target |
| Waterfall | Cumulative changes |
| Radar | Multi-dimensional comparison |
| Heatmap | 2D matrix visualization |

---

## Configuration Tips

### Value Formatting
- `number`: Plain number with locale formatting
- `currency`: With currency symbol ($, €, etc.)
- `percent`: As percentage with % suffix

### Colors
- Use hex colors: `#3b82f6`
- Common palette: blue `#3b82f6`, green `#22c55e`, red `#ef4444`, amber `#f59e0b`

### Interactivity
- Most charts support tooltips on hover
- DataTable supports sorting, filtering, search, export
