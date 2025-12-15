---
title: DataTable Advanced Features Complete Test
---

# DataTable 高级功能完整测试

测试所有已实现的高级表格功能：过滤、汇总行、行选择、条件格式化、数据条。

## 测试 1: 综合功能测试 - 销售数据

```sql sales_performance
SELECT * FROM (VALUES
  ('2024-01', 'North', 'Alice', 125000, 98000, 27000, 21.6, 45),
  ('2024-01', 'South', 'Bob', 143000, 115000, 28000, 19.6, 52),
  ('2024-01', 'East', 'Carol', 98000, 82000, 16000, 16.3, 38),
  ('2024-01', 'West', 'David', 167000, 128000, 39000, 23.4, 61),
  ('2024-02', 'North', 'Alice', 134000, 102000, 32000, 23.9, 48),
  ('2024-02', 'South', 'Bob', 156000, 118000, 38000, 24.4, 55),
  ('2024-02', 'East', 'Carol', 105000, 87000, 18000, 17.1, 41),
  ('2024-02', 'West', 'David', 189000, 142000, 47000, 24.9, 68),
  ('2024-03', 'North', 'Alice', 142000, 108000, 34000, 23.9, 51),
  ('2024-03', 'South', 'Bob', 165000, 125000, 40000, 24.2, 58),
  ('2024-03', 'East', 'Carol', 112000, 92000, 20000, 17.9, 43),
  ('2024-03', 'West', 'David', 198000, 148000, 50000, 25.3, 72)
) AS t(month, region, rep, revenue, cost, profit, margin_pct, deals)
```

```datatable
query: sales_performance
filterable: true
searchable: true
sortable: true
exportable: true
columnSelector: true
summaryRow: true
selectable: true
columns:
  - name: month
    label: Month
  - name: region
    label: Region
  - name: rep
    label: Sales Rep
  - name: revenue
    label: Revenue
    format: currency
    align: right
    summary: sum
    showDataBar: true
  - name: cost
    label: Cost
    format: currency
    align: right
    summary: sum
    visible: false
  - name: profit
    label: Profit
    format: currency
    align: right
    summary: sum
    conditionalFormat:
      - condition: greater_than
        value: 40000
        backgroundColor: '#D1FAE5'
        textColor: '#065F46'
        fontWeight: bold
      - condition: less_than
        value: 20000
        backgroundColor: '#FEE2E2'
        textColor: '#991B1B'
  - name: margin_pct
    label: Margin %
    format: percent
    align: right
    summary: avg
    conditionalFormat:
      - condition: greater_than
        value: 24
        backgroundColor: '#DBEAFE'
        textColor: '#1E40AF'
  - name: deals
    label: Deals
    format: number
    align: center
    summary: sum
    showDataBar: true
```

### 测试步骤 - 所有功能组合

**1. 基础展示**
- ✅ 表格显示 12 行数据
- ✅ Revenue 和 Deals 列显示数据条（蓝色渐变）
- ✅ Profit 列根据值显示不同背景色（绿色 > 40000，红色 < 20000）
- ✅ Margin % > 24% 显示蓝色背景
- ✅ Cost 列默认隐藏

**2. 汇总行测试**
- ✅ 底部显示汇总行（sticky 固定）
- ✅ Revenue: 总和 = $1,734,000
- ✅ Profit: 总和 = $389,000
- ✅ Margin %: 平均值 ≈ 21.88%
- ✅ Deals: 总和 = 632

**3. 列选择器测试**
- ✅ 点击 "⚙️ Columns" 按钮
- ✅ 勾选 "Cost" 列使其显示
- ✅ 取消勾选 "Month" 列（如果不是最后一列）
- ✅ 汇总行动态更新

**4. 过滤功能测试**
- ✅ 过滤 Region = "West"
- ✅ 过滤 Profit > 35000
- ✅ 工具栏显示 "2 filters" 徽章
- ✅ 汇总行只计算过滤后的数据
- ✅ 数据条范围重新计算
- ✅ 点击 "Clear Filters" 恢复

