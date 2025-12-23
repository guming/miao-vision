---
title: Reference SQL Demo
author: Miao Vision
date: 2024-12-15
---

# Reference SQL Demo

## Step 1: Base Query

```sql base_data
SELECT * FROM (VALUES
  ('A', 100),
  ('B', 200),
  ('C', 150)
) AS t(category, value)
```

## Step 2: Reference Query

This query references the base query using `${base_data}`:

```sql aggregated
SELECT category, value * 2 as doubled
FROM ${base_data}
```

## Step 3: Chart (uses generic chart syntax)

```chart
type: bar
data: aggregated
x: category
y: doubled
title: Doubled Values
```
