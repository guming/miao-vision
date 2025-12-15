# 📊 vgplot 图表实现计划

## 🎯 目标

实现第一个可用的 vgplot 图表类型，让用户能够：
1. 选择查询结果中的列作为 X/Y 轴
2. 选择图表类型
3. 实时渲染交互式图表
4. 支持基本的图表配置（宽度、高度、标题等）

---

## 📋 详细任务清单

### ✅ 阶段 1：调研与设计（已完成）

- [x] **任务 1.1**: 研究 Mosaic vgplot API
  - **产出**: API 文档理解
  - **关键发现**:
    - vgplot 使用 `vg.plot()` 创建图表
    - 支持 `lineY`, `barY`, `dot` 等标记类型
    - 需要配置 `coordinator` 和 `wasmConnector`
    - 可以直接从 DuckDB 表读取数据

---

### 🎨 阶段 2：选择图表类型

- [ ] **任务 2.1**: 确定首个实现的图表类型
  - **选项分析**:

    | 图表类型 | 难度 | 适用场景 | 推荐度 |
    |---------|------|---------|--------|
    | 柱状图 (barY) | ⭐⭐ | 分类数据对比 | ⭐⭐⭐⭐⭐ |
    | 折线图 (lineY) | ⭐⭐ | 时间序列 | ⭐⭐⭐⭐ |
    | 散点图 (dot) | ⭐ | 关系分析 | ⭐⭐⭐ |

  - **推荐**: **柱状图 (barY)**
    - 理由 1: 视觉效果明显
    - 理由 2: 适合聚合数据（COUNT, SUM, AVG）
    - 理由 3: API 简单
    - 理由 4: 用户易理解

  - **产出**: 确认图表类型

- [ ] **任务 2.2**: 设计图表配置结构
  - **产出**: TypeScript 接口定义
  - **预期结构**:
    ```typescript
    interface ChartConfig {
      type: 'bar' | 'line' | 'scatter'
      data: {
        table: string      // DuckDB 表名
        x: string          // X 轴列名
        y: string          // Y 轴列名
      }
      options: {
        width?: number
        height?: number
        title?: string
        xLabel?: string
        yLabel?: string
      }
    }
    ```

---

### 🔧 阶段 3：核心实现

#### 📝 任务 3.1: 创建类型定义
- [ ] 创建 `src/types/chart.ts`
- [ ] 定义 `ChartConfig` 接口
- [ ] 定义 `ChartType` 枚举
- [ ] 定义 `ChartData` 接口
- **产出**: 完整的类型定义文件
- **预计时间**: 30 分钟

#### 🎨 任务 3.2: 实现 VgplotChart 组件
- [ ] 创建 `src/components/VgplotChart.svelte`
- [ ] 实现 vgplot 初始化逻辑
- [ ] 实现柱状图渲染
- [ ] 处理数据绑定和更新
- [ ] 添加错误处理
- **关键代码结构**:
  ```svelte
  <script lang="ts">
    import * as vg from '@uwdata/vgplot'
    import { coordinator } from '@/lib/viz/mosaic-connector'

    let { config } = $props()
    let chartContainer: HTMLDivElement

    onMount(() => {
      renderChart()
    })

    function renderChart() {
      const plot = vg.plot(
        vg.barY(
          vg.from(config.data.table),
          { x: config.data.x, y: config.data.y }
        ),
        vg.width(config.options.width),
        vg.height(config.options.height)
      )

      chartContainer.appendChild(plot)
    }
  </script>
  ```
- **产出**: 可工作的图表组件
- **预计时间**: 2 小时

#### ⚙️ 任务 3.3: 更新 mosaic-connector
- [ ] 修改 `src/lib/viz/mosaic-connector.ts`
- [ ] 确保与 DuckDB-WASM 正确连接
- [ ] 添加图表数据查询辅助函数
- **产出**: 增强的连接器
- **预计时间**: 30 分钟

---

### 🖥️ 阶段 4：用户界面

#### 🎛️ 任务 4.1: 创建图表配置面板
- [ ] 创建 `src/components/ChartConfigPanel.svelte`
- [ ] 实现图表类型选择器（下拉菜单）
- [ ] 实现 X 轴列选择（从查询结果列中选择）
- [ ] 实现 Y 轴列选择
- [ ] 实现尺寸配置（宽度、高度）
- [ ] 实现标题和标签输入框
- **UI 布局**:
  ```
  ┌─────────────────────────────────┐
  │ Chart Configuration             │
  ├─────────────────────────────────┤
  │ Chart Type: [Bar Chart ▼]      │
  │ X Axis:     [Select Column ▼]  │
  │ Y Axis:     [Select Column ▼]  │
  │ Width:      [680]               │
  │ Height:     [400]               │
  │ Title:      [____________]      │
  │                                 │
  │         [Generate Chart]        │
  └─────────────────────────────────┘
  ```