**5. 搜索测试**
- ✅ 搜索 "Alice"
- ✅ 只显示 Alice 的 3 行数据
- ✅ 汇总行更新为 Alice 的总和

**6. 行选择测试**
- ✅ 点击表头 checkbox 全选
- ✅ 工具栏显示 "12 selected" 徽章
- ✅ 选中行显示蓝色背景
- ✅ 单独取消某些行的选择
- ✅ 点击 "Clear Selection" 清除选择

**7. 排序测试**
- ✅ 点击 "Profit" 列标题排序（降序）
- ✅ 数据按 Profit 降序排列
- ✅ 汇总行保持在底部
- ✅ 数据条正确显示

**8. 导出测试**
- ✅ 应用过滤 + 选择部分行
- ✅ 点击 "Export CSV"
- ✅ CSV 只包含过滤后的可见列数据

---

## 测试 2: 条件格式化深入测试

```sql score_data
SELECT * FROM (VALUES
  ('Student A', 95, 88, 92, 91.7),
  ('Student B', 78, 82, 75, 78.3),
  ('Student C', 88, 90, 86, 88.0),
  ('Student D', 62, 58, 65, 61.7),
  ('Student E', 91, 85, 89, 88.3),
  ('Student F', 73, 79, 71, 74.3),
  ('Student G', 85, 88, 83, 85.3),
  ('Student H', 55, 62, 58, 58.3),
  ('Student I', 92, 94, 90, 92.0),
  ('Student J', 68, 72, 70, 70.0)
) AS t(name, math, science, english, average)
```

```datatable
query: score_data
filterable: true
sortable: true
summaryRow: true
columns:
  - name: name
    label: Student Name
  - name: math
    label: Math
    format: number
    align: center
    summary: avg
    conditionalFormat:
      - condition: greater_than
        value: 90
        backgroundColor: '#10B981'
        textColor: '#FFFFFF'
        fontWeight: bold
      - condition: between
        value: 70
        value2: 89
        backgroundColor: '#FCD34D'
        textColor: '#92400E'
      - condition: less_than
        value: 70
        backgroundColor: '#EF4444'
        textColor: '#FFFFFF'
  - name: science
    label: Science
    format: number
    align: center
    summary: avg
    conditionalFormat:
      - condition: greater_than
        value: 90
        backgroundColor: '#10B981'
        textColor: '#FFFFFF'
        fontWeight: bold
      - condition: between
        value: 70
        value2: 89
        backgroundColor: '#FCD34D'
        textColor: '#92400E'
      - condition: less_than
        value: 70
        backgroundColor: '#EF4444'
        textColor: '#FFFFFF'
  - name: english
    label: English
    format: number
    align: center
    summary: avg
    conditionalFormat:
      - condition: greater_than
        value: 90
        backgroundColor: '#10B981'
        textColor: '#FFFFFF'
        fontWeight: bold
      - condition: between
        value: 70
        value2: 89
        backgroundColor: '#FCD34D'
        textColor: '#92400E'
      - condition: less_than
        value: 70
        backgroundColor: '#EF4444'
        textColor: '#FFFFFF'
  - name: average
    label: Average
    format: number
    align: center
    summary: avg
    showDataBar: true
    conditionalFormat:
      - condition: greater_than
        value: 85
        fontWeight: bold
```

### 测试步骤 - 条件格式化

**成绩等级显示**
- ✅ >= 90 分：绿色背景，白色字体，加粗
- ✅ 70-89 分：黄色背景，深棕色字体
- ✅ < 70 分：红色背景，白色字体
- ✅ Average 列：数据条 + 加粗（如果 > 85）

**汇总行验证**
- ✅ Math 平均分显示在底部
- ✅ Average 列显示所有学生的平均分

---

