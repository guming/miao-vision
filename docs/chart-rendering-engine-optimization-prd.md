# Miao Vision 统计图渲染引擎优化 PRD

> 日期：2026-07-27  
> 产品范围：`packages/miao-viz-cli` 的 Data Report 与 Browser Deck 图表渲染  
> 状态：Proposal / 待评审  
> 优先级：P0–P2

## 1. 背景

Miao Vision 已具备一套可工作的本地静态可视化链路：

```text
本地数据
  → data analyze / profile
  → AgentChartSpec / DeckSpec
  → catalog 与 validator
  → prepareChartData
  → SVG / HTML renderer
  → self-contained report 或 browser deck
```

当前系统已经支持 bar、line、area、scatter、histogram、heatmap、boxplot、bubble、facet、reference、annotation 等统计图，也支持 gauge、funnel、radar、sankey、treemap、KPI、table、pivot 和 infographic 等专用视觉。

但常规统计图的渲染能力仍主要按图表类型分别实现。bar、line、scatter 等 renderer 各自承担部分 scale、domain、axis、tick、legend、label 和布局逻辑，导致：

- 同类坐标轴在不同图表中的刻度、格式和边距不一致。
- 增加 log/time/diverging scale、连续色阶或新 legend 时需要修改多个 renderer。
- reference、annotation 和 facet 通过图表外层拼装，难以共享准确的坐标与布局。
- 长标签、图例溢出、极端值、暗色主题等边界情况缺少统一策略。
- Report 和 Deck 虽共享静态 SVG 入口，但浏览器交互重绘仍存在重复实现。
- Theme 主要控制 palette、background、axisColor 和 labelColor，尚不足以形成完整的图表设计语言。
- 新增图表容易继续扩大按类型分支，而不是复用稳定的视觉原语。

引入完整第三方高级图表运行时可以缓解部分问题，但会增加 CLI/HTML 依赖、运行时体积、SSR/浏览器一致性和自包含交付复杂度。本项目选择保留 Miao Vision 自有的纯 SVG、local-first 路线，把常规统计图渲染能力升级为一个面向报告与演示的紧凑型声明式渲染内核。

## 2. 产品定位

本项目定义的能力命名为：

> **Miao Chart Engine**

它是一套由 Miao Vision 自己维护的、确定性的统计图渲染基础设施：

```text
AgentChartSpec
  → chart compiler
  → scale / guide / mark / layout scene
  → SVG serializer
```

Miao Chart Engine 不取代现有的：

- Data profile、analyze context 和 evidence。
- Chart catalog、block/template registry 和 validator。
- `prepareChartData` 的业务语义变换。
- Report、Deck 和 Article 各自的产物与布局模型。
- KPI、table、pivot、infographic 和高级专用图 renderer。

产品承诺：

> 常用统计图共享一套可解释、可主题化、可组合的绘图语言，在 Report、Deck、静态 SVG 和离线交互中保持一致。

## 3. 产品目标

### 3.1 用户目标

- 常用统计图具有一致且专业的坐标轴、图例、标签、网格和留白。
- 同一份 Spec 在 Report 和 Deck 中保持相同的数据语义、颜色和视觉层次。
- 七套 Theme 不只是换 palette，而是在字体、网格、标记、轴线、图例和信息密度上形成可识别差异。
- 长标签、空值、负值、极端值、稠密数据和 small multiples 能稳定降级，不产生不可读结果。
- 生成的 HTML 继续离线、自包含、可打印、易分享。

### 3.2 Agent 目标

- Agent 继续编写简短的 `AgentChartSpec`，不需要输出底层 mark 或 SVG。
- CLI 可以解释最终选择的 scale、domain、ticks、legend、facet 和降级策略。
- 无法可靠展示时，validator 或 renderer 返回结构化 warning，而不是静默生成误导性图表。
- Catalog 仍是图表选择和适用规则的单一事实源。

### 3.3 工程目标

- bar、line、area、scatter 等常用图共享 scale、axis、legend、layout 和 mark primitives。
- 静态渲染和浏览器交互重绘逐步复用同一套纯 TypeScript 核心。
- 新增常规统计图主要通过组合 marks 完成，而不是复制坐标系实现。
- 保持纯 SVG 字符串输出，不要求 DOM、Canvas、JSDOM 或远程资源。
- 保持结构化 `ok/value`、错误码、evidence id、`$evidence:` 验证和 patch hint 契约。

## 4. 成功指标

使用固定离线 fixture 集评估。基准集至少覆盖：

- 30 份代表性数据集。
- 7 套现有 Theme。
- Report 与 Deck 两类产物。
- 宽屏、窄屏、固定 slide 三类画布。
- 长标签、负值、空值、单点、极端值、高基数和 facet 场景。

目标指标：

| 指标 | 目标 |
|---|---:|
| P0 统计图共享 scale/axis/legend 内核覆盖率 | 100% |
| Report 与 Deck 同 Spec 的 scale/domain 一致率 | 100% |
| 支持场景中出现 `NaN`、`Infinity` 或越界 mark 的比例 | 0% |
| 七套 Theme 的核心 chart token 覆盖率 | 100% |
| 长标签 fixture 无不可见关键信息比例 | 100% |
| 新增基础图表 renderer 重复实现 axis/legend 的数量 | 0 |
| 静态与交互渲染的核心 fixture 语义一致率 | 100% |
| HTML/SVG/打印或 PDF 视觉回归通过率 | 100% |
| 现有可支持 Spec 的向后兼容率 | 100% |

“视觉一致”不要求像素完全相同，但要求：

- 相同 domain、series、category color 和数据顺序。
- 相同的零基线、stack/group 语义和缺失值策略。
- Report 与 Deck 的差异仅来自明确的尺寸与主题布局 preset。

## 5. 非目标

