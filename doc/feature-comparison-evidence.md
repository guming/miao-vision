# Miaoshou Vision vs Evidence.dev 功能对比

基于 [SF311 Demo](https://sf311.evidence.app/) 和 [Evidence.dev 文档](https://docs.evidence.dev/) 的功能分析。

## 功能对比总览

| 功能类别 | Evidence.dev | Miaoshou Vision | 状态 |
|---------|-------------|-----------------|------|
| **数据组件** |
| Value (内联值) | ✅ | ✅ | 已实现 |
| BigValue (大数值卡片) | ✅ | ✅ | 已实现 |
| DataTable | ✅ | ✅ | 已实现 |
| Delta (变化指示器) | ✅ | ⚠️ | 部分实现 |
| **输入组件** |
| Dropdown | ✅ | ✅ | 已实现 |
| ButtonGroup | ✅ | ✅ | 已实现 |
| TextInput | ✅ | ✅ | 已实现 |
| Checkbox | ✅ | ✅ | 已实现 |
| Slider | ✅ | ✅ | 已实现 |
| DateInput | ✅ | ⚠️ | DateRange 包含 |
| DateRange | ✅ | ✅ | 已实现 |
| DimensionGrid | ✅ | ✅ | 已实现 |
| **图表组件** |
| LineChart | ✅ | ✅ | 已实现 (Mosaic) |
| AreaChart | ✅ | ✅ | 已实现 (Mosaic) |
| BarChart | ✅ | ✅ | 已实现 (Mosaic) |
| ScatterPlot | ✅ | ✅ | 已实现 (Mosaic) |
| Histogram | ✅ | ✅ | 已实现 (Mosaic) |
| PieChart | ✅ | ✅ | 已实现 (含Donut) |
| FunnelChart | ✅ | ✅ | 已实现 (D3) |
| SankeyChart | ✅ | ❌ | 待实现 |
| Heatmap | ✅ | ✅ | 已实现 (Mosaic) |
| CalendarHeatmap | ✅ | ❌ | 待实现 |
| BoxPlot | ✅ | ✅ | 已实现 |
| BubbleChart | ✅ | ❌ | 待实现 |
| Sparkline | ✅ | ✅ | 已实现 |
| **地图组件** |
| AreaMap (Choropleth) | ✅ | ❌ | 待实现 |
| PointMap | ✅ | ❌ | 待实现 |
| BubbleMap | ✅ | ❌ | 待实现 |
| USMap | ✅ | ❌ | 待实现 |
| **UI 组件** |
| Alert | ✅ | ✅ | 已实现 |
| Tabs | ✅ | ✅ | 已实现 |
| Accordion | ✅ | ✅ | 已实现 |
| Modal | ✅ | ✅ | 已实现 |
| Grid (Dashboard) | ✅ | ✅ | 已实现 |
| Tooltip | ✅ | ✅ | 已实现 |
| Details | ✅ | ✅ | 已实现 |
| Note/Info | ✅ | ✅ | 已实现 |
| Progress | ✅ | ✅ | 已实现 |
| KPIGrid | ✅ | ✅ | 已实现 |
| **导出功能** |
| HTML Export | ✅ | ✅ | 已实现 |
| PDF Export | ✅ | ✅ | 已实现 (html2pdf.js) |
| Download Data (CSV) | ✅ | ✅ | 已实现 |
| Download Data (Excel) | ✅ | ✅ | 已实现 |
| Print Format | ✅ | ❌ | 待实现 |
| **高级功能** |
| 多页面/路由 | ✅ | ❌ | 待实现 |
| 参数化页面 | ✅ | ❌ | 待实现 |
| 自动刷新 | ✅ | ❌ | 待实现 |
| 离线支持 (PWA) | ✅ | ❌ | 待实现 |

---

## 详细功能差距分析

### 1. 输入组件 (高优先级)

#### 1.1 Checkbox
```markdown
<Checkbox
  name="show_completed"
  title="显示已完成"
  defaultValue={true}
/>
```
**用途**: 布尔值筛选，多选场景
**实现难度**: 低

#### 1.2 Slider ✅ 已实现
已实现，支持 min/max/step、格式化显示 (currency/percent)。

#### 1.3 DateRange ✅ 已实现
已实现，支持预设范围 (Last 7 Days, Last 30 Days 等)、自定义日期选择。

#### 1.4 DimensionGrid
```markdown
<DimensionGrid
  data={categories}
  name="selected_category"
/>
```
**用途**: 多维度快速筛选（类似 SF311 demo 的类别网格）
**实现难度**: 中

---

### 2. 图表组件 (中优先级)

#### 2.1 PieChart / DonutChart
**用途**: 占比分布展示
**实现方案**:
- 方案A: 基于 Mosaic/vgplot 实现
- 方案B: 集成 ECharts

#### 2.2 FunnelChart
**用途**: 转化漏斗分析
**实现难度**: 中

#### 2.3 SankeyChart
**用途**: 流向分析
**实现难度**: 高

#### 2.4 Heatmap / CalendarHeatmap
**用途**: 热力图分析（时间维度活跃度）
**实现难度**: 中

#### 2.5 BoxPlot
**用途**: 数据分布统计
**实现难度**: 低（Mosaic 原生支持）

---

### 3. 地图组件 (中优先级)

#### 3.1 AreaMap (Choropleth)
```markdown
<AreaMap
  data={sales_by_region}
  areaCol="region"
  value="total_sales"
  geoJsonUrl="/china-provinces.geojson"
/>
```
**用途**: 区域数据可视化（省份、城市销售分布）
**实现方案**: 集成 Leaflet 或 Mapbox
**实现难度**: 高

#### 3.2 PointMap / BubbleMap
**用途**: 地理位置标记、气泡大小表示数值
**实现难度**: 中

---

### 4. UI 组件 (低优先级)

#### 4.1 Tabs ✅ 已实现
已实现，支持内容分组展示。

#### 4.2 Accordion ✅ 已实现
已实现，支持可折叠内容区域。

#### 4.3 Modal
```markdown
<Modal buttonText="查看详情" title="详细数据">
  <DataTable data={details} />
</Modal>
```
**用途**: 弹窗展示详细信息
**实现难度**: 低

#### 4.4 Details
```markdown
<Details title="技术说明">
  这是一段详细的技术说明...
</Details>
```
**用途**: 可展开的详情说明
**实现难度**: 低

#### 4.5 Note / Info
```markdown
<Note>
  这是一条提示信息
</Note>
```
**用途**: 提示、警告信息
**实现难度**: 低

---

### 5. 导出与分享 (中优先级)

#### 5.1 PDF Export
**用途**: 生成可打印的 PDF 报告
**实现方案**:
- 方案A: html2pdf.js
- 方案B: Puppeteer (服务端)
**实现难度**: 中

#### 5.2 Download Data (CSV/Excel)
```markdown
<DownloadData data={query_result} filename="export" />
```
**用途**: 导出原始数据
**实现难度**: 低

#### 5.3 Print Format
**用途**: 打印优化样式
**实现**: CSS @media print
**实现难度**: 低

---

### 6. 高级功能 (低优先级)

#### 6.1 多页面支持
**Evidence 实现**: 基于文件系统路由
**Miaoshou 方案**:
- 报告内 Tab 切换
- 或实现简单路由

#### 6.2 参数化页面
```markdown
<!-- neighborhoods/[neighborhood].md -->
# {params.neighborhood} 分析报告
```
**用途**: 根据参数动态生成页面
**实现难度**: 高

#### 6.3 自动刷新
**用途**: 实时数据仪表板
**实现方案**: setInterval + 重新执行查询
**实现难度**: 中

#### 6.4 离线支持 (PWA)
**用途**: 离线访问已加载的报告
**实现方案**: Service Worker
**实现难度**: 中

---

## DataTable 功能增强对比

| 功能 | Evidence | Miaoshou | 备注 |
|-----|----------|----------|-----|
| 排序 | ✅ | ✅ | |
| 搜索 | ✅ | ✅ | 已实现 |
| 分页/虚拟滚动 | ✅ | ✅ | 虚拟滚动 |
| 条件格式 | ✅ | ✅ | |
| Sparkline 列 | ✅ | ✅ | |
| Bar 列 (Data Bar) | ✅ | ✅ | 已实现 |
| 色阶 (Color Scale) | ✅ | ✅ | 已实现 |
| 图标集 (Icon Set) | ✅ | ✅ | 已实现 |
| Delta 列 | ✅ | ⚠️ | 部分实现 |
| Image 列 | ✅ | ❌ | 待实现 |
| Link 列 | ✅ | ✅ | |
| HTML 列 | ✅ | ❌ | 待实现 |
| 行分组 | ✅ | ❌ | 待实现 |
| 小计行 | ✅ | ❌ | 待实现 |
| 合计行 (Summary) | ✅ | ✅ | 已实现 |
| 列筛选 | ✅ | ✅ | 已实现 |
| 列选择器 | ✅ | ✅ | 已实现 |
| 行选择 | ✅ | ✅ | 已实现 |
| 导出 CSV | ✅ | ✅ | 已实现 |
| 导出 Excel | ✅ | ✅ | 已实现 |
| Drill-down | ✅ | ✅ | 已实现 |
| 列固定 | ✅ | ❌ | 待实现 |
| 列宽调整 | ✅ | ❌ | 待实现 |

---

## BigValue 功能增强对比

| 功能 | Evidence | Miaoshou | 备注 |
|-----|----------|----------|-----|
| 基础数值显示 | ✅ | ✅ | |
| 标题 | ✅ | ✅ | |
| 数字格式化 | ✅ | ✅ | |
| 比较值 (comparison) | ✅ | ✅ | |
| Delta 指示器 | ✅ | ✅ | |
| Sparkline | ✅ | ✅ | |
| 链接 | ✅ | ❌ | 待实现 |
| 多卡片自动布局 | ✅ | ⚠️ | Grid 支持 |

---

## 推荐实现优先级

### Phase 1: 核心输入组件 ✅ 完成
1. ~~**DateRange**~~ - ✅ 已实现
2. ~~**Checkbox**~~ - ✅ 已实现
3. ~~**Slider**~~ - ✅ 已实现

### Phase 2: 数据展示增强 (1-2周)
1. ~~**DataTable 搜索**~~ - ✅ 已实现
2. ~~**Download Data (CSV/Excel)**~~ - ✅ 已实现
3. **DataTable 分组/小计** - 复杂报表需求
4. **Image 列** - 图片显示

### Phase 3: 更多图表 (2-3周)
1. ~~**PieChart**~~ - ✅ 已实现 (含 Donut)
2. **Heatmap** - 数据密集型展示
3. **BoxPlot** - 统计分析
4. **FunnelChart** - 转化漏斗

### Phase 4: 地图组件 (3-4周)
1. **AreaMap** - 区域数据可视化
2. **PointMap** - 位置标记

### Phase 5: UI 增强 (1周)
1. ~~**Tabs**~~ - ✅ 已实现
2. ~~**Accordion**~~ - ✅ 已实现
3. ~~**Modal**~~ - ✅ 已实现
4. **Print Format** - 打印优化

### Phase 6: 高级功能 (按需)
1. PDF Export
2. 自动刷新
3. PWA 支持

---

## SF311 Demo 特色功能分析

### 1. 导航结构
- 顶部导航: Home / Categories / Neighborhoods
- 侧边栏: 可折叠，包含 logo
- **待实现**: 多页面路由支持

### 2. 首页仪表板
- BigValue 卡片展示关键指标 (Total Cases, Open Cases)
- 按维度分组的数据列表
- 趋势图表
- **已实现**: BigValue, DataTable, Charts

### 3. Categories 页面
- 分页表格 (25 of 659 records, Page 1/27)
- SQL 查询: `SELECT category, request_type, count(*) as cases`
- **待实现**: 更好的分页 UI

### 4. Neighborhoods 页面
- **Neighborhood 选择器**: 输入框 + 下拉列表 (117 个选项)
- **动态数据筛选**: 根据选择的 neighborhood 过滤数据
- **周趋势图**: 按周聚合的案例趋势
- **类别分布图**: 该 neighborhood 的案例类别分布
- **深度链接**: 点击查看单个 neighborhood 详情
- **待实现**: 参数化页面、更复杂的筛选逻辑

---

## 技术栈对比

| 技术领域 | Evidence.dev | Miaoshou Vision |
|---------|-------------|-----------------|
| 框架 | SvelteKit | Svelte 5 (SPA) |
| SQL 引擎 | DuckDB | DuckDB-WASM |
| 图表库 | ECharts | Mosaic vgplot |
| 地图库 | Leaflet | - |
| UI 组件 | Shadcn | 自定义 |
| 部署 | 静态站点 | 静态站点 |

---

## 总结

Miaoshou Vision 已经实现了 Evidence.dev 的大部分核心功能：

### 已实现 ✅
- SQL 查询执行 (DuckDB-WASM)
- 数据组件: Value, BigValue, DataTable (搜索/筛选/导出CSV/Excel), KPIGrid, Progress, Sparkline
- 输入组件: Dropdown, ButtonGroup, TextInput, Slider, DateRange, Checkbox
- 图表: Bar, Line, Area, Scatter, Histogram, Pie/Donut (基于 Mosaic vgplot)
- DataTable 高级功能: 条件格式、色阶、图标集、数据条、汇总行、Drill-down
- UI 组件: Alert, Tabs, Accordion, Tooltip, Grid, Modal
- 导出: HTML, CSV, Excel

### 主要差距 ❌
1. **输入组件**: DimensionGrid
2. **图表类型**: Funnel、Sankey、Heatmap、BoxPlot
3. **地图组件**: 完全缺失 (AreaMap, PointMap)
4. **UI 组件**: Details、Note/Info
5. **导出**: PDF 导出、打印优化
6. **高级功能**: 多页面路由、自动刷新、PWA
