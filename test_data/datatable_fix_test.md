---
title: DataTable Fix Verification
---

# DataTable 修复验证

## ✅ 测试 1: 最简单的 DataTable

```sql simple_data
SELECT * FROM (VALUES
  (1, 'Apple', 100),
  (2, 'Banana', 200),
  (3, 'Orange', 150)
) AS t(id, name, price)
```

```datatable
query: simple_data
```

**预期**：应该显示一个包含 3 行数据的表格

---

## ✅ 测试 2: 带格式化的 DataTable

```sql formatted_data
SELECT * FROM (VALUES
  (DATE '2024-01-01', 'Product A', 1000, 0.25),
  (DATE '2024-01-15', 'Product B', 2000, 0.30),
  (DATE '2024-02-01', 'Product C', 1500, 0.28)
) AS t(order_date, product, revenue, margin)
```

```datatable
query: formatted_data
columns:
  - name: order_date
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
searchable: true
sortable: true
exportable: true
```

**预期**：
- Date 列：2024/01/01, 2024/01/15, 2024/02/01
- Revenue 列：¥1,000, ¥2,000, ¥1,500
- Margin 列：25%, 30%, 28%

---

## ✅ 测试 3: CSV 文件（如果文件存在）

```sql csv_sales
SELECT * FROM read_csv_auto('test_data/sales_data.csv')
LIMIT 20
```

```datatable
query: csv_sales
columns:
  - name: date
    format: date
  - name: product
  - name: revenue
    format: currency
    align: right
  - name: profit
    format: currency
    align: right
  - name: margin
    format: percent
    align: right
```

---

## 操作步骤

1. **点击 "Execute Report" 按钮** （必须！）
2. 等待 SQL 查询执行完成
3. 查看 DataTable 是否正确显示

## 成功标志

- ✅ 看到表格数据
- ✅ 可以在搜索框输入内容进行过滤
- ✅ 点击列头可以排序
- ✅ 可以点击 "Export CSV" 按钮

## 如果还有问题

请打开浏览器控制台（F12），查看是否有错误信息，并告诉我：
1. 控制台的完整错误信息
2. DataTable 位置显示的内容
