# Quick Wins Demo - 新组件测试

测试 KPI Card Grid、Progress Bar、Accordion、Tooltip 组件。

---

## KPI Card Grid - 业务指标看板

```kpigrid
columns: 4
gap: 1rem
cards:
  - label: 总收入
    value: ¥2,580,000
    icon: 💰
    color: green
    trend: up
    trendValue: +12.5%
  - label: 活跃用户
    value: 45,892
    icon: 👥
    color: blue
    trend: up
    trendValue: +8.3%
  - label: 转化率
    value: 3.2%
    icon: 📊
    color: amber
    trend: down
    trendValue: -0.5%
  - label: 客单价
    value: ¥156
    icon: 🛒
    color: purple
    trend: neutral
    trendValue: +0.1%
```

---

## Progress Bar - 目标进度

### 销售目标完成情况

```progress
value: 75
max: 100
label: Q4 销售目标
showValue: true
color: blue
size: lg
animated: true
```

### 项目里程碑

```progress
value: 45
max: 100
label: 产品开发进度
showValue: true
color: amber
size: md
```

```progress
value: 92
max: 100
label: 测试覆盖率
showValue: true
color: green
size: md
```

```progress
value: 30
max: 100
label: 文档完成度
showValue: true
color: red
size: sm
```

---

## Accordion - 常见问题

```accordion
title: 产品 FAQ
multiple: false
defaultOpen: [0]
items:
  - title: 如何开始使用 Miao Vision？
    content: 只需上传您的数据文件（CSV、Parquet、JSON），然后使用 SQL 查询进行分析。所有处理都在浏览器本地完成，无需服务器。
  - title: 支持哪些数据格式？
    content: 目前支持 CSV、Parquet、JSON 格式的数据文件。DuckDB-WASM 引擎提供高性能的本地数据处理能力。
  - title: 数据安全吗？
    content: 完全安全！所有数据处理都在您的浏览器中本地完成，数据不会上传到任何服务器。这是 Local-First 架构的核心优势。
  - title: 可以导出分析结果吗？
    content: 是的，您可以将查询结果导出为 CSV 或 Excel 格式，也可以导出整个报告为 PDF。
```

---

## Accordion - 可多选展开

```accordion
title: 技术栈详解
multiple: true
defaultOpen: [0, 1]
items:
  - title: DuckDB-WASM
    content: DuckDB 是一个高性能的分析型数据库，WASM 版本可在浏览器中运行，支持完整的 SQL 语法和高效的列式存储。
  - title: Mosaic vgplot
    content: Mosaic 是一个声明式可视化框架，vgplot 提供类似 ggplot2 的语法，与 DuckDB 深度集成实现交互式数据探索。
  - title: Svelte 5
    content: 使用 Svelte 5 的 Runes 模式构建响应式 UI，提供出色的性能和开发体验。
```

---

## Tooltip - 信息提示

这是一个 ```tooltip
text: Miao Vision 是本地优先的数据分析框架
trigger: 产品介绍
position: top
``` 的示例。

数据处理使用 ```tooltip
text: DuckDB 是一个高性能的 OLAP 数据库，WASM 版本可完全在浏览器中运行
trigger: DuckDB-WASM
icon: 🦆
position: right
``` 引擎。

可视化基于 ```tooltip
text: Mosaic 是 UW Interactive Data Lab 开发的声明式可视化框架
trigger: Mosaic
position: bottom
delay: 100
``` 框架。

---

## 组合使用示例

### 部门绩效概览

```kpigrid
columns: 3
cards:
  - label: 销售部
    value: 98%
    icon: 📈
    color: green
    trend: up
    trendValue: 达标
  - label: 技术部
    value: 85%
    icon: 💻
    color: blue
    trend: up
    trendValue: 进行中
  - label: 运营部
    value: 72%
    icon: 🎯
    color: amber
    trend: neutral
    trendValue: 需关注
```

```accordion
title: 各部门详细进度
multiple: true
items:
  - title: 销售部 - Q4 目标
    content: 已完成年度销售目标的 98%，预计提前完成全年任务。重点客户签约顺利，新市场拓展超预期。
  - title: 技术部 - 产品迭代
    content: V2.0 版本开发进度 85%，核心功能已完成，正在进行性能优化和测试。预计下月初发布。
  - title: 运营部 - 用户增长
    content: 用户增长目标完成 72%，需要加强渠道推广和用户留存策略。计划启动新一轮营销活动。
```

