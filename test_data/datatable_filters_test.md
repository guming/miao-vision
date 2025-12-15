---
title: DataTable Column Filters Test
---

# DataTable 列过滤功能测试

测试新增的列级过滤功能，支持文本、数字、日期三种类型的过滤。

## 测试 1: 文本列过滤

```sql products_data
SELECT * FROM (VALUES
  (1, 'Apple iPhone 15', 'Electronics', 999.00, 4.8, DATE '2024-01-15'),
  (2, 'Samsung Galaxy S24', 'Electronics', 899.00, 4.7, DATE '2024-01-20'),
  (3, 'Sony Headphones', 'Audio', 299.00, 4.5, DATE '2024-02-01'),
  (4, 'Apple MacBook Pro', 'Computers', 2499.00, 4.9, DATE '2024-02-10'),
  (5, 'Dell XPS 13', 'Computers', 1299.00, 4.6, DATE '2024-02-15'),
  (6, 'Apple Watch Ultra', 'Wearables', 799.00, 4.8, DATE '2024-03-01'),
  (7, 'Samsung TV 65"', 'Electronics', 1499.00, 4.7, DATE '2024-03-05'),
  (8, 'Bose Speakers', 'Audio', 399.00, 4.6, DATE '2024-03-10')
) AS t(id, product, category, price, rating, release_date)
```

```datatable
query: products_data
filterable: true
searchable: true
sortable: true
exportable: true
columns:
  - name: id
    label: ID
    align: center
  - name: product
    label: Product Name
  - name: category
    label: Category
  - name: price
    label: Price
    format: currency
    align: right
  - name: rating
    label: Rating
    format: number
    align: center
  - name: release_date
    label: Release Date
    format: date
```

**测试步骤 - 文本过滤**:
1. 点击 "Execute Report" 按钮
2. 点击 "Product Name" 列的过滤图标 (🔽)
3. 选择 "Contains"，输入 "Apple"
4. 点击 "Apply"
5. 观察只显示包含 "Apple" 的产品

**预期结果**:
- ✅ 过滤图标显示在列标题旁边
- ✅ 点击显示过滤下拉菜单
- ✅ 文本过滤提供 4 个选项：Contains, Does not contain, Equals, Not equals
- ✅ 输入 "Apple" 后只显示 3 行（iPhone, MacBook, Watch）
- ✅ 工具栏显示 "1 filter" 徽章
- ✅ 列标题背景变为黄色（表示已过滤）
- ✅ 统计显示 "3 rows (filtered from 8)"

**测试步骤 - 类别过滤**:
1. 保持上面的过滤
2. 点击 "Category" 列的过滤图标
3. 选择 "Equals"，输入 "Electronics"
4. 点击 "Apply"
5. 观察同时满足两个过滤条件的行

**预期结果**:
- ✅ 只显示 1 行（Apple iPhone 15）
- ✅ 工具栏显示 "2 filters" 徽章
- ✅ 两个列标题都显示黄色背景
- ✅ 统计显示 "1 row (filtered from 8)"

**测试步骤 - 清除过滤**:
1. 点击 "Clear Filters" 按钮
2. 观察所有数据恢复显示

**预期结果**:
- ✅ 恢复显示 8 行数据
- ✅ "Clear Filters" 按钮消失
- ✅ 过滤徽章消失
- ✅ 列标题背景恢复正常

---

## 测试 2: 数字列过滤

```sql sales_metrics
SELECT * FROM (VALUES
  ('2024-01', 'North', 125000, 98000, 27000, 21.6),
  ('2024-01', 'South', 143000, 115000, 28000, 19.6),
  ('2024-01', 'East', 98000, 82000, 16000, 16.3),
  ('2024-01', 'West', 167000, 128000, 39000, 23.4),
  ('2024-02', 'North', 134000, 102000, 32000, 23.9),
  ('2024-02', 'South', 156000, 118000, 38000, 24.4),
  ('2024-02', 'East', 105000, 87000, 18000, 17.1),
  ('2024-02', 'West', 189000, 142000, 47000, 24.9)
) AS t(month, region, revenue, cost, profit, margin_pct)
```

```datatable
query: sales_metrics
filterable: true
sortable: true
columns:
  - name: month
    label: Month
  - name: region
    label: Region
  - name: revenue
    label: Revenue
    format: currency
    align: right
  - name: cost
    label: Cost
    format: currency
    align: right
  - name: profit
    label: Profit
    format: currency
    align: right
  - name: margin_pct
    label: Margin %
    format: percent
    align: right
```

**测试步骤 - Greater Than**:
1. 执行报告
2. 点击 "Revenue" 列的过滤图标
3. 选择 "Greater than"，输入 "150000"
4. 点击 "Apply"

