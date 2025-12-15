---
title: Simple DataTable Test
author: Test
date: 2024-12-08
---

# DataTable Test

## Step 1: Load CSV Data

```sql load_csv
CREATE TABLE sales AS
SELECT * FROM read_csv_auto('test_data/sales_data.csv')
```

## Step 2: Query Data

```sql my_sales
SELECT
  date,
  product,
  category,
  revenue,
  profit,
  margin
FROM sales
LIMIT 20
```

## Step 3: Display DataTable

```datatable
query: my_sales
```

---

## Advanced Example with Custom Formatting

```sql formatted_sales
SELECT * FROM sales LIMIT 50
```

```datatable
query: formatted_sales
columns:
  - name: date
    label: Date
    format: date
  - name: product
    label: Product
  - name: revenue
    label: Revenue
    format: currency
    align: right
  - name: profit
    label: Profit
    format: currency
    align: right
  - name: margin
    label: Margin
    format: percent
    align: right
searchable: true
sortable: true
exportable: true
```