- 不复制 Observable Plot、Vega-Lite、D3 或其他完整通用图形语法。
- 不向公开 Spec 暴露任意 mark 编程接口。
- 不允许 Agent 输出 JavaScript、SVG path 或 renderer callback。
- 不在 CLI 内运行 LLM。
- 不重写 analyze、evidence、catalog、block 或 template 系统。
- 不把 Article Infographic 强行迁入 Data Report chart model。
- 不在 P0 重写 gauge、funnel、radar、sankey、treemap、waterfall 等专用图。
- 不在 P0 建设 Canvas/WebGL、大数据流式渲染或 GPU 加速。
- 不建设在线 dashboard、远程数据源或浏览器编辑器。
- 不以“图表数量”或“视觉新奇度”作为成功指标。
- 不为了统一 renderer 而降低现有专用图的视觉质量。

## 6. 目标用户和核心场景

### 6.1 报告阅读者

用户打开 self-contained HTML 或 PDF，需要快速、准确地理解比较、趋势、分布和关系，并在不同 Theme 下获得稳定可读的结果。

### 6.2 演示者

用户在固定 16:9 Browser Deck 中展示数据。图表必须在有限空间内保持一致的绘图区、字体下限、图例位置和标签策略。

### 6.3 Agent 作者

Agent 依据 analyze context、catalog 和 validator 选择图表。Agent 不负责猜测 margin、tick 数、字体大小或 SVG 坐标。

### 6.4 CLI 开发者

开发者需要扩展一种 scale、axis 策略或基础 mark 时，可以只修改共享模块，并通过结构测试和视觉回归验证所有消费者。

## 7. 设计原则

1. **公开 Spec 稳定**：内部架构升级不要求用户重写现有 Spec。
2. **语义先于绘制**：业务聚合、排序和证据计算由 Miao 数据层完成，renderer 不隐藏业务计算。
3. **组合优于类型分支**：常规图表由共享 marks 和 guides 组合。
4. **确定性优先**：相同输入、Spec、Theme 和版本必须产生相同的 scale 与 SVG。
5. **静态优先**：核心信息必须在无 JavaScript、打印和 PDF 中完整存在。
6. **Theme 是设计系统**：Theme 控制图表 token，而不只是 palette。
7. **可解释降级**：空间或数据不足时应用固定策略并输出结构化诊断。
8. **专用视觉保留专用实现**：统一内核只覆盖适合共享笛卡尔或极坐标原语的图表。
9. **单一事实源**：Catalog 定义适用性，Chart Compiler 定义视觉 recipe，Theme 定义视觉 token。
10. **渐进迁移**：每个迁移图表都必须具备兼容性和视觉回归，禁止一次性替换全部 renderer。

## 8. 当前状态与本 PRD Delta

| 能力 | 当前状态 | 本 PRD Delta |
|---|---|---|
| `AgentChartSpec` | 已支持 encoding、variant、facet、reference、annotation、colorScale | 保持公开 contract，补充少量可验证的 guide/format 字段 |
| `prepareChartData` | 已支持 derive、aggregate、sort、limit、filter | 保留业务语义职责，明确 display transform 边界 |
| Scale | 多个 renderer 分别计算 | 建立统一 scale registry、domain inference 和映射 |
| Axis | 已有共享 helper，但能力有限 | 建立统一 tick、format、label collision 和 layout |
| Legend | 部分图表自定义 | 从 scale 自动生成 categorical/ramp/size/symbol legend |
| Marks | 按图表类型直接输出 SVG | 建立 rect、line、area、dot、rule、text、cell 等 primitives |
| Facet | 嵌套并拼接子 SVG | 建立单一 scene 下的 facet grid、共享轴和共享 legend |
| References/annotations | 后置 SVG 字符串插层 | 编译为共享 scale 下的 scene layers |
| Theme | CSS + 4 个 SVG token | 扩展为向后兼容的 ChartTheme tokens |
| Report/Deck | 共享静态 `renderChartSvg` | 共享 compiler 与 scene，使用不同 layout preset |
| Interactive runtime | 浏览器侧存在简化重绘实现 | 分阶段复用共享纯 TS 核心，消除语义漂移 |
| Diagnostics | validator 与 renderer warning 分散 | 增加结构化 chart inspect/compile diagnostics |

## 9. 产品范围

### 9.1 P0：统一统计图基础内核

- Chart Scene IR。
- Linear、band、point、ordinal、time scale。
- 统一 domain inference、nice、zero 和 clamp。
- 统一 bottom/left/top/right axis。
- 统一 number（含 compact notation）、currency、percent、date formatter。
- Categorical swatches legend。
- Rect、line、area、dot、rule、text、cell marks。
- bar、line、area、scatter 迁移。
- Report 与 Deck 共享 compiler。
- Theme chart token 扩展。
- 结构诊断和视觉回归基线。

### 9.2 P1：表达与布局丰富度

- Log、symlog、sqrt、sequential、diverging、threshold scale。
- Continuous ramp、size、symbol legend。
- histogram、heatmap、bubble、dot、range、boxplot 迁移。
- Grouped/stacked/diverging bar。
- Reference line、reference band 和 annotation scene layer。
- Facet grid、共享或独立 scale、共享 axis/legend。
- 自动 margin、标签冲突与 legend overflow 策略。
- Direct labels、line-end labels 和 bar value labels。
- 浏览器交互重绘复用共享核心。

### 9.3 P2：专业表达增强

- Calendar、Pareto、combo 等可组合统计图迁移评估。
- Quantile、quantize、UTC、window display transforms。
- 更完善的 annotation collision 和 leader line。
- 数据质量、估算值、低样本等视觉编码统一。
- Chart gallery、Theme gallery 和 renderer benchmark report。
- 可选的 renderer capability manifest，供 catalog/validator 自动核对。

## 10. 功能需求

### FR-1：Chart Compiler 与 Scene IR

系统必须将经过验证并完成数据变换的 `AgentChartSpec` 编译为内部 `ChartScene`。

以下类型为 **Draft v0**，用于评审核心数据流和职责边界，不要求实现阶段逐字段照搬命名。Milestone 0 必须在此基础上产出并评审完整、可编译的 TypeScript contract，之后才能进入 Scale/Axis 实现。