**预期结果**:
- ✅ 只显示 Revenue > 150,000 的行（3 行）
- ✅ South 2024-02, West 2024-01, West 2024-02

**测试步骤 - Less Than**:
1. 清除过滤
2. 点击 "Margin %" 列的过滤图标
3. 选择 "Less than"，输入 "20"
4. 点击 "Apply"

**预期结果**:
- ✅ 只显示 Margin < 20% 的行（3 行）
- ✅ South 2024-01, East 2024-01, East 2024-02

**测试步骤 - Between (复合过滤)**:
1. 清除过滤
2. 过滤 Revenue > 130000
3. 过滤 Margin % > 23

**预期结果**:
- ✅ 同时满足两个条件的行（4 行）
- ✅ West 2024-01, North 2024-02, South 2024-02, West 2024-02

---

## 测试 3: 日期列过滤

```sql events_calendar
SELECT * FROM (VALUES
  ('Conference', 'Tech Summit 2024', DATE '2024-05-15', DATE '2024-05-17', 'San Francisco'),
  ('Webinar', 'AI in Production', DATE '2024-06-01', DATE '2024-06-01', 'Online'),
  ('Workshop', 'Cloud Architecture', DATE '2024-06-10', DATE '2024-06-12', 'Seattle'),
  ('Meetup', 'Local Dev Meetup', DATE '2024-06-20', DATE '2024-06-20', 'New York'),
  ('Conference', 'DevOps Days', DATE '2024-07-05', DATE '2024-07-07', 'Austin'),
  ('Webinar', 'Security Best Practices', DATE '2024-07-15', DATE '2024-07-15', 'Online'),
  ('Workshop', 'Kubernetes Essentials', DATE '2024-08-01', DATE '2024-08-03', 'Boston'),
  ('Conference', 'Data Engineering Summit', DATE '2024-08-20', DATE '2024-08-22', 'Chicago')
) AS t(type, title, start_date, end_date, location)
```

```datatable
query: events_calendar
filterable: true
searchable: true
sortable: true
columns:
  - name: type
    label: Event Type
  - name: title
    label: Title
  - name: start_date
    label: Start Date
    format: date
  - name: end_date
    label: End Date
    format: date
  - name: location
    label: Location
```

**测试步骤 - After Date**:
1. 执行报告
2. 点击 "Start Date" 列的过滤图标
3. 选择 "After"，选择日期 "2024-07-01"
4. 点击 "Apply"

**预期结果**:
- ✅ 只显示 7 月 1 日后开始的活动（3 个）
- ✅ DevOps Days, Security Webinar, Kubernetes Workshop, Data Summit

**测试步骤 - Before Date**:
1. 清除过滤
2. 点击 "Start Date" 列的过滤图标
3. 选择 "Before"，选择日期 "2024-06-15"
4. 点击 "Apply"

**预期结果**:
- ✅ 只显示 6 月 15 日前开始的活动（4 个）
- ✅ Tech Summit, AI Webinar, Cloud Workshop, Dev Meetup

**测试步骤 - 日期 + 文本复合过滤**:
1. 清除过滤
2. 过滤 Start Date after "2024-06-01"
3. 过滤 Location contains "Online"

**预期结果**:
- ✅ 只显示 1 行（Security Webinar）

---

## 测试 4: 过滤与其他功能集成

```sql comprehensive_data
SELECT * FROM (VALUES
  (1, 'Alpha', 100, 1.5, DATE '2024-01-15'),
  (2, 'Beta', 200, 2.3, DATE '2024-02-20'),
  (3, 'Gamma', 150, 1.8, DATE '2024-03-10'),
  (4, 'Delta', 300, 3.1, DATE '2024-04-05'),
  (5, 'Epsilon', 250, 2.7, DATE '2024-05-12'),
  (6, 'Zeta', 180, 2.1, DATE '2024-06-18'),
  (7, 'Eta', 220, 2.5, DATE '2024-07-22'),
  (8, 'Theta', 190, 2.2, DATE '2024-08-30')
) AS t(id, name, value, ratio, date)
```

```datatable
query: comprehensive_data
filterable: true
searchable: true
sortable: true
exportable: true
columnSelector: true
columns:
  - name: id
    label: ID
  - name: name
    label: Name
  - name: value
    label: Value
    format: number
    align: right
  - name: ratio
    label: Ratio
    format: number
    align: right
  - name: date
    label: Date
    format: date
```

**测试步骤 - 过滤 + 搜索**:
1. 执行报告
2. 应用过滤：Value > 150
3. 在搜索框输入 "ta"