- **产出**: 配置面板组件
- **预计时间**: 2 小时

#### 🎨 任务 4.2: 创建图表展示容器
- [ ] 创建 `src/components/ChartDisplay.svelte`
- [ ] 实现图表容器布局
- [ ] 添加加载状态
- [ ] 添加错误提示
- [ ] 添加空状态提示
- **产出**: 图表展示组件
- **预计时间**: 1 小时

---

### 🔗 阶段 5：数据集成

#### 🔄 任务 5.1: 实现查询结果转换
- [ ] 创建 `src/lib/viz/data-adapter.ts`
- [ ] 实现 `QueryResult` 到图表数据的转换
- [ ] 处理数据类型推断（数值、字符串、日期）
- [ ] 实现数据验证
- **关键函数**:
  ```typescript
  function adaptQueryResultForChart(
    result: QueryResult,
    config: ChartConfig
  ): ChartData {
    // 1. 验证列是否存在
    // 2. 检查数据类型兼容性
    // 3. 转换数据格式
    // 4. 返回适配后的数据
  }
  ```
- **产出**: 数据适配器
- **预计时间**: 1.5 小时

#### 💾 任务 5.2: 创建图表状态管理
- [ ] 创建 `src/lib/stores/chart.svelte.ts`
- [ ] 实现图表配置状态
- [ ] 实现图表数据缓存
- [ ] 实现图表历史记录
- **产出**: Svelte 5 Runes Store
- **预计时间**: 1 小时

---

### 🎯 阶段 6：集成到应用

#### 🔌 任务 6.1: 更新 Visualize 标签页
- [ ] 修改 `src/App.svelte`
- [ ] 集成 `ChartConfigPanel`
- [ ] 集成 `VgplotChart`
- [ ] 添加示例数据提示
- [ ] 添加使用说明
- **布局设计**:
  ```
  ┌─────────────────────────────────────────────┐
  │ Visualize                                   │
  ├───────────────┬─────────────────────────────┤
  │               │                             │
  │ Configuration │  Chart Display              │
  │ Panel         │                             │
  │ (左侧 30%)    │  (右侧 70%)                 │
  │               │                             │
  │               │                             │
  └───────────────┴─────────────────────────────┘
  ```
- **产出**: 更新后的 Visualize 页面
- **预计时间**: 1.5 小时

#### 🔗 任务 6.2: 连接 Query 和 Visualize
- [ ] 从 Query 页面传递查询结果
- [ ] 实现"创建图表"按钮
- [ ] 自动切换到 Visualize 标签页
- [ ] 自动填充可用列
- **产出**: 页面间数据流
- **预计时间**: 1 小时

---

### ✅ 阶段 7：测试与优化

#### 🧪 任务 7.1: 功能测试
- [ ] 测试基本柱状图渲染
- [ ] 测试不同数据类型
- [ ] 测试边界情况（空数据、单条数据）
- [ ] 测试错误处理
- **测试场景**:
  1. 上传 CSV 文件
  2. 执行聚合查询
  3. 选择列创建图表
  4. 验证图表正确显示
- **产出**: 测试报告
- **预计时间**: 1 小时

#### ⚡ 任务 7.2: 性能优化
- [ ] 优化图表渲染性能
- [ ] 添加防抖处理
- [ ] 优化大数据集处理
- [ ] 添加渲染缓存
- **产出**: 性能优化报告
- **预计时间**: 1 小时

#### 📖 任务 7.3: 文档更新
- [ ] 更新 README.md
- [ ] 更新 GETTING_STARTED.md
- [ ] 创建图表使用示例
- [ ] 添加截图
- **产出**: 更新的文档
- **预计时间**: 30 分钟

---

## 📊 任务汇总

| 阶段 | 任务数 | 预计时间 | 优先级 |
|------|--------|----------|--------|
| 阶段 2: 选择图表类型 | 2 | 30 分钟 | P0 |
| 阶段 3: 核心实现 | 3 | 3 小时 | P0 |
| 阶段 4: 用户界面 | 2 | 3 小时 | P0 |
| 阶段 5: 数据集成 | 2 | 2.5 小时 | P1 |
| 阶段 6: 集成到应用 | 2 | 2.5 小时 | P1 |
| 阶段 7: 测试与优化 | 3 | 2.5 小时 | P2 |
| **总计** | **14** | **~14 小时** | - |

---

## 🎯 里程碑

### 🥉 MVP (最小可行产品)
**目标**: 能够创建一个简单的柱状图

**包含**:
- ✅ 柱状图渲染
- ✅ 基本配置（X/Y 轴选择）
- ✅ 从查询结果创建图表

