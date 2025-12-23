# Miao Vision - Development Roadmap & TODO List

> 基于Evidence.dev的数据可视化平台开发计划

## 📋 目录

- [Week 1: 核心架构重构](#week-1-核心架构重构-completed-)
- [Week 1.5: 额外完成项](#week-15-额外完成项-completed-)
- [Week 2: 新组件实现](#week-2-新组件实现-revised)
- [Week 3: 高级功能](#week-3-高级功能)
- [Evidence.dev 核心功能补充](#evidencedev-核心功能补充)
- [推荐的下一步工作](#推荐的下一步工作)

---

## Week 1: 核心架构重构 (COMPLETED ✅)

### 完成日期：2025-12-12

### 主要成果

#### Day 1-2: ComponentRegistry System
- ✅ **component-registry.ts** (197 lines) - 统一组件注册系统
  - 元数据驱动的组件架构
  - Parser + Renderer 分离模式
  - 类型安全的组件定义

- ✅ **metadata/charts.ts** (186 lines) - 图表组件元数据
  - Line, Area, Bar, Scatter, Histogram 定义
  - 自文档化的属性定义

- ✅ **metadata/inputs.ts** (85 lines) - 输入组件元数据
- ✅ **metadata/data-viz.ts** (57 lines) - 数据可视化组件元数据
- ✅ **init-components.ts** (173 lines) - 组件初始化桥接

#### Day 3: ReportExecutionService
- ✅ **report-execution.service.ts** (432 lines)
  - 从 App.svelte 提取 ~300 lines 执行逻辑
  - 集中管理报表执行和响应式更新
  - 清理表和重建图表配置逻辑

#### Day 4: BlockRenderer
- ✅ **block-renderer.ts** (266 lines)
  - 统一的块挂载逻辑
  - ReportRenderer: 1020→589 lines (-42%)
  - 支持 SQL、Chart、Input、DataViz 组件

#### Day 5: ChartService
- ✅ **chart.service.ts** (323 lines)
  - 图表配置构建服务
  - 模板变量插值
  - 配置验证和数据源解析
  - chart-builder.ts: 250→115 lines (-54%)

### 架构改进总结

**新增服务代码：** ~2,018 lines (高质量、可测试)
**简化现有代码：** ~916 lines removed
**代码质量提升：** 结构更清晰、更易维护、更好的分离关注点

---

## Week 1.5: 额外完成项 (COMPLETED ✅)

### 完成日期：2025-12-15

以下功能已实现但之前未标记：

#### References System ✅
- ✅ **dependency-graph.ts** (310 lines) - 查询引用系统
  - `extractBlockReferences()` - 提取 `${block_name}` 引用
  - `buildDependencyGraph()` - 构建依赖图
  - `detectCircularDependencies()` - 循环依赖检测
  - `topologicalSort()` - 拓扑排序 (Kahn's algorithm)
  - `resolveBlockReferences()` - 解析引用到实际表名
  - 支持语法: `FROM ${base_query}`, `JOIN ${other_query}`

#### Alert/Callout Component ✅
- ✅ **alert-block.ts** - Alert 组件注册
- ✅ **alert-parser.ts** - Alert 解析器
- ✅ **Alert.svelte** - Alert UI 组件
- ✅ 支持 4 种类型: info, warning, error, success

#### Value Component (Code Block) ✅
- ✅ **value/parser.ts** - Value 解析器
- ✅ **Value.svelte** - Value UI 组件
- ✅ 注册到 ComponentRegistry

#### Bug Fixes (2025-12-15) ✅
- ✅ Report 切换时编辑器内容不更新 - 使用 `{#key}` 强制重新挂载
- ✅ Report 内容交叉污染 - 添加 reportId 追踪
- ✅ localStorage 多 key 问题 - 添加迁移清理
- ✅ 执行前的错误日志 - 改为 warning 级别

---

## Week 2: 新组件实现 (REVISED)

### 当前状态：进行中 🚧

基于实际进度修订的计划：

### Day 1: Pie Chart ✅
**优先级：高**
**完成日期：2025-12-15**

#### 目标
补充常用图表类型

#### 任务
- [x] 创建 PieChartMetadata 定义
- [x] 支持基础饼图和环形图 (donut) - 通过 `innerRadius` 参数
- [x] 图例和标签配置 - `showLabels`, `showPercentages`
- [x] 注册到 ComponentRegistry
- [x] D3 实现（vgplot 不支持 arc marks）

#### 技术说明
由于 vgplot/Observable Plot 不支持 pie chart (没有 arc mark)，使用 D3.js 实现。
支持的配置选项：
- `innerRadius`: 内半径（0=饼图，>0=环形图）
- `outerRadius`: 外半径
- `padAngle`: 切片间隙
- `cornerRadius`: 圆角
- `showLabels`: 显示标签
- `showPercentages`: 显示百分比

#### 使用示例
```markdown
\`\`\`sql category_sales
SELECT category, SUM(amount) as total
FROM sales GROUP BY category
\`\`\`

\`\`\`pie
data: category_sales
x: category
y: total
title: Sales by Category
\`\`\`

-- 环形图示例
\`\`\`pie
data: category_sales
x: category
y: total
title: Sales Distribution
innerRadius: 60
\`\`\`
```

---

### Day 1-2: JSX-like Parser ⏳
**优先级：高**
**预计时间：1.5 天**

#### 目标
支持内联组件语法 `<Component prop={value} />`

#### 任务
- [ ] 设计 JSX-like 解析器 API
  ```typescript
  interface JSXComponent {
    name: string           // 'Value', 'Grid', etc.
    props: Record<string, any>
    children?: string
  }
  ```
- [ ] 实现 `<Component />` 自闭合标签解析
- [ ] 实现 `<Component>...</Component>` 嵌套内容解析
- [ ] 支持 `prop={expression}` 语法
- [ ] 与现有 Markdown 解析器集成
- [ ] 错误处理和提示

#### 影响范围
- 新增 `src/lib/markdown/jsx-parser.ts`
- 修改 `parser.ts` 集成 JSX 解析

---

### Day 3: Inline Value Component ⏳
**优先级：高**
**预计时间：1 天**

#### 目标
实现内联数据展示（基于 JSX Parser）

#### 任务
- [ ] 实现 `<Value />` 内联组件
  ```markdown
  Sales in Q4: <Value data={sales_query} column="total" />
  Growth rate: <Value data={metrics} column="growth" fmt="pct" />
  ```
- [ ] 支持格式化选项 (currency, percent, decimal)
- [ ] 实现条件样式（正负值颜色）
- [ ] 处理数据未就绪状态

---

### Day 4-5: Grid/Layout System ⏳
**优先级：中**
**预计时间：2 天**

#### 目标
实现响应式网格布局系统

#### 任务
- [ ] 设计 Grid 组件 API（基于 JSX Parser）
  ```markdown
  <Grid cols={2} gap="1rem">
    <div>Chart 1</div>
    <div>Chart 2</div>
  </Grid>
  ```
- [ ] 实现列宽控制 (1-12 列系统)
- [ ] 响应式断点支持
- [ ] 嵌套布局能力
- [ ] 间距和对齐选项

---

### Day 6: Tabs Component ⏳
**优先级：中**
**预计时间：1 天**

#### 目标
实现标签页切换组件

#### 任务
- [ ] 设计 Tabs 组件 API
  ```markdown
  <Tabs>
    <Tab label="Overview">
      Content for overview tab
    </Tab>
    <Tab label="Details">
      Content for details tab
    </Tab>
  </Tabs>
  ```
- [ ] 实现标签切换逻辑
- [ ] 内容懒加载（可选）
- [ ] 样式和动画

---

### Day 7: 测试和文档 ⏳
**优先级：中**
**预计时间：1 天**

#### 任务
- [ ] JSX Parser 单元测试
- [ ] 新组件集成测试
- [ ] 更新组件文档
- [ ] 创建使用示例

---

## Week 3: 高级功能

### Day 1-2: Loops System ⏳
**优先级：高 🔥**

#### 目标
实现循环语法，动态生成多个组件

#### 任务
- [ ] 设计 `{#each}` 循环语法
  ```markdown
  {#each categories as category}
  ## Sales for {category.name}

  ```chart
  type: bar
  data: sales_by_category
  filter: category = '{category.id}'
  ```
  {/each}
  ```
- [ ] 实现循环数据源绑定
- [ ] 作用域变量管理
- [ ] 嵌套循环支持
- [ ] 性能优化（虚拟滚动）
- [ ] 更新 Markdown 解析器

#### 预计工作量
2 天

#### 影响范围
- `parser.ts` - 识别循环语法
- 新增 `loop-processor.ts` - 循环展开逻辑
- `ReportRenderer.svelte` - 动态组件生成

---

### Day 3: DatePicker ⏳
**优先级：高**

#### 任务
- [ ] 单日期选择
- [ ] 日期范围选择
- [ ] 预设快捷选项 (今天、本周、本月等)
- [ ] 与 Input Store 集成

---

### Day 4: TextInput ⏳
**优先级：高**

#### 任务
- [ ] 文本输入框
- [ ] 搜索/过滤功能
- [ ] 防抖输入 (debounce)
- [ ] 与 Input Store 集成

---

### Day 5: Metric Grid ⏳
**优先级：中**

#### 任务
- [ ] 多指标网格布局
- [ ] 同比/环比显示
- [ ] 趋势箭头和颜色编码

---

### Day 6-7: Testing & 性能优化 ⏳
**优先级：中**

#### 任务
- [ ] 编写 ComponentRegistry 单元测试
- [ ] 编写 ChartService 单元测试
- [ ] 编写 ReportExecutionService 单元测试
- [ ] 集成测试覆盖
- [ ] 性能基准测试
- [ ] 大数据集优化

---

## Evidence.dev 核心功能补充

### 1. 数据可视化组件

#### 已完成 ✅
- ✅ Line Chart
- ✅ Bar Chart (含 stacked, normalized)
- ✅ Area Chart (含 fillOpacity)
- ✅ Scatter Plot
- ✅ Histogram (含 bins 配置)

#### 已完成 ✅ (Week 2)
- ✅ **Pie Chart** - D3 实现，支持 donut variant

#### 待实现 ⏳
- [ ] **Heatmap** (优先级：中)
- [ ] **Funnel Chart** (优先级：低)
- [ ] **Sankey Diagram** (优先级：低)

---

### 2. 输入组件

#### 已完成 ✅
- ✅ Dropdown (单选下拉框)
- ✅ ButtonGroup (按钮组选择器)

#### 待实现 ⏳
- [ ] **TextInput** (优先级：高) - Week 3 Day 4
- [ ] **DatePicker** (优先级：高) - Week 3 Day 3
- [ ] **Slider** (优先级：中)
- [ ] **Checkbox/Radio** (优先级：中)

---

### 3. 数据展示组件

#### 已完成 ✅
- ✅ DataTable (数据表格)
- ✅ BigValue (大数字指标)
- ✅ Value (code block 版本)
- ✅ Alert/Callout (提示框)

#### 待实现 ⏳
- [ ] **Inline Value** (优先级：高) - Week 2 Day 3
- [ ] **Metric Grid** (优先级：高) - Week 3 Day 5
- [ ] **Comparison Indicators** (优先级：中)
- [ ] **Sparklines** (优先级：中)

---

### 4. 页面/布局组件

#### 待实现 ⏳
- [ ] **Grid** (优先级：高) - Week 2 Day 4-5
- [ ] **Tabs** (优先级：高) - Week 2 Day 6
- [ ] **Accordion** (优先级：中)
- [ ] **Details/Summary** (优先级：低)
- [ ] **Breadcrumbs** (优先级：低)

---

### 5. 核心功能

#### 已完成 ✅
- ✅ **References System** - 查询互相引用 `${block_name}`
- ✅ **Dependency Graph** - 拓扑排序执行
- ✅ **Template Variables** - `${inputs.xxx}` 插值
- ✅ **Reactive Execution** - 输入变化自动重新执行

#### 待实现 ⏳
- [ ] **Loops System** (优先级：高) - Week 3 Day 1-2
- [ ] **Conditional Rendering** (优先级：中)

---

## 推荐的下一步工作

### 🎯 优先级顺序（基于业务价值和技术依赖）

#### 第一优先级（Week 2 重点）
1. ~~**Pie Chart** (0.5 day)~~ ✅ 已完成
   - D3 实现，支持饼图和环形图

2. **JSX-like Parser** (1.5 days) ⬅️ 下一步
   - 理由：是 Inline Value、Grid、Tabs 的基础
   - 影响：解锁多个组件的实现

3. **Inline Value** (1 day)
   - 理由：Evidence.dev 核心特性
   - 依赖：JSX Parser

#### 第二优先级（用户体验）
4. **Grid/Layout** (2 days)
   - 理由：改善报告布局能力
   - 依赖：JSX Parser

5. **Tabs** (1 day)
   - 理由：支持多视图报告
   - 依赖：JSX Parser

#### 第三优先级（Week 3）
6. **Loops System** (2 days)
   - 理由：动态内容生成
   - 依赖：References (已完成)

7. **DatePicker + TextInput** (2 days)
   - 理由：丰富交互控件

---

## 技术债务和优化

### 已修复 ✅
- ✅ Report 切换内容污染问题
- ✅ Editor 显示不更新问题
- ✅ localStorage 多 key 冲突
- ✅ 执行前错误日志级别

### 待优化项
- [ ] Svelte 5 Runes 完全迁移
- [ ] 错误边界和错误处理
- [ ] 性能优化（大数据集虚拟滚动）
- [ ] 可访问性 (A11y)

---

## 版本历史

### v0.1.0 - 架构重构 (2025-12-12)
- ✅ ComponentRegistry 系统
- ✅ ReportExecutionService
- ✅ BlockRenderer 统一渲染
- ✅ ChartService 图表服务
- ✅ 基础图表类型支持
- ✅ 输入组件响应式更新

### v0.1.1 - 核心功能补充 (2025-12-15)
- ✅ References System (dependency-graph.ts)
- ✅ Alert/Callout Component
- ✅ Value Component (code block)
- ✅ Bug fixes (report switching, editor sync)

### v0.2.0 - 新组件 (进行中)
- ✅ Pie Chart (D3 实现，含 donut variant)
- ⏳ JSX-like Parser
- ⏳ Inline Value Component
- ⏳ Grid/Layout System
- ⏳ Tabs Component

### v0.3.0 - 高级功能 (计划中)
- ⏳ Loops System
- ⏳ DatePicker / TextInput
- ⏳ Metric Grid
- ⏳ 性能优化

---

**最后更新:** 2025-12-15
**维护者:** Claude Code Assistant
**项目状态:** 🚧 Active Development