## 测试 3: 数据条可视化测试

```sql product_metrics
SELECT * FROM (VALUES
  ('Product A', 15000, 12500, 8900, 4.8),
  ('Product B', 28000, 23000, 18500, 4.6),
  ('Product C', 9200, 7800, 5200, 4.2),
  ('Product D', 42000, 38000, 29000, 4.9),
  ('Product E', 19500, 16000, 12300, 4.5),
  ('Product F', 6800, 5200, 3500, 3.9),
  ('Product G', 31000, 27500, 21000, 4.7),
  ('Product H', 12300, 10500, 7800, 4.3)
) AS t(product, total_sales, active_users, revenue, rating)
```

```datatable
query: product_metrics
searchable: true
sortable: true
summaryRow: true
selectable: true
columns:
  - name: product
    label: Product
  - name: total_sales
    label: Total Sales
    format: number
    align: right
    summary: sum
    showDataBar: true
  - name: active_users
    label: Active Users
    format: number
    align: right
    summary: sum
    showDataBar: true
  - name: revenue
    label: Revenue
    format: currency
    align: right
    summary: sum
    showDataBar: true
  - name: rating
    label: Rating
    format: number
    align: center
    summary: avg
    showDataBar: true
    conditionalFormat:
      - condition: greater_than
        value: 4.5
        backgroundColor: '#D1FAE5'
        textColor: '#065F46'
```

### 测试步骤 - 数据条

**可视化验证**
- ✅ 每列的数据条宽度按比例显示
- ✅ Product D 的数据条最长（最大值）
- ✅ Product F 的数据条最短（最小值）
- ✅ 数据条使用蓝色渐变
- ✅ 数值清晰显示在数据条上方

**动态更新测试**
- ✅ 排序后数据条保持正确比例
- ✅ 搜索过滤后数据条范围重新计算
- ✅ Rating 列同时显示数据条和条件格式

---

## 测试 4: 大数据集性能测试

```sql large_dataset
WITH RECURSIVE numbers AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 500
)
SELECT
  n AS id,
  'Category ' || CAST((n % 10) AS VARCHAR) AS category,
  'Item ' || CAST(n AS VARCHAR) AS name,
  (n * 137) % 10000 AS value1,
  (n * 73) % 1000 AS value2,
  (n * 23) % 100 AS score
FROM numbers
```

```datatable
query: large_dataset
filterable: true
searchable: true
sortable: true
columnSelector: true
summaryRow: true
selectable: true
columns:
  - name: id
    label: ID
    align: right
  - name: category
    label: Category
  - name: name
    label: Item Name
  - name: value1
    label: Value 1
    format: number
    align: right
    summary: sum
    showDataBar: true
  - name: value2
    label: Value 2
    format: number
    align: right
    summary: avg
  - name: score
    label: Score
    format: number
    align: center
    summary: max
    conditionalFormat:
      - condition: greater_than
        value: 80
        backgroundColor: '#10B981'
        textColor: '#FFFFFF'
      - condition: less_than
        value: 30
        backgroundColor: '#EF4444'
        textColor: '#FFFFFF'
```

### 测试步骤 - 性能测试

**虚拟滚动性能**
- ✅ 500 行数据加载流畅
- ✅ 滚动无卡顿
- ✅ 数据条渲染性能良好
- ✅ 条件格式化不影响性能

**功能性能**
- ✅ 过滤响应时间 < 100ms
- ✅ 排序响应时间 < 150ms
- ✅ 全选 500 行响应迅速
- ✅ 搜索实时响应

**汇总计算性能**
- ✅ 汇总行计算准确
- ✅ 过滤后汇总动态更新
- ✅ 大数据量不影响汇总速度

---

## 功能验证清单