```ts
// Temporal values use normalized ISO strings; Scene IR does not store Date objects.
type SceneValue = string | number | boolean | null
type SceneValueType = 'nominal' | 'ordinal' | 'quantitative' | 'temporal'
type MissingValuePolicy = 'drop' | 'zero' | 'gap' | 'unknown'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface ChartScene {
  version: 1
  chartId: string
  width: number
  height: number
  plot: Rect
  data: SceneDatum[]
  scales: ScaleDefinition[]
  axes: AxisDefinition[]
  legends: LegendDefinition[]
  marks: MarkDefinition[]
  facets?: FacetDefinition
  accessibility: AccessibilityDefinition
  diagnostics: ChartDiagnostic[]
}

interface SceneDatum {
  id: string
  sourceIndex: number
  values: Record<string, SceneValue>
}

interface Channel {
  field?: string
  value?: SceneValue
  type: SceneValueType
  scale?: string | null
  missing?: MissingValuePolicy
  format?: FormatSpec
}

interface ScaleDefinition {
  id: string
  type: ScaleType
  domain: SceneValue[]
  range: Array<number | string>
  nice?: boolean
  zero?: boolean
  clamp?: boolean
  reverse?: boolean
  paddingInner?: number
  paddingOuter?: number
  unknown?: string
}

interface AxisDefinition {
  id: string
  scale: string
  anchor: 'top' | 'right' | 'bottom' | 'left'
  label?: string
  tickValues: SceneValue[]
  tickFormat?: FormatSpec
  tickRotate?: number
  tickSize?: number
  tickPadding?: number
  grid?: boolean
  line?: boolean
  zeroLine?: boolean
  bounds: Rect
}

interface LegendDefinition {
  id: string
  scale: string
  type: 'swatches' | 'ramp' | 'size' | 'symbol'
  position: 'top' | 'right' | 'bottom' | 'inside'
  orientation: 'horizontal' | 'vertical'
  title?: string
  items: LegendItem[]
  bounds: Rect
}

interface LegendItem {
  id: string
  label: string
  value: SceneValue
  color?: string
  size?: number
  symbol?: string
}

interface MarkDefinition {
  id: string
  type: MarkType
  datumIds: string[]
  channels: MarkChannels
  style: MarkStyle
  clip: 'plot' | 'none'
  zIndex: number
  interactive?: boolean
}

interface MarkStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  radius?: number
  cornerRadius?: number
  dash?: string
}

interface AccessibilityDefinition {
  title: string
  description: string
  tableSummary?: string
}
```

要求：

- Scene IR 仅为内部 contract，不直接暴露给 Agent。
- Scene 必须可 JSON 序列化，不能包含闭包、DOM 对象或运行时实例。
- Compiler 输入只包含 Spec、prepared rows、Theme 和 render context。
- Compiler 不执行未在数据层声明的业务聚合。
- Compiler 输出必须包含最终 scale domain 和 layout bounds，便于测试和诊断。
- Report 与 Deck 对同一 chart 使用相同 compiler，只传入不同尺寸和 layout preset。
- `Channel` 只能使用可序列化的 field、constant value 和 scale binding，不允许 accessor function、任意表达式或 DOM callback。
- `field` 与 `value` 必须二选一；使用 `scale: null` 表示屏幕常量或未缩放视觉值。
- `datumIds` 必须引用 `ChartScene.data[].id`，不得复制无法追溯的数据对象。
- Scene 内所有日期的实际序列化形式在 Milestone 0 锁定；不得依赖环境相关的隐式日期解析。

Milestone 0 contract 附件至少还需补齐：

- `FacetDefinition` 和 facet panel 类型。
- Mark geometry 编译后的表示方式。
- `ChartDiagnostic`、`RenderContext` 和 serializer 输入输出。
- Scene schema/version 的兼容策略。
- 至少一个 bar 与一个 line 的完整 Scene JSON fixture。

### FR-2：统一 Scale Engine

P0 scale：

```ts
type ScaleType =
  | 'linear'
  | 'band'
  | 'point'
  | 'ordinal'
  | 'time'
```

P1 scale：

```ts
type ScaleType =
  | 'log'
  | 'symlog'
  | 'sqrt'
  | 'sequential'
  | 'diverging'
  | 'threshold'
```

Scale 必须支持：

- 从 channel values 推断 domain。
- 显式 domain override。
- `nice`、`zero`、`clamp`、`reverse`。
- Band padding 和 point padding。
- 稳定类别顺序。
- 稳定 category-to-color 映射。
- Reference 和 annotation 所需值参与 domain 计算。
- 空 domain、单值 domain 和非法值的确定性处理。
- Shared facet domain 与 independent facet domain。

Scale Engine 不得：

- 隐藏业务聚合。
- 根据 SVG 元素反推 domain。
- 因 Report/Deck 容器不同而改变数据语义。

### FR-3：统一 Axis Engine

Axis 必须支持：

- top、right、bottom、left anchor。
- 自动 tick count 和显式 tick count。
- 显式 tick values。
- nice numeric ticks。
- 时间刻度。
- grid、axis line、zero line 独立开关。
- tick size、padding、rotation 和 label offset。
- Theme-aware 字体、颜色、线宽和网格样式。
- CJK-aware 文本测量、baseline、截断、换行和旋转策略。
- `aria-label`、SVG `<title>`、`<desc>` 和 chart-level description。

P0 formatter：

```ts
type FormatSpec =
  | { type: 'number'; precision?: number; notation?: 'standard' | 'compact' }
  | { type: 'currency'; currency?: string; precision?: number }
  | { type: 'percent'; precision?: number }
  | { type: 'date'; pattern?: string }
```

标签冲突按固定顺序降级：

1. 根据可用宽度降低 tick 密度。
2. 对可省略 tick 进行抽样。
3. 对 nominal label 应用确定性截断。
4. 在允许的图表中旋转 label。
5. 输出 `AXIS_LABEL_OVERFLOW` warning。
6. Catalog 或 validator 可建议 horizontal variant 或 facet。

Renderer 不得默默把字号缩小到 Theme 定义的最小字号以下。

CJK 文本要求：

- Theme 必须提供 CJK fallback font stack，不依赖远程字体。
- 文本测量必须识别 CJK 全角字符与拉丁字符的宽度差异。
- 中文标签默认按字符边界截断或换行，不按空格分词。
- Axis label 旋转后仍需使用稳定的 `text-anchor` 和 dominant baseline。
- CJK、Latin、数字混排必须进入视觉回归 fixture。

