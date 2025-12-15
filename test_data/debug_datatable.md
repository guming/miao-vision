---
title: DataTable Debug Test
---

# DataTable 调试测试

## 步骤 1: 最简单的测试（内联数据）

这个测试不依赖任何文件，应该 100% 可用：

```sql simple_test
SELECT * FROM (VALUES
  (1, 'Apple', 100),
  (2, 'Banana', 200),
  (3, 'Orange', 150)
) AS t(id, name, price)
```

```datatable
query: simple_test
```

**操作**: 点击页面上的 "Execute Report" 按钮

**预期结果**:
- 应该看到一个包含 3 行数据的表格
- 有 3 列：id, name, price
- 可以搜索、排序

---

## 步骤 2: 带格式化的测试

```sql formatted_test
SELECT * FROM (VALUES
  (DATE '2024-01-01', 'Item A', 1000, 0.25),
  (DATE '2024-01-15', 'Item B', 2000, 0.30),
  (DATE '2024-02-01', 'Item C', 1500, 0.28)
) AS t(order_date, product, revenue, margin)
```

```datatable
query: formatted_test
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

**预期结果**:
- Date 列显示：2024/01/01
- Revenue 列显示：¥1,000
- Margin 列显示：25%

---

## 步骤 3: CSV 文件测试

```sql csv_test
SELECT * FROM read_csv_auto('test_data/sales_data.csv')
LIMIT 10
```

```datatable
query: csv_test
columns:
  - name: date
    format: date
  - name: product
  - name: revenue
    format: currency
    align: right
```

---

## 调试检查清单

### ✅ 必须做的事情：

1. **点击 "Execute Report" 按钮**
   - SQL 查询必须先执行
   - 不执行的话 DataTable 找不到数据

2. **检查浏览器控制台**（按 F12）
   - 查看 Console 标签
   - 搜索 "DataTable" 关键词
   - 看是否有错误信息

3. **检查 SQL 查询是否成功**
   - 应该看到 SQL 结果显示在代码块下方
   - 如果 SQL 没执行成功，DataTable 不会显示

### 🔍 常见问题：

**问题 1: 没有点击 Execute Report**
- ❌ 只是编辑了 Markdown
- ✅ 必须点击 "Execute Report" 按钮

**问题 2: SQL 查询名称不匹配**
```markdown
\`\`\`sql my_query    ← 这里
SELECT ...
\`\`\`

\`\`\`datatable
query: my_data        ← 这里不匹配！
\`\`\`
```

**问题 3: SQL 查询失败**
- 检查表名是否存在
- 检查文件路径是否正确

**问题 4: 缓存问题**
- 硬刷新浏览器：Ctrl+Shift+R（Mac: Cmd+Shift+R）
- 清除浏览器缓存

---

## 浏览器控制台应该看到的日志

成功的情况下，控制台应该显示类似：

```
🔧 rehype-block-placeholder: Transformer function called
  → Replacing datatable block block_0 with placeholder
✅ DataTable mounted: 3 rows, 3 columns
```

失败的情况下，可能显示：

```
❌ DataTable: SQL result not found for query "simple_test"
⚠️ Parsed block not found for block_0
```

---

## 如果还是不显示

请检查以下信息并告诉我：

1. **浏览器控制台的错误信息**（完整复制）
2. **SQL 查询是否执行成功**（是否看到查询结果）
3. **使用的完整 Markdown 内容**
4. **DataTable 的位置**（是什么显示的？空白？还是有提示信息？）
