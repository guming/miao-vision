---
title: Pie Chart Demo
author: Miaoshou Vision
date: 2024-12-15
description: Demonstration of Pie Chart and Donut Chart
---

# 🥧 Pie Chart Demo

This report demonstrates the **Pie Chart** component - supporting both basic pie charts and donut variants.

---

## 📊 Basic Pie Chart Example

### Sales by Category

```sql category_sales
SELECT * FROM (VALUES
  ('Electronics', 125000),
  ('Clothing', 89000),
  ('Food & Beverage', 67000),
  ('Home & Garden', 45000),
  ('Sports', 38000)
) AS t(category, revenue)
```

```pie
data: category_sales
x: category
y: revenue
title: Revenue by Category
```

---

## 🍩 Donut Chart Variant

Use `innerRadius` to create a donut chart:

```pie
data: category_sales
x: category
y: revenue
title: Revenue Distribution (Donut)
innerRadius: 60
```

---

## 📈 Value Component with Pie Chart

### Total Revenue Summary

```sql total_revenue
SELECT SUM(revenue) as total FROM (VALUES
  ('Electronics', 125000),
  ('Clothing', 89000),
  ('Food & Beverage', 67000),
  ('Home & Garden', 45000),
  ('Sports', 38000)
) AS t(category, revenue)
```

```bigvalue
query: total_revenue
value: total
title: Total Revenue
format: currency
```

---

## 🎯 Interactive Filtering with Pie Chart

### Available Regions

```sql region_list
SELECT * FROM (VALUES
  ('North America'),
  ('Europe'),
  ('Asia Pacific'),
  ('Latin America')
) AS t(region)
```

### Select a Region

```dropdown
name: pie_region
data: region_list
value: region
title: Select Region for Pie Chart
defaultValue: North America
```

### Regional Sales Data

```sql regional_category_sales
SELECT * FROM (VALUES
  ('North America', 'Electronics', 85000),
  ('North America', 'Clothing', 52000),
  ('North America', 'Food', 38000),
  ('North America', 'Home', 29000),
  ('Europe', 'Electronics', 72000),
  ('Europe', 'Clothing', 68000),
  ('Europe', 'Food', 45000),
  ('Europe', 'Home', 31000),
  ('Asia Pacific', 'Electronics', 120000),
  ('Asia Pacific', 'Clothing', 45000),
  ('Asia Pacific', 'Food', 62000),
  ('Asia Pacific', 'Home', 28000),
  ('Latin America', 'Electronics', 38000),
  ('Latin America', 'Clothing', 29000),
  ('Latin America', 'Food', 35000),
  ('Latin America', 'Home', 18000)
) AS t(region, category, sales)
WHERE region = ${inputs.pie_region}
```

### Regional Sales Pie Chart

```pie
data: regional_category_sales
x: category
y: sales
title: Sales by Category - ${inputs.pie_region}
```

### Regional Total

```bigvalue
query: regional_category_sales
value: sales
title: Regional Total (${inputs.pie_region})
format: currency
```

---

## 🎨 Pie Chart Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | string | required | SQL query name |
| `x` | string | required | Column for slice labels |
| `y` | string | required | Column for slice values |
| `title` | string | - | Chart title |
| `innerRadius` | number | 0 | Inner radius (0=pie, >0=donut) |
| `padAngle` | number | 0.02 | Gap between slices (radians) |
| `cornerRadius` | number | 3 | Rounded corners |
| `showLabels` | boolean | true | Show category labels |
| `showPercentages` | boolean | true | Show percentage values |
| `width` | number | 500 | Chart width |
| `height` | number | 400 | Chart height |

---

## 📋 Data Table View

```datatable
query: category_sales
searchable: true
sortable: true
columns:
  - name: category
    label: Category
    format: text
  - name: revenue
    label: Revenue
    format: currency
    align: right
```

---

## ✨ Key Features

- **Basic Pie Chart** - Standard pie with colored slices
- **Donut Chart** - Set `innerRadius > 0` for hollow center
- **Interactive Labels** - Hover for tooltips
- **Legend** - Color-coded category legend
- **Dark Theme** - Optimized for dark mode UI
- **Template Variables** - Use `${inputs.name}` for dynamic filtering

---

## 🚀 Try It!

1. Click **"Execute Report"** to run all queries
2. Try the **dropdown** to filter by region
3. Watch the pie chart **update automatically**
4. Hover over slices to see **tooltips**
