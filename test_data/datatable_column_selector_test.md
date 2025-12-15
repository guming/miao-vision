---
title: DataTable Column Selector Test
---

# DataTable 列选择器功能测试

测试新增的列显示/隐藏控制功能。

## 测试 1: 基础列选择器

```sql test_data
SELECT * FROM (VALUES
  (1, 'Apple', 100, 0.25, DATE '2024-01-01'),
  (2, 'Banana', 200, 0.30, DATE '2024-01-02'),
  (3, 'Orange', 150, 0.28, DATE '2024-01-03'),
  (4, 'Grape', 300, 0.35, DATE '2024-01-04'),
  (5, 'Mango', 250, 0.32, DATE '2024-01-05')
) AS t(id, product, revenue, margin, date)
```

```datatable
query: test_data
columnSelector: true
searchable: true
sortable: true
exportable: true
columns:
  - name: id
    label: ID
  - name: product
    label: Product Name
  - name: revenue
    label: Revenue
    format: currency
    align: right
  - name: margin
    label: Margin
    format: percent
    align: right
  - name: date
    label: Date
    format: date
```

**测试步骤**:
1. 点击 "Execute Report" 按钮
2. 点击表格工具栏的 "⚙️ Columns" 按钮
3. 取消勾选一些列（例如 ID, Date）
4. 观察表格只显示选中的列
5. 尝试取消所有列的最后一个（应该被禁用）

**预期结果**:
- ✅ Columns 按钮显示
- ✅ 点击显示下拉菜单
- ✅ 列表显示所有列及其勾选状态
- ✅ 取消勾选后列被隐藏
- ✅ 至少保留一列可见（最后一列不能取消）
- ✅ 搜索、排序、导出功能正常

---

## 测试 2: 默认部分列不可见

```sql sales_data
SELECT * FROM (VALUES
  ('2024-01-01', 'North', 'ProductA', 1000, 800, 200),
  ('2024-01-02', 'South', 'ProductB', 1500, 1000, 500),
  ('2024-01-03', 'East', 'ProductC', 1200, 900, 300),
  ('2024-01-04', 'West', 'ProductA', 1800, 1200, 600)
) AS t(date, region, product, revenue, cost, profit)
```

```datatable
query: sales_data
columnSelector: true
columns:
  - name: date
    label: Date
    format: date
  - name: region
    label: Region
  - name: product
    label: Product
  - name: revenue
    label: Revenue
    format: currency
    align: right
  - name: cost
    label: Cost
    format: currency
    align: right
    visible: false
  - name: profit
    label: Profit
    format: currency
    align: right
```

**测试步骤**:
1. 执行报告
2. 观察 Cost 列默认隐藏
3. 打开列选择器，查看 Cost 列未勾选
4. 勾选 Cost 列
5. 观察 Cost 列显示

**预期结果**:
- ✅ Cost 列默认不显示
- ✅ 列选择器中 Cost 未勾选
- ✅ 勾选后 Cost 列立即显示
- ✅ 取消勾选后 Cost 列立即隐藏

---

## 测试 3: 大量列的场景

```sql wide_data
SELECT * FROM (VALUES
  (1, 'A', 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000),
  (2, 'B', 110, 210, 310, 410, 510, 610, 710, 810, 910, 1010),
  (3, 'C', 120, 220, 320, 420, 520, 620, 720, 820, 920, 1020)
) AS t(id, name, col1, col2, col3, col4, col5, col6, col7, col8, col9, col10)
```

```datatable
query: wide_data
columnSelector: true
searchable: true
columns:
  - name: id
  - name: name
  - name: col1
  - name: col2
  - name: col3
  - name: col4
  - name: col5
  - name: col6
  - name: col7
  - name: col8
  - name: col9
  - name: col10
```

**测试步骤**:
1. 执行报告
2. 观察大量列的水平滚动
3. 打开列选择器
4. 只选择几列（如 id, name, col1, col2）
5. 观察表格变窄，更易阅读

**预期结果**:
- ✅ 列选择器下拉菜单滚动正常（max-height: 300px）
- ✅ 可以轻松隐藏不需要的列
- ✅ 减少列后表格更易阅读

---

## 功能验证清单

### UI 表现
- [ ] Columns 按钮显示在工具栏
- [ ] 点击按钮显示下拉菜单
- [ ] 下拉菜单定位正确（右对齐）
- [ ] 菜单外观美观（圆角、阴影）

### 功能正确性
- [ ] 列表显示所有列
- [ ] 勾选状态正确反映当前可见性
- [ ] 勾选/取消勾选立即生效
- [ ] 至少保留一列可见
- [ ] 最后一列的复选框被禁用

### 集成测试
- [ ] 搜索功能不受影响
- [ ] 排序功能不受影响
- [ ] 导出 CSV 只导出可见列
- [ ] 虚拟滚动正常工作

### 配置支持
- [ ] `columnSelector: true` 启用功能
- [ ] `visible: false` 默认隐藏列
- [ ] 不设置 `columnSelector` 时按钮不显示

---

## 已知限制

1. 列可见性设置不持久化（刷新页面恢复默认）
   - 未来可以添加 localStorage 保存

2. 不支持列分组
   - 未来可以添加分组功能

3. 不支持全选/取消全选
   - 当列很多时可能需要

---

## 故障排除

如果列选择器不显示：
1. 检查配置中是否设置了 `columnSelector: true`
2. 检查浏览器控制台是否有错误
3. 确认已执行报告

如果列显示/隐藏不生效：
1. 检查是否尝试隐藏最后一列（会被阻止）
2. 检查浏览器控制台错误
3. 尝试刷新页面