### FR-4：统一 Legend Engine

P0 支持：

- Categorical swatches。
- 水平、垂直方向。
- top、right、bottom、inside position。
- 标题、项目间距、列数和最大项目数。

P1 支持：

- Continuous color ramp。
- Size legend。
- Symbol legend。

要求：

- Legend 必须读取与 marks 相同的 scale。
- 单一类别可以按 preset 自动隐藏 legend。
- 类别颜色在同一 artifact 内稳定。
- Legend 项目过多时按固定策略分列、截断或返回 warning。
- Deck 不得因 legend 自动增长而改变 slide 尺寸。
- Report 可以增加 chart block 高度，但不得横向溢出。
- 暗色 Theme 下 legend 背景、文字和边框必须满足可读性要求。
- 单一类别时默认隐藏 legend；但若 legend 同时解释 size、symbol、quality 或其他非冗余编码，则不得隐藏。

### FR-5：基础 Mark Primitives

P0 marks：

```ts
type MarkType =
  | 'rect'
  | 'line'
  | 'area'
  | 'dot'
  | 'rule'
  | 'text'
  | 'cell'
```

`Channel` 使用 FR-1 定义的可序列化 channel contract。统一 channels：

```ts
interface MarkChannels {
  x?: Channel
  x1?: Channel
  x2?: Channel
  y?: Channel
  y1?: Channel
  y2?: Channel
  fill?: Channel
  stroke?: Channel
  opacity?: Channel
  radius?: Channel
  text?: Channel
}
```

Channel 约束：

- 位置 channel 的 `scale` 必须引用 scene 中存在的位置 scale，除非显式为 `null`。
- `fill`、`stroke`、`radius` 可以引用视觉 scale，也可以使用常量 `value`。
- 同一 channel 不允许同时声明 `field` 和 `value`。
- Missing value policy 必须由 chart recipe 显式给出；line 默认 `gap`，scatter 默认 `drop`，bar 不得在未声明时把 missing value 当作零。
- Channel 不承担 aggregate、calculate 或表达式执行。

每个可交互 mark 必须生成稳定的 Miao metadata：

- chart id。
- source field。
- source value。
- prepared row index 或稳定 datum id。
- tooltip label。
- series/category identity。

不得依赖 SVG 子节点顺序作为 interaction contract。

### FR-6：Chart Recipe

常规 chart type 应被编译为 marks、scales 和 guides 的确定性 recipe。

P0：

| Chart | Recipe |
|---|---|
| bar | rect + band x + linear y |
| line | line + point/time x + linear y |
| area | area + line + point/time x + linear y |
| scatter | dot + linear x/y |

P1：

| Chart | Recipe |
|---|---|
| histogram | data-layer bin result + rect + linear x/y |
| heatmap | cell + band x/y + sequential color |
| bubble | dot + linear x/y + sqrt radius |
| dot/lollipop | rule + dot |
| range | rule + endpoint dots |
| boxplot | rule + rect + median rule + optional outlier dots |
| grouped bar | rect + band/dodge positioning |
| stacked bar | rect + stack display positioning |
| diverging bar | rect + signed linear scale + zero rule |

要求：

- Recipe 定义由 renderer 所有，不写入 skill prose。
- Catalog 声明图表适用性、required encodings 和 fallback。
- Renderer capability 与 catalog 必须有一致性测试。
- 未迁移的 chart 继续走专用 renderer，不得降级为空图。

### FR-7：Display Transform 边界

数据语义变换继续由 `prepareChartData` 或既有数据层负责：

- derive。
- aggregate。
- filter。
- sort。
- limit。
- evidence-related computation。

Chart Engine 只允许显示级变换：

- stack positioning。
- dodge/group positioning。
- pixel sampling。
- label collision。
- jitter。

本 PRD 对 histogram bin 作出推荐决策：

- P1 histogram 的 bin 由数据层显式执行。
- 数据层输出 bin start、bin end、count/value、threshold strategy 和 source row count metadata。
- Validator 和 inspect 必须能读取这些 metadata。
- Chart Compiler 只消费 bin-ready rows 并生成 rect marks，不自行选择 thresholds。
- 自动 threshold 推荐可以由 analyzer/catalog 提供，但最终采用的策略必须在 prepared data metadata 中确定。

Rolling/window/normalize 等可能改变读者解释的变换同样优先留在数据层。未来如允许 compiler 执行，必须先建立可检查的 transform contract、validator 支持和 inspect 输出，不属于本 PRD P0–P1 默认范围。

不得出现 validator 验证的数据与最终绘制数据含义不一致的情况。

### FR-8：Facet Layout

Facet 必须在单一 chart scene 内完成布局，不能通过多个完整 SVG 的字符串拼接作为最终架构。

支持：

```ts
interface FacetDefinition {
  row?: Channel
  column?: Channel
  wrap?: number
  scales: 'shared' | 'free-x' | 'free-y' | 'independent'
  axes: 'shared' | 'each'
  maxPanels?: number
  panels: FacetPanel[]
}

interface FacetPanel {
  id: string
  rowValue?: SceneValue
  columnValue?: SceneValue
  datumIds: string[]
  bounds: Rect
  empty: boolean
}
```

要求：

- Shared scale 在所有 panels 上统一计算 domain。
- Independent scale 在 panel 范围内计算，并明确标记。
- 默认仅在最左列显示 y axis，最下行显示 x axis。
- 全图默认只生成一个 legend。
- 每个 panel 使用独立 clip region。
- Facet strip 有固定布局区域。
- 实际类别组合中无数据的 panel 默认不创建。
- 当 row/column 的显式 domain 形成空组合时，保留 panel 并显示 Theme-aware `No data`，不得绘制零值 marks。
- 单一 panel facet 自动退化为普通 chart，并隐藏冗余 facet strip；legend 是否隐藏继续按 FR-4 的“编码是否冗余”规则判断。
- 超过 `maxPanels` 时按已验证的 facet domain 顺序保留前 N 个 panel，同时在图内显示“另有 N 个 panel 未展示”，并返回 `FACET_PANEL_LIMIT_EXCEEDED` warning。
- `maxPanels` 截断不得改变 shared scale domain；domain 仍基于完整、过滤后的 facet 数据计算，避免被截断 panels 改变比较基准。
- Strict validation 可以在渲染前将超出 `maxPanels` 升级为 error。
- Panel 数量或尺寸不足时输出结构化 warning。