**预期结果**:
- ✅ 显示满足两个条件的行（Delta, Eta, Theta）
- ✅ 统计正确显示过滤后的计数

**测试步骤 - 过滤 + 排序**:
1. 清除搜索
2. 保持过滤：Value > 150
3. 点击 "Ratio" 列标题排序（降序）

**预期结果**:
- ✅ 过滤后的数据按 Ratio 降序排列
- ✅ Delta (3.1) → Epsilon (2.7) → Eta (2.5) → Theta (2.2) → Zeta (2.1) → Beta (2.3)

**测试步骤 - 过滤 + 列选择器**:
1. 保持过滤
2. 打开列选择器
3. 隐藏 "ID" 和 "Date" 列

**预期结果**:
- ✅ 过滤后的数据只显示选中的列
- ✅ 过滤功能正常工作

**测试步骤 - 过滤 + 导出**:
1. 保持过滤和列设置
2. 点击 "Export CSV"

**预期结果**:
- ✅ CSV 只包含过滤后的数据
- ✅ CSV 只包含可见的列
- ✅ 文件名包含日期戳

---

## 功能验证清单

### UI 表现
- [ ] 过滤图标显示在每列标题旁边
- [ ] 点击图标显示过滤下拉菜单
- [ ] 下拉菜单定位正确（不超出屏幕）
- [ ] 菜单外观美观（圆角、阴影）
- [ ] 活跃的过滤图标显示橙色

### 文本过滤
- [ ] Contains 操作正确
- [ ] Does not contain 操作正确
- [ ] Equals 操作正确（大小写不敏感）
- [ ] Not equals 操作正确

### 数字过滤
- [ ] Greater than 操作正确
- [ ] Less than 操作正确
- [ ] Equals 操作正确
- [ ] Between 操作正确（如果实现）

### 日期过滤
- [ ] After 操作正确
- [ ] Before 操作正确
- [ ] On date 操作正确
- [ ] Between 操作正确（如果实现）

### 过滤状态
- [ ] 活跃过滤的列标题显示黄色背景
- [ ] 工具栏显示过滤计数徽章
- [ ] "Clear Filters" 按钮在有过滤时显示
- [ ] 清除过滤恢复所有数据

### 复合功能
- [ ] 多列过滤同时生效（AND 逻辑）
- [ ] 过滤 + 搜索协同工作
- [ ] 过滤 + 排序协同工作
- [ ] 过滤 + 列选择器协同工作
- [ ] 过滤 + 导出只导出过滤结果

### 性能
- [ ] 过滤操作响应快速（< 100ms）
- [ ] 大数据集（1000+ 行）过滤流畅
- [ ] 虚拟滚动在过滤后正常工作

---

## 已知限制

1. **过滤状态不持久化** - 刷新页面后过滤条件丢失
   - 未来可以添加 localStorage 保存

2. **不支持 Between 范围过滤** - 需要额外的输入框
   - 当前版本先支持单值比较

3. **不支持 OR 逻辑** - 只支持 AND（所有条件必须满足）
   - 未来可以添加高级过滤模式

4. **日期输入依赖浏览器** - 不同浏览器的日期选择器不同
   - 可以集成第三方日期选择器组件

---

## 故障排除

**如果过滤图标不显示**:
1. 检查配置中是否设置了 `filterable: true`
2. 检查浏览器控制台是否有错误
3. 确认已执行报告

**如果过滤不生效**:
1. 检查输入的值格式是否正确
2. 检查数据类型与过滤操作是否匹配
3. 打开浏览器控制台查看错误

**如果过滤后数据显示异常**:
1. 尝试清除所有过滤
2. 检查是否与搜索功能冲突
3. 刷新页面重新执行

---

## 性能测试

### 大数据集过滤测试

```sql large_dataset
WITH RECURSIVE numbers AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 1000
)
SELECT
  n AS id,
  'Item ' || CAST(n AS VARCHAR) AS name,
  (n * 37) % 1000 AS value,
  (n * 13) % 100 AS score,
  DATE '2024-01-01' + INTERVAL (n) DAY AS date
FROM numbers
```

```datatable
query: large_dataset
filterable: true
searchable: true
sortable: true
columns:
  - name: id
    label: ID
  - name: name
    label: Name
  - name: value
    label: Value
    format: number
    align: right
  - name: score
    label: Score
    format: number
    align: right
  - name: date
    label: Date
    format: date
```

**测试步骤**:
1. 执行报告（1000 行）
2. 应用过滤：Value > 500
3. 观察过滤响应时间
4. 滚动过滤后的结果

**预期结果**:
- ✅ 过滤操作在 100ms 内完成
- ✅ 虚拟滚动正常工作
- ✅ 无卡顿或延迟
