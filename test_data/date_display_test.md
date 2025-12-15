---
title: Date Display Fix Test
---

# Date Display Test

## Test 1: 使用 CSV 文件（自动检测日期）

```sql csv_dates
SELECT * FROM read_csv_auto('test_data/sales_data.csv')
LIMIT 10
```

```datatable
query: csv_dates
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

**预期**: date 列应显示为 `2024/01/05` 格式，而不是 `1704412800000`

---

## Test 2: 显式 DATE 类型转换

```sql explicit_dates
SELECT
  CAST(date AS DATE) as order_date,
  product,
  revenue
FROM read_csv_auto('test_data/sales_data.csv')
LIMIT 10
```

```datatable
query: explicit_dates
columns:
  - name: order_date
    label: Order Date
    format: date
  - name: product
    label: Product
  - name: revenue
    label: Revenue
    format: currency
    align: right
```

---

## Test 3: 内联日期测试（不依赖文件）

```sql inline_test
SELECT * FROM (VALUES
  (DATE '2024-01-01', 'Product A', 1000),
  (DATE '2024-02-15', 'Product B', 2000),
  (DATE '2024-03-20', 'Product C', 1500),
  (DATE '2024-04-10', 'Product D', 2500),
  (DATE '2024-05-05', 'Product E', 1800)
) AS t(sale_date, product, amount)
```

```datatable
query: inline_test
columns:
  - name: sale_date
    label: Sale Date
    format: date
  - name: product
    label: Product
  - name: amount
    label: Amount
    format: currency
    align: right
```

**预期**: sale_date 列应显示为 `2024/01/01`、`2024/02/15` 等格式

---

## Test 4: 验证查询结果中的原始数据

```sql raw_check
SELECT
  date,
  typeof(date) as date_type,
  product
FROM read_csv_auto('test_data/sales_data.csv')
LIMIT 5
```

```datatable
query: raw_check
```

**预期**: date_type 应该显示为 DATE 类型，date 列应该显示为日期字符串