### FR-9：Reference、Annotation 与 Direct Label

Reference line、reference band、annotation 和 quality layer 应使用与主图相同的 scale 和 plot bounds。

要求：

- Reference 值继续来自常量、字段聚合或 evidence。
- Reference 值参与 scale domain 计算。
- Annotation selector 继续确定性执行。
- Annotation 优先级决定保留顺序。
- Annotation 不得覆盖 chart title、legend 或 axis label。
- 无法放置全部 annotation 时保留高优先级项并输出 warning。
- P1 支持 line-end label、bar value label 和 min/max/latest direct label。
- 静态 SVG 必须包含 annotation 文本，不能仅存在于 tooltip 中。

### FR-10：Chart Layout Engine

Chart layout 采用测量与分配两阶段：

```text
measure title / axes / ticks / legend / facet strips / annotations
  → resolve chart insets
  → allocate plot bounds
  → render guides and marks
```

Report preset：

- 允许 chart block 根据 legend、facet 和 label 增加高度。
- SVG 保持 viewBox 和 max-width 响应式行为。
- 窄屏应用固定的 label/legend 降级策略。

Deck preset：

- 固定 chart 外框尺寸。
- 固定最小字体。
- 限制 axis tick 和 legend 占用空间。
- 不允许图表改变 slide 尺寸。
- 超出空间时按以下顺序确定性降级：
  1. 降低非端点 tick 密度，但保留零点、端点和 reference 对应 tick。
  2. Legend 换列或缩短 label，保留完整值于 `<title>`/`<desc>`。
  3. 截断 nominal axis label，并在可访问描述中保留完整文本。
  4. 隐藏重复 axis title、单类别 legend 等冗余 guides。
  5. 移除低优先级 direct labels，再移除低优先级 annotations，并分别产生 diagnostic。
  6. 对 catalog 明确允许的 chart 使用已声明 fallback，例如 vertical bar → horizontal bar；不得自行改变分析语义。
  7. 仍无法满足最小 plot bounds 时返回 `LAYOUT_UNRESOLVED`。
- 降级过程中不得裁切数据 marks、reference、关键 annotation，不得把字号降到 Theme 最小字号以下。
- 非 strict 模式遇到 `LAYOUT_UNRESOLVED` 时渲染安全 fallback：保留 title、简短原因和可访问的数据摘要，不输出可能误导的残缺 chart。
- Strict/verify 模式将 `LAYOUT_UNRESOLVED` 视为 error，要求 Agent 调整 chart、facet、legend 或 slide layout。

### FR-11：Theme Chart Tokens

保持现有 `SvgTheme` 可继续被旧 renderer 使用，并为新引擎增加内部 ChartTheme。

建议 token：

```ts
interface ChartTheme {
  colors: {
    categorical: string[]
    sequential: string[]
    diverging: string[]
    positive: string
    negative: string
    neutral: string
    warning: string
  }
  typography: {
    fontFamily: string
    cjkFontFamily: string
    numericFontFamily?: string
    fontSize: number
    minFontSize: number
    axisFontSize: number
    legendFontSize: number
    annotationFontSize: number
  }
  axis: {
    color: string
    width: number
    tickColor: string
    tickSize: number
    labelColor: string
  }
  grid: {
    color: string
    opacity: number
    dash?: string
  }
  marks: {
    opacity: number
    lineWidth: number
    pointRadius: number
    barRadius: number
    contextOpacity: number
  }
  layout: {
    plotPadding: number
    axisGap: number
    legendGap: number
    facetGap: number
  }
}
```

七套 Theme 都必须提供完整映射：

- `standard-white`
- `standard-dark`
- `magazine`
- `minimal`
- `nyt`
- `bloomberg`
- `tableau`

Theme 差异至少覆盖：

- categorical/sequential/diverging colors。
- 字体家族与数字字体。
- axis/grid 强度。
- mark opacity、line width、point radius 和 bar radius。
- legend 密度。
- annotation 样式。
- plot padding 与 facet gap。

Theme accessibility 要求：

- Categorical palette 必须优先使用色盲安全组合；不能仅以红/绿区分正负、状态或系列。
- 重要状态至少同时使用文字、形状、线型或明度中的一种冗余编码。
- 普通文本、关键 axis label 和 annotation 的目标对比度不低于 4.5:1；大字号文本不低于 3:1。
- 非文本图形和关键 guide 与相邻背景的目标对比度不低于 3:1。
- Theme validator 或视觉审计必须覆盖 light/dark palette 的对比度。
- Serializer 必须为每张 SVG 输出 `<title>` 和 `<desc>`；交互图还需保持可聚焦元素的可理解标签。

### FR-12：静态与交互一致性

共享核心必须：

- 使用纯 TypeScript。
- 不依赖 Node-only API。
- 不依赖 DOM 才能计算 scale、layout 和 SVG。
- 可以分别打包进 CLI 和浏览器 runtime。

迁移按图表类型进行：

1. 静态 compiler/renderer 成为该 chart 的单一实现。
2. 浏览器 runtime 复用相同 scale、recipe、formatter 和 serializer。
3. Filters 只改变输入 prepared rows。
4. Renderer 整体重绘 chart scene。
5. Selection state 通过稳定 mark metadata 恢复。

交互 runtime 不得维护第二套 bar/line/scatter scale 和 axis 算法。

### FR-13：结构化诊断与 Inspect

Compiler 应产生结构化 diagnostics：

```ts
interface ChartDiagnostic {
  code: string
  severity: 'info' | 'warning' | 'error'
  message: string
  chartId?: string
  path?: string
  detail?: Record<string, unknown>
  patchHint?: object
}
```

首批诊断：