**不包含**:
- ❌ 多图表类型
- ❌ 高级配置
- ❌ 图表保存

**预计时间**: 6-8 小时

### 🥈 V1.0
**目标**: 完整的单图表功能

**在 MVP 基础上增加**:
- ✅ 完整的配置面板
- ✅ 尺寸和样式配置
- ✅ 错误处理
- ✅ 用户友好的 UI

**预计时间**: 10-12 小时

### 🥇 V2.0 (未来计划)
**目标**: 多图表类型支持

**增加**:
- ✅ 折线图
- ✅ 散点图
- ✅ 面积图
- ✅ 图表保存和导出

**预计时间**: +8 小时

---

## 🔍 关键技术点

### 1. vgplot API 使用

```javascript
import * as vg from '@uwdata/vgplot'

// 创建柱状图
const plot = vg.plot(
  vg.barY(
    vg.from("table_name"),
    { x: "category", y: "value" }
  ),
  vg.width(680),
  vg.height(400)
)
```

### 2. 与 DuckDB-WASM 集成

```javascript
import { coordinator, wasmConnector } from '@uwdata/mosaic-core'

// 配置连接器
coordinator().databaseConnector(wasmConnector())
```

### 3. Svelte 5 Runes 响应式

```svelte
<script lang="ts">
  let config = $state<ChartConfig>({...})

  $effect(() => {
    // 配置变化时重新渲染
    if (config) {
      renderChart()
    }
  })
</script>
```

---

## 📝 示例使用流程

### 用户故事

> 作为数据分析师，我想要对销售数据创建一个柱状图，以便查看各地区的销售额对比。

**步骤**:

1. **上传数据**
   ```
   上传 sales.csv (包含 region, amount 列)
   ```

2. **执行查询**
   ```sql
   SELECT region, SUM(amount) as total_sales
   FROM table_xxx
   GROUP BY region
   ORDER BY total_sales DESC
   ```

3. **创建图表**
   - 切换到 Visualize 标签页
   - 选择图表类型：Bar Chart
   - X 轴：region
   - Y 轴：total_sales
   - 点击 "Generate Chart"

4. **查看结果**
   - 显示交互式柱状图
   - 可以悬停查看数值
   - 可以调整尺寸

---

## ⚠️ 风险和挑战

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| vgplot API 理解偏差 | 高 | 先实现简单示例验证 |
| 数据类型不兼容 | 中 | 添加严格的类型检查 |
| 性能问题（大数据集） | 中 | 实现数据采样 |
| 图表渲染错误 | 高 | 完善错误处理和日志 |

---

## ✅ 验收标准

### 功能性
- [ ] 能够从查询结果创建柱状图
- [ ] X/Y 轴正确映射数据
- [ ] 图表可交互（悬停显示数值）
- [ ] 配置变化时图表实时更新

### 性能
- [ ] 1000 行数据内渲染时间 < 1s
- [ ] 配置变化响应时间 < 100ms
- [ ] 无明显卡顿

### 用户体验
- [ ] UI 直观易用
- [ ] 错误提示清晰
- [ ] 支持键盘操作
- [ ] 响应式布局

### 代码质量
- [ ] 类型检查通过（0 错误）
- [ ] 代码有注释
- [ ] 可维护性良好

---

## 📚 参考资源

- [Mosaic vgplot 文档](https://idl.uw.edu/mosaic/vgplot/)
- [vgplot API 参考](https://idl.uw.edu/mosaic/api/vgplot/)
- [Mosaic 示例](https://idl.uw.edu/mosaic/examples/)
- [DuckDB-WASM 文档](https://duckdb.org/docs/api/wasm)

---

## 🎯 推荐实施顺序

1. **Phase 1 (必做)**: 阶段 2-3
   - 确定图表类型
   - 实现核心渲染功能
   - **目标**: 能看到第一个图表

2. **Phase 2 (必做)**: 阶段 4
   - 创建配置面板
   - **目标**: 用户可以配置图表

3. **Phase 3 (必做)**: 阶段 5-6
   - 数据集成
   - 页面集成
   - **目标**: 完整的工作流

4. **Phase 4 (可选)**: 阶段 7
   - 测试优化
   - 文档完善
   - **目标**: 生产级质量

---

## 💡 建议

### 开发建议
1. **先实现 MVP**，不要追求完美
2. **边开发边测试**，使用真实数据
3. **保持简单**，第一版功能要聚焦
4. **写好注释**，方便后续扩展

### 技术建议
1. 使用 TypeScript 严格模式
2. 组件保持单一职责
3. 状态管理集中化
4. 错误处理要完善

---

**准备好开始了吗？请审核此计划并告知是否需要调整！** 🚀
