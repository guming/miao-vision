---
title: Simple Chart Test
---

# Simple Chart Test

## Step 1: Create Data

```sql test_data
SELECT * FROM (VALUES
  (1, 100),
  (2, 150),
  (3, 120),
  (4, 180),
  (5, 200)
) AS t(x, y)
```

## Step 2: Show Chart

```chart
type: line
data: test_data
x: x
y: y
title: Simple Line Chart
```

## Debug Info

After executing, check console for:
- "Built X chart configs"
- Report blocks count