- `EMPTY_SCALE_DOMAIN`
- `DEGENERATE_SCALE_DOMAIN`
- `INVALID_LOG_DOMAIN`
- `AXIS_LABEL_OVERFLOW`
- `LEGEND_OVERFLOW`
- `TOO_MANY_LEGEND_ITEMS`
- `FACET_PANEL_TOO_SMALL`
- `FACET_PANEL_LIMIT_EXCEEDED`
- `ANNOTATION_DROPPED`
- `MARK_OUTSIDE_PLOT`
- `UNSUPPORTED_RENDERER_FEATURE`

应能通过现有或新增 inspect 路径查看：

```json
{
  "chartId": "revenue_by_region",
  "renderer": "miao-chart-engine",
  "scales": {
    "x": {
      "type": "band",
      "domain": ["East", "North", "South", "West"]
    },
    "y": {
      "type": "linear",
      "domain": [0, 125000],
      "niceDomain": [0, 140000]
    }
  },
  "layout": {
    "width": 720,
    "height": 420,
    "plot": { "x": 72, "y": 24, "width": 620, "height": 340 }
  },
  "diagnostics": []
}
```

是否新增命令、扩展现有 inspect，属于实现设计决策；PRD 只要求存在机器可读诊断入口。

## 11. 兼容性要求

### 11.1 Spec 兼容

- 现有合法 Spec 无需修改。
- 不指定新 guide/format 字段时使用兼容默认值。
- 不支持的新字段必须由 schema 明确拒绝，不能静默丢弃。
- Theme alias 行为保持现状。

### 11.2 视觉兼容

迁移允许出现视觉优化，不要求旧 SVG 像素级兼容，但必须保持：

- 指标值与排序。
- stack/group 语义。
- category color 稳定性。
- tooltip 和 selection metadata。
- reference 和 annotation 含义。
- title、caption、source 和 evidence 信息。

重大视觉变化必须更新视觉基线并在变更说明中明确记录。

### 11.3 专用 Renderer 兼容

以下类型可以长期保留专用 renderer：

- `table`
- `pivot`
- `bigvalue`
- `progress`
- `delta`
- `gauge`
- `funnel`
- `radar`
- `sankey`
- `treemap`
- `waterfall`
- infographic 系列

保留专用 renderer 不视为架构失败。专用 renderer 应尽可能消费共享 Theme tokens、formatters 和 SVG primitives。

## 12. CLI 与用户体验

默认用户工作流不变化：

```bash
npm run miao-viz -- data analyze ./sales.csv \
  --intent "monthly trend and regional comparison" \
  --output /tmp/miao-vision/context.json

npm run miao-viz -- spec validate \
  --spec /tmp/miao-vision/report.yaml \
  --profile /tmp/miao-vision/profile.json \
  --context /tmp/miao-vision/context.json \
  --verify

npm run miao-viz -- render report \
  --input ./sales.csv \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/report.html
```

本项目不要求用户选择 renderer。迁移期间如需要实验开关，应仅用于开发和 fixture 对比，不作为长期公开产品选项。

用户可见变化：

- 坐标轴、刻度和格式更一致。
- 图例更完整并能处理连续色阶。
- long label、facet 和窄画布更稳定。
- Theme 的图表风格差异更明显。
- 出现不可读风险时获得结构化 warning。

## 13. 验收标准

### AC-1：P0 图表迁移

- bar、line、area、scatter 全部通过新 compiler 和共享 scale/axis engine 渲染。
- 四种图表不再拥有独立的 tick/domain/legend 实现。
- 现有基础 fixture 的数据值、顺序和颜色语义不变。
- SVG 中不存在 `NaN`、`Infinity` 或非法尺寸。

### AC-2：Scale 与 Axis

- Linear、band、point、ordinal、time scale 有独立单元测试。
- 空值、单值、全负值、跨零值、极端值都有 fixture。
- Currency、percent、compact number 和 date 格式在 Report/Deck 中一致。
- 长 label 会执行可预测降级并产生诊断。
- CJK、Latin、数字和混排 label 的测量、baseline、截断及旋转具有视觉回归。

### AC-3：Legend

- Category legend 与 mark color 使用同一 scale。
- 多 series bar/line 的颜色和 legend 顺序稳定。
- 暗色 Theme 的 legend 可读。
- Legend overflow 不会破坏 Deck 尺寸或 Report 横向布局。

### AC-4：Facet

- Shared scale facet 使用同一 domain。
- Independent scale facet 明确标识并分别计算。
- 默认仅在外侧 panel 显示公共 axes。
- 只生成一个共享 legend。
- Panel 过多或过小产生结构化 warning。

### AC-5：Theme

- 七套 Theme 都通过 bar、line、scatter、heatmap、facet 的视觉回归。
- 每套 Theme 至少在 palette、字体、axis/grid、marks 和 spacing 上有可验证差异。
- Theme 不含散落在 chart recipe 中的硬编码品牌色。
- 七套 Theme 均提供本地 CJK fallback font stack。
- 核心文字、guide 和状态颜色达到 FR-11 的目标对比度。
- 色盲 fixture 中的关键系列或状态不只依赖颜色区分。

### AC-6：Report 与 Deck

- 相同 Spec 和数据产生相同 domain、series 和 category color。
- Deck 固定尺寸内无关键 label 被裁切。
- Report 在常用窄屏宽度下无横向页面溢出。
- 浏览器打印/PDF 保留 axis、legend、annotations 和 references。
- 每张统计图 SVG 包含非空 `<title>` 和 `<desc>`。

### AC-7：交互

- 迁移后的交互图表使用与静态渲染相同的 recipe 和 formatter。
- Filter 后整体重绘不改变 category color identity。
- Selection 与 detail 通过稳定 mark metadata 工作。
- 无交互配置时不注入不必要的浏览器 runtime。

### AC-8：回归与质量

- `npm run test:run` 通过。
- `npm run build:cli` 通过。
- `npm run check:size` 通过。
- Deck/browser 行为变化阶段执行 `npm run test:e2e`。
- Report workflow smoke test覆盖：

```text
data analyze
  → spec block instantiate 或 spec authoring
  → spec validate --context --verify
  → render report
```

## 14. 测试策略

