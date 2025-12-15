---
title: ButtonGroup Demo
author: Miaoshou Vision
date: 2024-12-11
description: Demonstration of ButtonGroup input component
---

# 🎯 ButtonGroup Component Demo

This report demonstrates the **ButtonGroup** input component - a user-friendly alternative to dropdowns for small option sets.

---

## Example 1: Inline Options (Simple)

Use inline options when you have a fixed, small set of choices.

```buttongroup
name: time_period
title: Select Time Period
options:
  - day: Daily
  - week: Weekly
  - month: Monthly
  - year: Yearly
defaultValue: month
```

### Display Selected Value

You selected: **${inputs.time_period}**

---

## Example 2: SQL Data Source

Load options dynamically from a SQL query.

### Step 1: Get Available Categories

```sql categories_list
SELECT * FROM (VALUES
  ('electronics', 'Electronics'),
  ('clothing', 'Clothing'),
  ('food', 'Food & Beverage'),
  ('books', 'Books')
) AS t(category_id, category_name)
```

### Step 2: Create ButtonGroup with SQL Data

```buttongroup
name: selected_category
title: Select Product Category
data: categories_list
value: category_id
label: category_name
defaultValue: electronics
```

### Step 3: Filter Data by Selected Category

```sql category_sales
SELECT * FROM (VALUES
  ('electronics', '2024-01', 45000, 320),
  ('electronics', '2024-02', 52000, 380),
  ('electronics', '2024-03', 48000, 350),
  ('clothing', '2024-01', 32000, 450),
  ('clothing', '2024-02', 38000, 520),
  ('clothing', '2024-03', 35000, 480),
  ('food', '2024-01', 28000, 680),
  ('food', '2024-02', 31000, 720),
  ('food', '2024-03', 29000, 700),
  ('books', '2024-01', 15000, 280),
  ('books', '2024-02', 18000, 310),
  ('books', '2024-03', 16000, 295)
) AS t(category, month, revenue, orders)
WHERE category = ${inputs.selected_category}
```

### Step 4: Visualize Results

#### 💰 Total Revenue

```bigvalue
query: category_sales
value: revenue
title: Total Revenue (${inputs.selected_category})
format: currency
```

#### 📈 Revenue Trend

```chart
type: line
data: category_sales
x: month
y: revenue
title: Revenue Trend - ${inputs.selected_category}
xLabel: Month
yLabel: Revenue ($)
```

#### 📊 Orders Trend

```chart
type: bar
data: category_sales
x: month
y: orders
title: Orders Count - ${inputs.selected_category}
xLabel: Month
yLabel: Orders
```

---

## Example 3: Multiple ButtonGroups

You can use multiple button groups to create interactive dashboards.

```buttongroup
name: region
title: Select Region
options:
  - north: North
  - south: South
  - east: East
  - west: West
defaultValue: north
```

```buttongroup
name: metric
title: Select Metric
options:
  - revenue: Revenue
  - orders: Orders
  - customers: Customers
defaultValue: revenue
```

### Current Selection

- **Region:** ${inputs.region}
- **Metric:** ${inputs.metric}

---

## Design Notes

**When to use ButtonGroup vs Dropdown:**

- ✅ **ButtonGroup** - Best for 2-7 options, clearer visual feedback
- ✅ **Dropdown** - Best for 8+ options, saves space

**Features:**
- Single selection only (no multi-select)
- Supports both inline options and SQL data sources
- Clean, modern design with hover/active states
- Dark mode support
- Keyboard accessible