---

## Sparkline / Mini Chart - 迷你图

### 基础折线图

```sparkline
values: 10, 15, 12, 18, 14, 20, 22, 19, 25
type: line
showMinMax: true
showLast: true
width: 150
height: 40
color: #3B82F6
```

### 带参考线的面积图

```sparkline
values: 45, 52, 48, 60, 55, 58, 62, 59, 65
type: area
referenceLine: avg
showLast: true
width: 150
height: 40
color: #10B981
```

### Win/Loss 正负图

```sparkline
values: 5, -3, 8, -2, 6, -1, 4, -4, 7, 3
type: winloss
width: 150
height: 40
```

### 柱状迷你图

```sparkline
values: 20, 35, 28, 42, 38, 45, 50
type: bar
showMinMax: true
width: 120
height: 36
color: #8B5CF6
```

### Bullet Chart 子弹图

```sparkline
values: 75
type: bullet
targetValue: 90
width: 180
height: 32
color: #3B82F6
```

### 带范围区间的趋势图

```sparkline
values: 42, 45, 48, 52, 49, 55, 58, 54, 60
type: line
bandLow: 40
bandHigh: 55
showDots: true
width: 150
height: 40
color: #F59E0B
```

---

## Drill-down 钻取功能演示

### 示例数据

```sql create_sales_data
CREATE OR REPLACE TABLE sales_by_region AS
SELECT * FROM (VALUES
  ('华东', '上海', 1250000, 156),
  ('华东', '杭州', 890000, 128),
  ('华东', '南京', 720000, 112),
  ('华北', '北京', 1580000, 189),
  ('华北', '天津', 650000, 98),
  ('华北', '石家庄', 420000, 76),
  ('华南', '广州', 1120000, 145),
  ('华南', '深圳', 1380000, 167),
  ('华南', '东莞', 580000, 89),
  ('西南', '成都', 780000, 102),
  ('西南', '重庆', 690000, 94),
  ('西南', '昆明', 340000, 58)
) AS t(region, city, revenue, orders)
```

```sql sales_by_region
SELECT * FROM sales_by_region
```

### 点击表格行选择区域

点击下方表格中的任意一行，将自动设置 `selected_region` 和 `selected_city` 输入变量：

```datatable
query: sales_by_region
searchable: true
sortable: true
drilldown:
  mappings:
    - region → selected_region
    - city → selected_city
  highlight: true
  tooltip: 点击选择区域查看详情
columns:
  - name: region
    label: 区域
  - name: city
    label: 城市
  - name: revenue
    label: 销售额
    format: currency
  - name: orders
    label: 订单数
    format: number
```

### 当前选中

> 💡 点击上方表格任意一行，下方数据将自动过滤

当前选择的区域: **${inputs.selected_region}**

当前选择的城市: **${inputs.selected_city}**

### 基于选择的过滤数据

```sql filtered_data
SELECT city, revenue, orders,
       ROUND(revenue * 1.0 / orders, 2) as avg_order_value
FROM sales_by_region
WHERE region = ${inputs.selected_region}
  OR ${inputs.selected_region} IS NULL
```

```datatable
query: filtered_data
sortable: true
columns:
  - name: city
    label: 城市
  - name: revenue
    label: 销售额
    format: currency
  - name: orders
    label: 订单数
  - name: avg_order_value
    label: 客单价
    format: currency
```

### 选中区域的 KPI

```sql region_summary
SELECT
  SUM(revenue) as total_revenue,
  SUM(orders) as total_orders,
  ROUND(AVG(revenue), 0) as avg_revenue,
  COUNT(*) as city_count
FROM sales_by_region
WHERE region = ${inputs.selected_region}
  OR ${inputs.selected_region} IS NULL
```

---

## Checkbox 布尔输入组件

### 基础复选框

```checkbox
name: show_inactive
label: 显示已停用的项目
defaultValue: false
```

```checkbox
name: include_tax
label: 包含税费
defaultValue: true
description: 勾选此项将在计算中包含税费
```

### 当前选中状态

- 显示已停用: **${inputs.show_inactive}**
- 包含税费: **${inputs.include_tax}**

### 根据 Checkbox 过滤数据

```sql checkbox_filtered_data
SELECT city, revenue, orders,
       CASE WHEN ${inputs.include_tax} = true
            THEN ROUND(revenue * 1.13, 0)
            ELSE revenue END as display_revenue
FROM sales_by_region
WHERE (${inputs.show_inactive} = true OR revenue > 500000)
```