### 14.1 结构测试

验证：

- Scale type、domain 和 range。
- Tick values 和 formatted labels。
- Mark count、series 和 geometry bounds。
- Legend items 和顺序。
- Facet panels 和 shared domain。
- Annotation selector 和最终 anchor。

### 14.2 不变量测试

所有新 renderer 必须满足：

- 不输出 `NaN` 或 `Infinity`。
- Plot bounds 宽高大于零。
- Mark 位于 plot 或合法 overflow 区域。
- 同 category 在同一 artifact 中颜色稳定。
- Legend identity 与 mark identity 一致。
- Shared facet domain 一致。
- Theme 最小字号不被突破。

### 14.3 视觉回归

每个 P0/P1 chart 至少覆盖：

- `standard-white`
- `standard-dark`
- `magazine`
- `nyt`
- `bloomberg`
- `tableau`
- `minimal`
- Report 默认宽度。
- Report 窄屏。
- Deck 540×400。
- Deck 1100×310。
- Deck 1100×460。

可以选择代表性组合减少快照数量，但七套 Theme 与三类画布必须在基准集中完整出现。

### 14.4 Workflow 回归

验证最终 artifact：

- self-contained。
- 无远程字体、脚本、CSS 或数据请求。
- 浏览器打开无异常。
- 打印/PDF 不缺失 marks、axes、legends 或 annotations。
- 交互关闭时核心信息仍完整。

## 15. 分阶段交付

### Milestone 0：基线与契约

- 建立现有 bar/line/area/scatter fixture。
- 记录当前 Spec、mark metadata 和 Theme 行为。
- 将 FR-1 Draft v0 细化为完整、可编译的 `ChartScene`、`Channel`、`ScaleDefinition`、`AxisDefinition`、`LegendDefinition`、`MarkDefinition`、facet、accessibility 和 diagnostics TypeScript contract。
- 提供至少一个 bar 和一个 line 的完整 Scene JSON fixture。
- 定义 Scene version 与兼容策略。
- 明确数据变换与 display transform 边界。
- 测量当前静态和交互 renderer 的性能、bundle/HTML 体积与代表性 SVG 大小。
- 锁定视觉回归方案：SVG 结构/语义断言与浏览器像素截图组合使用，并定义 baseline 更新流程。
- 确认保留兼容 `SvgTheme`、新增内部 `ChartTheme` 的迁移方式。

退出条件：

- 完整 TypeScript Scene contract 和两个 JSON fixtures 通过架构评审。
- Channel 的 field/value、scale binding、missing policy 和 datum identity 已锁定。
- Histogram bin 采用数据层 bin-ready contract。
- 当前性能与体积基线已记录，新引擎预算已据此锁定。
- 视觉回归工具链和 baseline 更新规则已锁定。
- `SvgTheme → ChartTheme` 兼容策略已锁定。
- 至少一个 chart 可在旧、新 renderer 间对照。
- 未修改公开 Spec。

### Milestone 1：Scale、Axis 与 Formatter

- 实现 linear、band、point、ordinal、time scale。
- 实现 tick generator 和 formatter。
- 实现 axis layout 与 label overflow diagnostics。
- 扩展 Theme chart tokens。

退出条件：

- Scale/axis 独立测试通过。
- 七套 Theme token 完整。
- 不依赖任一具体 chart renderer。

### Milestone 2：P0 Marks 与核心图表

- 实现 rect、line、area、dot、rule、text、cell。
- 迁移 bar、line、area、scatter。
- 实现 categorical legend。
- 接入 Report 与 Deck。

退出条件：

- AC-1、AC-2、AC-3 和基础 AC-6 通过。
- 旧 renderer 可在确认基线后逐个退役。

### Milestone 3：Facet、Reference 与 Annotation

- 实现 facet grid。
- 接入 reference line/band。
- 接入 annotation 和 quality layer。
- 实现 auto margin 与基础 collision。

退出条件：

- Shared/independent facet fixture 通过。
- Layer 与主图共用 scale。
- 无 SVG 字符串后置坐标猜测。

### Milestone 4：P1 图表与颜色尺度

- 增加 sequential、diverging、sqrt、log、symlog scale。
- 增加 ramp、size、symbol legend。
- 迁移 histogram、heatmap、bubble、dot、range、boxplot。
- 完善 grouped/stacked/diverging bar。

退出条件：

- P1 图表均通过 catalog、validator、renderer 和视觉回归。
- 不适用数据有明确 fallback 或 warning。

### Milestone 5：交互核心统一

- 将共享 compiler/renderer 打包到浏览器 runtime。
- 移除 bar/line/scatter 的重复浏览器算法。
- 验证 filter、selection、detail 和 reset。

退出条件：

- 静态与交互核心 fixture 语义一致。
- 自包含 HTML 体积和性能在预算内。

## 16. 性能与体积预算

当前仓库尚无统一的 chart compiler/render、交互重绘和 bundle 体积基线，因此下表只能作为 **placeholder，不是已批准的验收门槛**。Milestone 0 必须在同一台基准环境、同一 fixture 和固定重复次数下记录当前 p50/p95，之后以相对退化上限和用户体验目标共同锁定正式预算。

| 项目 | Placeholder |
|---|---:|
| 单 chart compiler + SVG render，1k prepared rows | ≤ 20 ms |
| 10-chart report 静态渲染，常规 fixture | ≤ 300 ms |
| 8-panel facet，常规 fixture | ≤ 100 ms |
| 交互 filter 后单 chart 重绘 | ≤ 50 ms |
| 新共享浏览器 renderer gzip 增量 | ≤ 40 KB |
| 无交互 report 的 JS 体积增量 | 0 KB |

Milestone 0 基线报告至少包含：

- Node/OS/CPU 和运行时版本。
- Fixture 行数、字段数、series 数和 facet panel 数。
- 冷启动、warm p50 和 warm p95。
- 当前 CLI bundle、交互 runtime gzip、代表性 report HTML 和 SVG 大小。
- 旧 renderer 与首个新 renderer 的相对差异。

性能规则：

