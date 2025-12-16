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
  - title: 如何开始使用 Miaoshou Vision？
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
text: Miaoshou Vision 是本地优先的数据分析框架
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

测试完成！所有 Quick Wins 组件均已实现。
