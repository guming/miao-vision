---
title: Date Format Test
---

# Date Formatting Test

## Option 1: 使用 DATE 类型转换（推荐）

```sql sales_with_date
SELECT
  CAST(date AS DATE) as date,
  product,
  revenue,
  margin
FROM read_csv_auto('test_data/sales_data.csv')
LIMIT 10
```

```datatable
query: sales_with_date
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
  - name: margin
    label: Margin
    format: percent
    align: right
```

---

## Option 2: 使用 STRPTIME 解析日期

```sql sales_parsed
SELECT
  STRPTIME(date, '%Y-%m-%d') as date,
  product,
  revenue
FROM read_csv_auto('test_data/sales_data.csv')
LIMIT 10
```

```datatable
query: sales_parsed
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
```

---

## Option 3: 格式化为字符串（备选）

```sql sales_formatted
SELECT
  STRFTIME(CAST(date AS DATE), '%Y年%m月%d日') as formatted_date,
  product,
  revenue
FROM read_csv_auto('test_data/sales_data.csv')
LIMIT 10
```

```datatable
query: sales_formatted
```

---

## 测试内联数据（不依赖 CSV）

```sql inline_dates
SELECT * FROM (VALUES
  (DATE '2024-01-01', 'Product A', 1000),
  (DATE '2024-01-15', 'Product B', 2000),
  (DATE '2024-02-01', 'Product C', 1500),
  (DATE '2024-02-15', 'Product D', 2500),
  (DATE '2024-03-01', 'Product E', 1800)
) AS t(order_date, product, amount)
```

```datatable
query: inline_dates
columns:
  - name: order_date
    label: Order Date
    format: date
  - name: product
    label: Product
  - name: amount
    label: Amount
    format: currency
    align: right
```