- Scatter 等高密度 chart 保持确定性 sampling 上限。
- 不通过删减关键信息满足性能指标。
- 性能不足优先优化共享 scale/layout，不能为不同 chart 复制快速路径造成再次分叉。

## 17. 风险与缓解

### 风险 1：项目演变为通用图形语法

影响：范围失控，长期维护成本接近重造完整第三方库。

缓解：

- 只实现 catalog 已支持且 Report/Deck 需要的 primitives。
- 不公开任意 marks spec。
- 新 scale/mark 必须由明确用户场景和至少两个消费者驱动。

### 风险 2：迁移期间视觉回归过多

影响：用户熟悉的报告布局发生不可控变化。

缓解：

- 按 chart type 渐进迁移。
- 先固化数据语义和 mark metadata，再评审视觉变化。
- 重大变化更新 baseline 时必须附 before/after。

### 风险 3：Theme token 过度复杂

影响：七套 Theme 维护成本成倍增加。

缓解：

- 定义完整默认 ChartTheme。
- 各 Theme 只 override 有辨识度的 token。
- 禁止 chart recipe 内硬编码主题色和字体。

### 风险 4：布局算法投入过大

影响：自动 label/annotation 布局成为无限问题。

缓解：

- 使用固定候选位置和矩形碰撞。
- 明确丢弃低优先级 annotation 的策略。
- 输出 diagnostics，不承诺所有输入都能完美布局。

### 风险 5：数据层与显示层职责再次混淆

影响：验证内容与最终图表含义不一致。

缓解：

- Compiler 输出完整 transform diagnostics。
- 业务 transform 继续由数据层所有。
- 对 bin/normalize/window 建立显式审计规则。

### 风险 6：静态与交互仍然分叉

影响：同一 Spec 首屏和 filter 后显示不同。

缓解：

- 共享核心必须无 Node/DOM 依赖。
- 浏览器只负责状态、过滤和重新调用同一 compiler。
- 静态/交互使用同一 fixture 做语义对比。

### 风险 7：文件规模违反仓库约束

影响：单文件超过 500 行，后续难以维护。

缓解：

- 按 scale、guide、mark、layout、compiler、serializer 分模块。
- 新文件接近 400 行时主动拆分。
- 每个 milestone 执行 `npm run check:size`。

## 18. 依赖与约束

- 不新增远程运行时依赖。
- 不要求 DOM、Canvas 或 JSDOM 完成静态 SVG 渲染。
- 可以评估使用小型、纯算法依赖，但必须单独评审许可证、bundle、确定性和自维护成本；本 PRD 不默认批准引入。
- 继续支持 Node.js 20。
- 保持 CLI 的 self-contained artifact 输出。
- 不修改 `packages/miao-viz-cli/dist/` 或 `apps/web/dist/` 作为源文件。
- Renderer 行为变化必须覆盖完整 report workflow smoke test。

## 19. 决策记录

本 PRD 已作出的产品决策：

1. 不引入 Observable Plot 作为 Miao Vision 的核心 renderer。
2. 构建面向 Report/Deck 的紧凑型统计图内核，而不是通用 chart grammar。
3. 保持 `AgentChartSpec` 为 Agent-facing contract。
4. Scene/marks 仅为内部 contract。
5. 静态 SVG 和 self-contained HTML 仍是默认产物。
6. 常规统计图迁入共享内核，专用图允许长期保留专用 renderer。
7. Report 与 Deck 共享数据语义和 compiler，但保留不同 layout preset。
8. Theme 扩展为 chart design tokens，并保持旧 `SvgTheme` 向后兼容。
9. 交互运行时最终复用共享核心，不长期维护第二套 chart algorithms。
10. Histogram bin 由数据层执行并产生结构化 bin metadata；Chart Compiler 只消费 bin-ready rows。
11. 视觉回归同时使用 SVG 结构/语义断言和浏览器像素截图。
12. 内部新增 `ChartTheme`，通过兼容转换继续服务旧 `SvgTheme` renderer；不直接把全部新 token 塞入旧接口。
13. Deck 布局无法安全降级时输出 `LAYOUT_UNRESOLVED`，不裁切数据 marks 或突破最小字号。

## 20. 待评审问题

### 20.1 M0 前必须锁定

1. FR-1 Draft v0 中 Scene data、compiled mark geometry 和 serializer 的最终边界是否合理？
2. 内部新增 `ChartTheme` 并保留 `SvgTheme` 兼容层的方案是否批准？
3. SVG 结构/语义断言 + 浏览器像素截图的双层视觉回归方案是否批准？
4. Deck 的确定性降级顺序、`LAYOUT_UNRESOLVED` 和 safe fallback 是否批准？

其中 histogram bin 归属已在 FR-7 决策为数据层，不再作为开放问题。

### 20.2 M1 前锁定

5. 是否需要公开少量 axis/legend 配置，还是首版全部由 Theme 和 renderer 自动决定？
6. Renderer diagnostics 应扩展现有 `inspect`，还是增加独立 `spec compile/inspect chart` 路径？
7. 是否为 Deck 锁定全局最小字号、最小 plot bounds 和最大 legend 占比？具体数值由 M0 fixture 测量决定。

### 20.3 后续里程碑锁定

8. 内部能力正式名称使用 `Miao Chart Engine`，还是更贴近现有代码的 `Miao SVG Engine`？
9. P0 是否应包含 facet，还是按当前计划放在独立 Milestone 3？
10. 是否将 browser runtime 统一列为本项目验收项，还是单独建立后续实施 PRD？
11. 是否允许同一 artifact 中专用 renderer 与新引擎存在轻微 axis/legend 风格差异，过渡期持续多久？

## 21. 建议评审顺序

建议按以下顺序评审，避免过早进入实现细节：

1. 确认产品边界：紧凑型统计图内核，而非通用图形语法。
2. 确认 P0 图表范围：bar、line、area、scatter。
3. 确认公开 Spec 保持稳定。
4. 确认 Scene IR、scale/axis/legend/mark 的职责边界。
5. 确认 Theme token 方向。
6. 确认 Report/Deck 与静态/交互的一致性要求。
7. 确认成功指标、性能预算和 visual regression 方法。
8. 最后拆分 implementation plan 和工程任务。