```datatable
query: checkbox_filtered_data
sortable: true
columns:
  - name: city
    label: 城市
  - name: revenue
    label: 原始金额
    format: currency
  - name: display_revenue
    label: 显示金额
    format: currency
  - name: orders
    label: 订单数
```

---

## Modal 弹窗组件

### 基础弹窗

```modal
buttonText: 查看产品详情
title: 产品信息
size: md
---
**产品名称**: Miao Vision

这是一个本地优先的数据分析框架，具有以下特点：

- 完全在浏览器中运行
- 使用 DuckDB-WASM 进行 SQL 分析
- 支持 Mosaic vgplot 可视化
- Markdown 驱动的报告系统
```

### 大尺寸弹窗

```modal
buttonText: 查看详细文档
title: 技术架构说明
size: lg
---
**核心技术栈**

*前端框架*: Svelte 5 with Runes
*数据引擎*: DuckDB-WASM
*可视化*: Mosaic vgplot
*编辑器*: Monaco Editor

**数据流**

1. 文件通过 FileUploader 上传
2. DuckDB-WASM 在 Web Worker 中处理数据
3. SQL 查询执行后返回 Apache Arrow 格式
4. 可视化通过 Mosaic Coordinator 渲染到 DOM
```

### 小尺寸确认弹窗

```modal
buttonText: 删除确认
title: 确认操作
size: sm
---
确定要执行此操作吗？

此操作**不可撤销**。
```

---

## Details 可展开详情

### 默认收起

```details
title: 技术实现细节
icon: 🔧
defaultOpen: false
---
**DuckDB-WASM 集成**

DuckDB-WASM 在 Web Worker 中运行，提供完整的 SQL 支持：

- 支持窗口函数、CTE、子查询
- 列式存储提供高效的分析查询
- 支持 Parquet、CSV、JSON 格式
```

### 默认展开

```details
title: 快速开始指南
icon: 🚀
defaultOpen: true
---
1. 上传数据文件（CSV、Parquet、JSON）
2. 编写 SQL 查询分析数据
3. 使用可视化组件展示结果
4. 导出报告分享给他人
```

### 无边框样式

```details
title: 注意事项
bordered: false
---
所有数据处理都在浏览器本地完成，数据不会上传到服务器。
```

---

## Note 提示信息组件

### 各种类型

```note
type: note
---
这是一条普通的提示信息，用于展示一般性说明。
```

```note
type: tip
---
这是一条有用的提示，可以帮助用户更好地使用功能。
```

```note
type: important
---
这是一条重要信息，请务必注意！
```

```note
type: warning
---
警告：此操作可能会影响现有数据，请谨慎操作。
```

```note
type: caution
---
危险操作：此操作不可撤销，将永久删除数据。
```

### 自定义标题

```note
type: tip
title: 性能优化建议
---
使用 Parquet 格式的数据文件可以显著提升查询性能，特别是对于大型数据集。
```

### 可折叠的提示

```note
type: important
title: 版本更新说明
collapsible: true
defaultOpen: false
---
**v2.0 新功能：**

- 新增 Modal 弹窗组件
- 新增 Details 可展开组件
- 新增 Note 提示组件
- 优化 Checkbox 组件性能
```

---

## BoxPlot 箱线图

### 示例数据

```sql create_boxplot_data
CREATE OR REPLACE TABLE department_salaries AS
SELECT * FROM (VALUES
  ('Engineering', 85000),
  ('Engineering', 92000),
  ('Engineering', 78000),
  ('Engineering', 105000),
  ('Engineering', 88000),
  ('Engineering', 95000),
  ('Engineering', 72000),
  ('Engineering', 110000),
  ('Sales', 55000),
  ('Sales', 62000),
  ('Sales', 48000),
  ('Sales', 75000),
  ('Sales', 58000),
  ('Sales', 52000),
  ('Sales', 68000),
  ('Marketing', 65000),
  ('Marketing', 72000),
  ('Marketing', 58000),
  ('Marketing', 80000),
  ('Marketing', 68000),
  ('Marketing', 62000),
  ('HR', 52000),
  ('HR', 58000),
  ('HR', 48000),
  ('HR', 62000),
  ('HR', 55000)
) AS t(department, salary)
```

```sql boxplot_data
SELECT * FROM department_salaries
```

### 按部门的薪资分布