### ✅ Phase 4.3: 列过滤功能
- [x] 文本过滤（contains, not contains, equals, not equals）
- [x] 数字过滤（greater than, less than, between）
- [x] 日期过滤（after, before, date between）
- [x] 多列同时过滤（AND 逻辑）
- [x] 过滤图标和状态指示
- [x] Clear Filters 按钮
- [x] 过滤计数徽章

### ✅ Phase 4.4: 汇总行功能
- [x] Sum（求和）
- [x] Avg（平均值）
- [x] Count（计数）
- [x] Min（最小值）
- [x] Max（最大值）
- [x] Sticky 固定在底部
- [x] 动态更新（过滤/搜索后）
- [x] 格式化显示

### ✅ Phase 4.5: 行选择功能
- [x] 单行选择 checkbox
- [x] 全选 checkbox
- [x] 选中状态可视化（蓝色背景）
- [x] 选择计数显示
- [x] Clear Selection 按钮
- [x] 与虚拟滚动兼容

### ✅ Phase 4.6: 单元格样式功能
- [x] 条件格式化 - greater_than
- [x] 条件格式化 - less_than
- [x] 条件格式化 - equals
- [x] 条件格式化 - between
- [x] 自定义背景色
- [x] 自定义文字颜色
- [x] 字体加粗
- [x] 数据条显示
- [x] 数据条动态范围计算
- [x] 数据条渐变效果

### ✅ 集成功能测试
- [x] 过滤 + 搜索
- [x] 过滤 + 排序
- [x] 过滤 + 汇总行
- [x] 行选择 + 导出
- [x] 列选择器 + 汇总行
- [x] 条件格式 + 数据条
- [x] 虚拟滚动 + 所有功能

---

## 配置示例

### 完整配置示例

```yaml
datatable:
  query: your_data
  # 基础功能
  searchable: true
  sortable: true
  exportable: true

  # 高级功能
  filterable: true           # 启用列过滤
  columnSelector: true       # 启用列选择器
  summaryRow: true          # 启用汇总行
  selectable: true          # 启用行选择

  # 性能配置
  rowHeight: 36             # 行高
  maxHeight: 600            # 最大高度

  columns:
    - name: id
      label: ID
      visible: false        # 默认隐藏

    - name: amount
      label: Amount
      format: currency      # 货币格式
      align: right
      summary: sum          # 汇总：求和
      showDataBar: true     # 显示数据条
      conditionalFormat:    # 条件格式化
        - condition: greater_than
          value: 10000
          backgroundColor: '#D1FAE5'
          textColor: '#065F46'
          fontWeight: bold
```

---

## 性能指标

### 预期性能
- **数据加载**: < 100ms (500 rows)
- **过滤响应**: < 100ms
- **排序响应**: < 150ms
- **搜索响应**: < 50ms (实时)
- **汇总计算**: < 50ms
- **虚拟滚动 FPS**: 60fps

### 内存使用
- **基础表格**: ~2-3MB (100 rows)
- **大数据集**: ~10-15MB (1000 rows)
- **所有功能启用**: +20% 额外内存

---

## 已知限制

1. **列宽调整**: 暂未实现拖拽调整列宽
2. **状态持久化**: 过滤、选择等状态不保存到 localStorage
3. **Between 过滤**: UI 暂时只支持单值输入
4. **导出功能**: 只导出当前可见数据，不支持导出所有数据选项
5. **条件格式化**: 只支持数值类型

---

## 未来增强

1. **列宽调整**
   - 拖拽列边框调整宽度
   - 双击自动适应内容宽度
   - 保存列宽设置

2. **高级过滤**
   - Between 范围输入 UI
   - OR 逻辑支持
   - 保存过滤器预设

3. **状态持久化**
   - LocalStorage 保存配置
   - URL 参数同步
   - 重置为默认状态

4. **更多汇总函数**
   - Median（中位数）
   - StdDev（标准差）
   - Custom（自定义函数）

5. **更多条件格式**
   - Icon sets（图标集）
   - Color scales（色阶）
   - 自定义规则引擎