```boxplot
data: boxplot_data
x: department
y: salary
title: Department Salary Distribution
xLabel: Department
yLabel: Salary ($)
```

---

## Heatmap 热力图

### 示例数据

```sql create_heatmap_data
CREATE OR REPLACE TABLE activity_heatmap AS
SELECT * FROM (VALUES
  ('Mon', '9AM', 12),
  ('Mon', '10AM', 25),
  ('Mon', '11AM', 38),
  ('Mon', '12PM', 45),
  ('Mon', '1PM', 32),
  ('Mon', '2PM', 28),
  ('Mon', '3PM', 35),
  ('Mon', '4PM', 22),
  ('Mon', '5PM', 15),
  ('Tue', '9AM', 18),
  ('Tue', '10AM', 32),
  ('Tue', '11AM', 42),
  ('Tue', '12PM', 50),
  ('Tue', '1PM', 38),
  ('Tue', '2PM', 35),
  ('Tue', '3PM', 40),
  ('Tue', '4PM', 28),
  ('Tue', '5PM', 20),
  ('Wed', '9AM', 22),
  ('Wed', '10AM', 35),
  ('Wed', '11AM', 48),
  ('Wed', '12PM', 55),
  ('Wed', '1PM', 42),
  ('Wed', '2PM', 38),
  ('Wed', '3PM', 45),
  ('Wed', '4PM', 32),
  ('Wed', '5PM', 25),
  ('Thu', '9AM', 15),
  ('Thu', '10AM', 28),
  ('Thu', '11AM', 35),
  ('Thu', '12PM', 42),
  ('Thu', '1PM', 35),
  ('Thu', '2PM', 30),
  ('Thu', '3PM', 38),
  ('Thu', '4PM', 25),
  ('Thu', '5PM', 18),
  ('Fri', '9AM', 10),
  ('Fri', '10AM', 22),
  ('Fri', '11AM', 30),
  ('Fri', '12PM', 38),
  ('Fri', '1PM', 28),
  ('Fri', '2PM', 25),
  ('Fri', '3PM', 30),
  ('Fri', '4PM', 20),
  ('Fri', '5PM', 12)
) AS t(day, hour, activity)
```

```sql heatmap_data
SELECT * FROM activity_heatmap
```

### 用户活动热力图

```heatmap
data: heatmap_data
x: hour
y: day
color: activity
title: Weekly Activity Heatmap
xLabel: Hour of Day
yLabel: Day of Week
```

---

## Funnel Chart 漏斗图

### 示例数据

```sql create_funnel_data
CREATE OR REPLACE TABLE conversion_funnel AS
SELECT * FROM (VALUES
  ('Website Visits', 10000),
  ('Product Views', 6500),
  ('Add to Cart', 3200),
  ('Checkout', 1800),
  ('Purchase', 1200)
) AS t(stage, count)
```

```sql funnel_data
SELECT * FROM conversion_funnel
```

### 电商转化漏斗

```funnel
data: funnel_data
x: stage
y: count
title: E-commerce Conversion Funnel
```

---

## DimensionGrid 维度网格选择

### 基础网格选择

```dimensiongrid
name: selected_category
title: 选择产品类别
columns: 4
items:
  - label: 电子产品
    value: electronics
    icon: 📱
  - label: 服装鞋帽
    value: clothing
    icon: 👔
  - label: 家居用品
    value: home
    icon: 🏠
  - label: 食品饮料
    value: food
    icon: 🍎
  - label: 图书文具
    value: books
    icon: 📚
  - label: 运动户外
    value: sports
    icon: ⚽
  - label: 美妆护肤
    value: beauty
    icon: 💄
  - label: 母婴用品
    value: baby
    icon: 🍼
```

当前选择: **${inputs.selected_category}**

### 多选网格（带计数）

```dimensiongrid
name: selected_regions
title: 选择区域（可多选）
columns: 3
multiple: true
showCounts: true
items:
  - label: 华东
    value: east
    count: 1250
  - label: 华南
    value: south
    count: 890
  - label: 华北
    value: north
    count: 1120
  - label: 西南
    value: southwest
    count: 650
  - label: 华中
    value: central
    count: 780
  - label: 西北
    value: northwest
    count: 420
```

当前选择: **${inputs.selected_regions}**

---

测试完成！所有组件均已实现，包括 Modal、Details、Note、BoxPlot、Heatmap、FunnelChart 和 DimensionGrid。
