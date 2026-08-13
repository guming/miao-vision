# Deck Markdown 与意图驱动生成 PRD

> 日期：2026-08-13
> 状态：方案草案
> 关联：`docs/deck-knowledge-pack-prd.md`、`docs/evidence-grounded-visualization-generation.md`、`skills/miao-vision/references/deck.md`

## 1. 一句话说明

将 Miao Vision Deck 从“结构化数据的演示视图”扩展为“面向汇报目标的内容编排器”：既支持 CSV、TSV、XLSX、JSON 等结构化数据，也支持本地 Markdown/TXT 叙事材料，并允许两者组合生成具有明确受众、目标、故事线和来源追踪的 browser deck。

## 2. 背景与问题

当前 Deck 的可信生成链路主要面向结构化数据：

```text
data analyze
  -> AnalyzeContext
  -> deck instantiate
  -> DeckSpec
  -> deck validate
  -> render deck
```

这条链路已经能够约束数据 claim、evidence、provenance、趋势周期和数据质量 caveat，但存在三个产品缺口：

1. 用户经常提供方案、项目材料、会议纪要、研究笔记或文章，而不是数据文件。
2. 现有 `intent` 只有 `executive-brief` 和 `business-review`，表达的是模板类别，不能完整描述受众、目标、场合、时长和语气。
3. Markdown 不能安全地伪装成表格数据；原文观点、引用数字和经过数据验证的事实具有不同可信等级。

如果直接按 Markdown 标题分页，生成结果会退化成“自动分页器”，而不是围绕用户目标组织的演示文稿。因此必须保留 Deck Plan 作为内容理解与页面渲染之间的显式中间层。

## 3. 产品定位

首期支持三类 Deck：

| 类型 | 输入 | 典型用途 |
|---|---|---|
| Narrative Deck | Markdown / TXT | 方案汇报、项目介绍、知识分享、会议材料 |
| Data Deck | CSV / TSV / XLSX / JSON | 经营复盘、指标分析、管理简报 |
| Hybrid Deck | Markdown / TXT + 结构化数据 | 叙事材料提供背景和观点，数据提供指标、图表与事实验证 |

职责边界：

- Markdown 负责表达“用户想讲什么”。
- 数据文件负责证明“哪些结论可以被校验”。
- 用户意图负责说明“对谁讲、为什么讲、讲到什么程度”。
- Deck Plan 负责故事线、页面角色、信息取舍和来源选择。
- DeckSpec 负责最终页面内容和布局，不承担原始材料理解。
- Renderer 保持确定性，不调用模型、不联网、不重新解释原始内容。

## 4. 目标

1. Markdown/TXT 可以独立生成无需数据文件的 HTML/PDF browser deck。
2. Markdown 与结构化数据可以组合生成 Hybrid Deck。
3. 用户的自然语言请求可以结构化为受众、目标、场合、长度和语气。
4. Markdown 原文、作者观点和数据验证事实具有明确、不同的来源状态。
5. Deck Plan 成为所有新生成链路的必经中间契约。
6. 现有 Data Deck 命令、DeckSpec 和 fixtures 保持兼容。
7. CLI 继续保持 local-first、无后端、无数据上传、无必需 API key。
8. 验证器继续返回机器可读的 `ok/value`、结构化错误路径和 repair hint。

## 5. 非目标

- 不提供 PowerPoint 或 Keynote 原生编辑和导出。
- 不在 CLI 或 Renderer 中内置模型调用。
- 不把 Markdown 表格自动推断为分析数据集。
- 不自动下载远程图片或网页资源。
- 不从普通 Markdown 观点推导因果、预测、预算或经营决策。
- 不合并 article、report 和 deck 的最终 Spec。
- 不在 Web App 中实现内容分析、Deck Plan 或生成逻辑。
- 首期不支持复杂动画、拖拽排版、演讲者备注和在线协作。

## 6. 核心原则

本文使用以下规范词：

- **MUST**：违反时契约不成立、结果不可信或破坏兼容性。
- **SHOULD**：默认遵守；偏离时必须给出明确理由。
- **MAY**：可选能力，不影响基础契约成立。

### 6.1 Narrative 与 evidence 分离

Markdown 是叙事来源，不等同于经过校验的数据 evidence。系统必须区分：

| 状态 | 含义 | 是否可称为系统验证 |
|---|---|---|
| `source-text` | 对原文的忠实引用或复述 | 否 |
| `author-claim` | 原文作者提出的判断、观点或数字 | 否 |
| `verified-claim` | 可由结构化数据 evidence 校验的事实 | 是 |

Markdown 中出现的数字、排名、变化率、预测或评价默认不得标记为 `verified-claim`。

### 6.2 Deck Plan 必须存在

新链路不得从 Markdown 直接生成 DeckSpec。必须先形成 Deck Plan，明确：

- audience；
- objective；
- primary question；
- story arc；
- slide outline；
- source strategy；
- unsupported claims；
- assumptions。

### 6.3 复用 AnalyzeContext

Hybrid Deck 不创建第二套数据分析和 evidence 引擎。现有 `AnalyzeContext` 原样嵌入 DeckContext，继续作为数据事实、metric candidate、chart catalog 和 sample warning 的唯一来源。

### 6.4 Agent 理解，CLI 约束

Agent 负责理解任意自然语言意图、选择 pattern、编辑文案和判断故事线。CLI 负责：

- 确定性提取 Markdown 结构；
- 输出紧凑上下文；
- 提供可用 pattern 和 slide block catalog；
- 实例化确定性 DeckSpec 候选；
- 校验来源、证据、字段、内容密度和布局；
- 渲染 self-contained HTML/PDF。

CLI 不应假装仅靠启发式规则就能理解任意汇报意图。

## 7. 总体架构

```text
Markdown/TXT -> Content Analyzer ----┐
                                     │
Structured data -> Data Analyze -----+-> DeckContext
                                     │       │
User request -> Intent Resolver -----┘       v
                                         Deck Planner
                                              │
                                              v
                                           DeckPlan
                                              │
                                      instantiate / edit
                                              │
                                              v
                                           DeckSpec
                                              │
                                     validate -> render
```

不存在数据文件时，Deck renderer 使用空 rows 渲染 narrative layouts，并跳过只适用于图表、指标和字段编码的校验。存在数据文件时，原有字段验证和 grounding 验证继续执行。

## 8. DeckContext 契约

新增 Deck 专用编排上下文，但不取代 `AnalyzeContext`：

```ts
interface DeckContext {
  version: 1
  request: DeckRequest
  sources: DeckSource[]
  narrative?: NarrativeContext
  data?: AnalyzeContext
  planning: DeckPlanningContext
}

interface DeckRequest {
  rawIntent: string
  audience?: string
  objective?: string
  occasion?: string
  durationMinutes?: number
  desiredLength?: 'short' | 'medium' | 'long'
  tone?: string
}

type DeckSource = NarrativeSource | DataSource

interface NarrativeSource {
  id: string
  kind: 'markdown' | 'text'
  path: string
  title?: string
}

interface DataSource {
  id: string
  kind: 'data'
  path: string
}

interface NarrativeContext {
  title?: string
  summary?: string
  sections: ContentSection[]
  keyPoints: ContentPoint[]
  quotes: ContentPoint[]
  explicitClaims: ContentClaim[]
  images: ContentImageRef[]
}

interface ContentSection {
  id: string
  heading?: string
  level: number
  paragraphIds: string[]
  listItemIds: string[]
}

interface ContentPoint {
  id: string
  sourceId: string
  sectionId?: string
  kind: 'paragraph' | 'list-item' | 'quote'
  text: string
}

interface ContentClaim {
  id: string
  sourceId: string
  sectionId?: string
  pointId: string
  text: string
  status: 'author-claim'
  signals: Array<'numeric' | 'rank' | 'change' | 'evaluation' | 'causal' | 'predictive'>
}

interface ContentImageRef {
  id: string
  sourceId: string
  sectionId?: string
  alt?: string
  target: string
  kind: 'local' | 'remote'
}

interface DeckPlanningContext {
  recommendedPatterns: DeckPatternCandidate[]
  blockedPatterns: BlockedCandidate[]
}
```

要求：

- `version` 必须存在，便于未来 schema 演进。
- `sources[].path` 用于本地追踪，不嵌入源文件全文。
- `data` 是唯一的分析上下文表示；`DataSource` 只记录数据来源身份和路径，不再维护第二个 context ref。
- Markdown source id MUST 按规范化后的相对来源路径生成 `src:<sha256-prefix>`，其中 prefix 是 SHA-256 的前 8 位小写十六进制字符；section、paragraph、list item、quote 和 image 分别使用 `<sourceId>:sec:<n>`、`<sourceId>:p:<n>`、`<sourceId>:li:<n>`、`<sourceId>:q:<n>`、`<sourceId>:img:<n>`。序号按规范化文档顺序从 1 开始。
- 仅修改某个内容节点之后的文档可能改变后续位置 id；source ref 稳定性的承诺范围是同一输入内容重复分析结果一致，不承诺跨编辑永久稳定。
- `data` 必须直接使用合法的 `AnalyzeContext`，不得复制或改写其中的 evidence。
- compact codec 后续可以增加，但完整 DeckContext 是首要公共契约。

## 9. Markdown Content Analyzer

### 9.1 支持范围

首期支持 `.md`、`.markdown` 和 `.txt`，确定性提取：

- frontmatter 中的标题、作者、日期、受众等显式元数据；
- 标题层级和章节；
- 普通段落；
- 有序和无序列表；
- blockquote；
- Markdown 表格；
- 本地和远程图片引用；
- 显式数字与事实陈述候选。

### 9.2 复用策略

应从现有 article Markdown 分析能力中抽出共享的文档结构层，避免 Deck 和 Article 各自维护一套 frontmatter、标题、段落和列表解析逻辑。

共享层只输出中性的 document AST/context；Article 与 Deck 分别完成自己的语义适配。不得让 Deck 依赖 article renderer 或 infographic spec。

### 9.3 内容安全规则

- Markdown 表格默认作为静态内容表格，不进入 `loadDataset()`。
- 图片引用只记录，不自动下载。
- 远程图片必须产生未冻结资源 warning。
- 引用必须能回溯到原始 section/paragraph。
- 摘要允许改写，但必须保留 source refs。
- analyzer 不生成新的策略建议、因果判断或预测。

## 10. 意图模型与 Deck Pattern

现有 `DeckIntent` 同时承担用户意图和模板标识，扩展性不足。新设计拆成两层：

1. `DeckRequest`：用户意图的结构化描述。
2. `DeckPattern`：CLI 能确定性实例化的演示模式。

首批 pattern：

| Pattern | 适用场景 | 默认结构 |
|---|---|---|
| `executive-brief` | 管理层快速同步 | 结论 -> 依据 -> 风险 -> 下一步 |
| `business-review` | 周期经营复盘 | 摘要 -> KPI -> 趋势 -> 分组 -> 风险 |
| `topic-explainer` | 解释概念或材料 | 问题 -> 核心概念 -> 展开 -> 示例 -> 总结 |
| `project-update` | 项目进展汇报 | 目标 -> 当前状态 -> 已完成 -> 风险 -> 下一步 |
| `proposal` | 方案陈述与决策请求 | 问题 -> 洞察 -> 方案 -> 影响 -> 决策请求 |

Pattern registry 必须声明：

- 支持的 source kind；
- 默认页数和角色顺序；
- 必需与可选 slide roles；
- 适用条件；
- 阻断条件；
- 可使用的 narrative/data blocks。

不要预先增加没有真实 fixtures 支撑的 pattern。

### 10.1 Narrative block catalog

Phase 1 MUST 扩展现有 `DECK_SLIDE_BLOCKS`，而不是建立互不相干的第二个 registry。公共 block id 联合类型首期包含：

| Block id | Source | Layout | 用途 |
|---|---|---|---|
| `cover-claim` | data/hybrid | `cover` | 已验证结论或主问题 |
| `kpi-snapshot` | data/hybrid | `metrics-chart` | 指标快照 |
| `trend-overview-slide` | data/hybrid | `chart-full` | 三期以上趋势 |
| `ranking-slide` | data/hybrid | `chart-full` / `text-chart` | 分组排名 |
| `data-quality-slide` | data/hybrid | `text-points` | 数据限制 |
| `narrative-cover` | narrative/hybrid | `cover` | 主题、范围与汇报目标 |
| `section-summary` | narrative/hybrid | `section-summary` | 一个章节的摘要和要点 |
| `quote-focus` | narrative/hybrid | `quote-focus` | 单一引用及来源 |
| `text-comparison` | narrative/hybrid | `comparison-text` | 两组观点或方案对比 |
| `decision-request` | narrative/hybrid | `decision` | 决策请求、依据和限制 |
| `narrative-ending` | narrative/hybrid | `ending` | 总结或下一步 |

Block knowledge MUST 新增 `supportedSources`，并把数据专用的 `requiredRoles`、`requiredEvidence` 与叙事专用的 `requiredContent` 作为互斥或可组合约束。三个新 pattern 必须在 registry 中明确映射到上述 block id，不能直接映射任意 layout 字符串。

## 11. Deck Plan 扩展

本 PRD **扩展而不替换** 已发布的 `deck-plan-schema.ts`。现有 `intent`、`mainClaim`、`blockedClaims`、`assumptions`、`warningRefs` 和五个 data block role 保持合法；不执行 `blockedClaims -> unsupportedClaims` 重命名。

`slideOutline[].role` 当前是五值 `z.enum`。Phase 1 MUST 将它扩展为包含 §10.1 所有 block id 的联合 enum。这是 schema 接受范围的向后兼容扩展，不删除或改写旧值。新增 narrative 字段均为 optional；由新 narrative/hybrid pattern 生成的计划再通过按 pattern 的语义验证要求这些字段。

扩展后的 Deck Plan 示例：

```yaml
deckPlan:
  intent: project-update
  audience: executives
  objective: obtain alignment on next-quarter priorities
  primaryQuestion: What has progressed and what needs a decision?
  sourceStrategy:
    narrative: primary
    data: supporting
  storyArc:
    opening: Establish the project goal
    development: Show progress and evidence
    resolution: Surface risks and request decisions
  slideOutline:
    - role: narrative-cover
      purpose: Establish the project goal and reporting scope.
      sourceRefs: [src:8f41c2d0:sec:1]
      contentMode: summarize
      claimStatus: source-text
      speakerGoal: The audience understands the project goal and scope.
    - role: section-summary
      purpose: Summarize the current project status.
      sourceRefs: [src:8f41c2d0:sec:2]
      contentMode: summarize
      claimStatus: author-claim
      speakerGoal: The audience understands the reported current state.
    - role: kpi-snapshot
      purpose: Show verified business impact.
      evidence: [total]
      contentMode: evidence
      claimStatus: verified-claim
      speakerGoal: The audience sees the measured business impact.
    - role: section-summary
      purpose: Surface unresolved risks.
      sourceRefs: [src:8f41c2d0:sec:3]
      contentMode: explain
      claimStatus: author-claim
      speakerGoal: The audience understands the stated risks and limitations.
    - role: decision-request
      purpose: Ask for an explicit decision.
      sourceRefs: [src:8f41c2d0:sec:4]
      contentMode: recommend
      claimStatus: author-claim
      speakerGoal: The audience can make the requested decision.
  blockedClaims: []
  assumptions: []
```

新 narrative/hybrid pattern 的每个 slide outline 项 MUST 声明：

- `role`；
- `purpose`；
- 至少一个 `sourceRefs` 或 `evidence`，封面和纯结构过渡页除外；
- `contentMode`：`quote`、`summarize`、`explain`、`compare`、`evidence` 或 `recommend`；
- `claimStatus`：`source-text`、`author-claim` 或 `verified-claim`；
- `speakerGoal`：观众看完此页应理解、相信或决定什么。

旧 data-only Deck Plan 不因缺少 `objective`、`sourceStrategy`、`storyArc`、`sourceRefs`、`contentMode`、`claimStatus` 或 `speakerGoal` 而失效。新 pattern 的语义 validator 负责强制这些字段，而不是通过顶层 Zod required 破坏旧 fixtures。

Schema 增量固定为：

```ts
deckPlan.intent: DeckPattern // 将现有二值 enum 扩展为五值 enum
deckPlan.objective?: string
deckPlan.sourceStrategy?: {
  narrative?: 'primary' | 'supporting' | 'unused'
  data?: 'primary' | 'supporting' | 'unused'
}
deckPlan.storyArc?: {
  opening: string
  development: string
  resolution: string
}
slideOutline[].role: DeckSlideBlockId // §10.1 的闭合 enum
slideOutline[].sourceRefs?: string[]
slideOutline[].contentMode?: 'quote' | 'summarize' | 'explain' | 'compare' | 'evidence' | 'recommend'
slideOutline[].claimStatus?: 'source-text' | 'author-claim' | 'verified-claim'
slideOutline[].speakerGoal?: string
```

当 `intent` 为三个新 pattern 时，`objective`、`sourceStrategy` 和 `storyArc` MUST 存在；旧 pattern MAY 使用这些字段。

## 12. DeckSpec 增量

新增字段全部 optional，保证旧 DeckSpec 兼容：

```ts
type DeckPattern =
  | 'executive-brief'
  | 'business-review'
  | 'topic-explainer'
  | 'project-update'
  | 'proposal'

interface ContentProvenance {
  sourceId: string
  sectionId?: string
  paragraphIds?: string[]
  kind: 'source-text' | 'author-claim' | 'verified-claim'
}

interface DeckSpec {
  // existing fields
  pattern?: DeckPattern
  audience?: string
  objective?: string
}

interface SlideSpec {
  // existing fields
  purpose?: string
  sourceRefs?: ContentProvenance[]
}
```

DeckSpec 不保存完整 Markdown，只保存已经选择的页面文案与来源引用。数据图表、KPI 和事实 claim 继续使用现有 provenance/evidence 契约，不创建平行的数据来源字段。

### 12.1 `intent` 与 `pattern` 兼容规则

- `pattern` 是新 DeckSpec 的 canonical 字段。
- 现有 `intent?: 'executive-brief' | 'business-review'` 保留为 deprecated 兼容别名，旧 spec 继续合法。
- instantiate 新 spec 时写入 `pattern`；对于两个旧 pattern，MAY 同时写入同值 `intent` 以支持旧消费者。
- 只存在旧 `intent` 时，parser 将其规范化为同值 `pattern` 后再进入 validator/renderer。
- 两者同时存在且值不同，validator MUST 返回 `DECK_PATTERN_MISMATCH`，不得静默选择其一。
- `topic-explainer`、`project-update`、`proposal` 不得写入旧 `intent` 字段。
- Deck Plan 为兼容现有 schema 继续使用 `deckPlan.intent`，但将其 enum 扩展为五个 pattern；DeckSpec 与 Deck Plan 之间的 adapter 将 `deckPlan.intent` 写入 `DeckSpec.pattern`。

### 12.2 `claimStatus` 与 `claimType` 映射

| `claimStatus` | `claimType` / grounding 规则 |
|---|---|
| `source-text` | MUST NOT 声明为数据验证的 `claimType`；可包含忠实引用的数字，但必须保留 source ref |
| `author-claim` | MAY 标注语义信号用于风险扫描，但 MUST NOT 仅凭原文携带 evidence check 或显示为 verified |
| `verified-claim` | MUST 同时提供现有 `claimType`、`evidence`、`derivedFrom` 和 `check`，并通过对应 validator |

`claimStatus` 描述来源可信等级，`claimType` 描述数据 claim 的可验证语义，两者不是替代关系。因果和预测仍遵守现有阻断规则。

## 13. CLI 契约

### 13.1 Markdown-only

```bash
miao-viz deck analyze notes.md \
  --intent "给管理层介绍项目现状，10 分钟，重点说明风险" \
  --output /tmp/miao-vision/deck-context.json

miao-viz deck instantiate project-update \
  --context /tmp/miao-vision/deck-context.json \
  --output /tmp/miao-vision/deck.yaml

miao-viz deck validate \
  --spec /tmp/miao-vision/deck.yaml \
  --context /tmp/miao-vision/deck-context.json \
  --strict

miao-viz render deck \
  --spec /tmp/miao-vision/deck.yaml \
  --context /tmp/miao-vision/deck-context.json \
  --output /tmp/miao-vision/deck.html
```

### 13.2 Hybrid

```bash
miao-viz deck analyze notes.md \
  --data metrics.csv \
  --intent "季度项目复盘，说明进展和业务效果" \
  --output /tmp/miao-vision/deck-context.json
```

Hybrid analyze 内部复用现有 data analyze 能力。实现时应调用共享模块，不通过子进程解析 CLI 输出。

同一个 `--intent` MUST 同时用于：

1. 生成 `DeckContext.request.rawIntent`；
2. 调用共享 data analyze 模块生成 `AnalyzeContext.intent`。

DeckContext.request 是演示编排的 canonical 用户请求；嵌入的 `AnalyzeContext.intent` 仅保留数据分析所需的解释结果。二者若因数据分析规范化而产生结构差异，不做字符串回写或合并，validator 只要求它们源自同一次 analyze 调用并在 context metadata 中记录同一个 request fingerprint。

### 13.3 兼容性

- 现有 `data analyze -> deck instantiate -> render deck --input` 保持可用。
- `deck instantiate` 同时接受旧 `AnalyzeContext` 和新 `DeckContext`。
- Markdown-only render 不要求 `--input`。
- 旧 DeckSpec 在没有 context 时继续允许 legacy render，并报告跳过的验证项。
- `--strict` 仍要求 context，但 context 可以是 `AnalyzeContext` 或 `DeckContext`。
- Hybrid Deck 若同时从 context 和 `--input` 获得数据路径，必须校验二者指向同一输入，避免验证数据与渲染数据不一致。

### 13.4 Context 类型分派

新增 `deck-context-dispatch.ts`，提供单一入口 `parseDeckCommandContext(unknown)`：

1. 先按显式 `version` 和 `sources/request/planning` 特征尝试 DeckContext；
2. 再尝试现有 `parseAnalyzeContext()`；
3. 成功后统一返回 `{ kind: 'deck' | 'analyze', deckContext, analyzeContext? }`；
4. 两种 shape 都失败时返回 `INVALID_DECK_CONTEXT`，details 同时包含 DeckContext 和 AnalyzeContext 的首个 schema issue，并提示两种可接受来源。

`deck instantiate`、`deck validate` 和 `render deck` MUST 只通过该 dispatcher 读取 context，不得继续各自无条件调用 `parseAnalyzeContext()`。

`render deck` MUST 显式分支：

- narrative-only：`--input` optional，不调用 `loadDataset()`、`profileDataset()` 或 `validateDeckFields()`，rows 使用空数组；
- data/hybrid：解析数据源，执行现有 dataset profile、字段验证和 grounding；
- legacy spec without context：保持现有 `--input` required 行为，并报告 skipped checks。

## 14. 验证契约

验证分为三层。

### 14.1 结构与呈现验证

- Deck 至少一页。
- 每页最多一个主 claim、四个 metrics 和一个 chart。
- Narrative layout 不得被要求提供数据字段。
- Data layout 继续执行 chart encoding、transform 和字段检查。
- Pattern 的必需 slide roles 必须存在。
- 标题、正文、列表和引用不得超过对应 layout 的内容预算。
- 超出内容预算返回结构化 issue 和 split/shorten repair hint。

### 14.2 Narrative 来源验证

- `sourceRefs` 必须指向 DeckContext 中真实存在的 source、section 和 paragraph。
- `source-text` 引用必须与原文一致或满足允许的规范化规则。
- 摘要与解释必须保留 source refs。
- `author-claim` 不得显示为 verified。
- Markdown 数字不得在没有数据 evidence 时使用 `verified-claim`。
- 远程或丢失的本地图片产生资源 warning，不阻断无图片版本的 Deck 渲染。

### 14.3 数据 grounding

- 继续复用现有 evidence id、`$evidence:` path、`claimType`、`derivedFrom` 和 `check`。
- Hybrid Deck 中只有数据 claim 执行数值和公式验证。
- `verified-claim` 必须通过现有 provenance 和 claim check。
- 原文观点即使与某项数据相关，也不得自动升级为因果结论。
- strict 模式要求所有事实状态与实际证据等级一致，而不是要求每页都有数据 evidence。

## 15. Renderer 与布局

现有 renderer 可以继续接受 `rows`，但 Markdown-only 路径传入空数组。首期优先复用：

- `cover`
- `title-only`
- `text-points`
- `ending`

Phase 1 可增加少量 narrative-first layout：

- `quote-focus`：单一引用与来源；
- `section-summary`：标题、摘要和 3–5 个要点；
- `comparison-text`：两栏观点或方案对比；
- `decision`：决策请求、依据与限制。

所有 layout 仍由纯 HTML/CSS/SVG 确定性渲染。不得把 Markdown AST 直接交给 renderer。

新增 layout 时 MUST 同步修改：

- `deck-types.ts` 的 `SlideLayout`；
- `deck-schema.ts` 的 `SLIDE_LAYOUTS`；
- `deck-renderer.ts` 的 import 与 `renderSlide()` switch；
- 对应 layout renderer 和 schema/semantic tests。

`renderSlide()` MUST 增加 exhaustive fallback；遇到未支持 layout 时返回结构化渲染错误，不能产生 `undefined` 并在 HTML join 阶段静默丢页。

## 16. 分阶段交付

### Phase 1：Markdown-only Deck

独立可发布，完成后无需 Phase 2 也能提供完整价值：

1. 抽取共享 document structure analyzer。
2. 新增 DeckContext schema 和旧 AnalyzeContext adapter。
3. 新增 `deck analyze <markdown>`。
4. 新增 `topic-explainer`、`project-update` 和 `proposal` pattern。
5. 扩展 Deck Plan、DeckSpec 与 source refs。
6. `render deck` 允许没有数据输入。
7. 增加 narrative 来源、内容密度和布局验证。
8. 更新技能文档、CLI help、fixtures 和测试。

### Phase 2：Hybrid Deck

在 Phase 1 基础上独立增强：

1. 增加 `deck analyze <markdown> --data <file>`。
2. 在 DeckContext 中嵌入 AnalyzeContext。
3. Planner 同时选择 narrative block 和 evidence-backed chart block。
4. 增加混合来源验证和数据路径一致性检查。
5. 增加 Hybrid Deck workflow smoke test。

### Phase 3：质量与体验

独立增强，不作为前两阶段上线前提：

1. 完善内容密度和溢出诊断。
2. 增加基于真实 fixtures 验证过的 narrative layouts。
3. 支持本地图片资源校验与安全嵌入。
4. 建立 Deck Plan evaluation fixtures 和人工评分基线。
5. 根据真实用例决定是否增加新的 Deck pattern。

## 17. 代码影响范围

预计涉及超过 8 个文件，是中型 CLI 能力扩展，但不新增服务、语言或运行时。

主要文件目标：

| 类型 | 文件或模块 | 责任 |
|---|---|---|
| 新增 | `deck-context-schema.ts` | DeckContext schema、parse 和兼容适配 |
| 新增 | `document-structure.ts` | Article/Deck 共用 Markdown 文档结构提取 |
| 新增 | `deck-content-analyzer.ts` | 文档结构到 NarrativeContext 的适配 |
| 修改 | `deck-plan-schema.ts` | narrative/hybrid plan 字段 |
| 修改 | `deck-types.ts` | pattern、request、source refs 类型 |
| 修改 | `deck-schema.ts` | DeckSpec 新增 optional 字段 |
| 修改 | `cli-deck.ts` | analyze、optional input、context 分派 |
| 新增 | `deck-context-dispatch.ts` | DeckContext/AnalyzeContext 判型、规范化和错误提示 |
| 修改 | `deck-validator.ts` | narrative/data 分支和来源校验 |
| 修改 | `deck-knowledge-registry.ts` | 新 pattern 与候选规则 |
| 修改 | `deck-layouts.ts` | narrative-first layouts |
| 修改 | `deck-renderer.ts` | 新 layout switch、exhaustive error 与空 rows 路径 |
| 修改 | `cli-help.ts` | 新命令和兼容说明 |
| 修改 | `skills/miao-vision/references/deck.md` | Agent 工作流 |
| 新增 | fixtures/tests | Markdown-only、data-only、hybrid 覆盖 |

实现时必须遵守非测试 `.ts` 文件少于 500 行的仓库限制。共享 Markdown 提取和 Deck 语义适配应拆分为不同模块。

## 18. 测试与验收

### 18.1 自动化测试

必须覆盖：

- 合法 Markdown 的标题、章节、段落、列表、引用和 frontmatter 提取；
- 空文档、仅标题文档、超长章节和非法 frontmatter；
- source id 稳定性；
- Markdown-only DeckContext schema round-trip；
- 旧 AnalyzeContext 到 DeckContext 的兼容适配；
- DeckContext/AnalyzeContext dispatcher 的两种成功路径和双 schema 失败错误；
- 五种 pattern 的 instantiate；
- 旧 `intent` 规范化、`pattern` canonical 输出和 `DECK_PATTERN_MISMATCH`；
- 失效 source ref；
- Markdown 数字错误标记为 verified；
- Narrative Deck 无 `--input` 渲染；
- 四种新增 layout 的 schema 接受、renderer switch 和未知 layout 错误；
- Hybrid Deck 数据字段和 evidence 校验；
- context 数据路径与 `--input` 不一致；
- 旧 data-only Deck fixtures 全部继续通过；
- HTML/PDF 页面数量和 16:9 输出。

### 18.2 Workflow smoke tests

Markdown-only：

```text
deck analyze markdown
  -> deck instantiate project-update
  -> deck validate --strict
  -> render deck
```

Hybrid：

```text
deck analyze markdown --data csv
  -> deck instantiate executive-brief/project-update
  -> deck validate --strict
  -> render deck
```

Data-only 回归：

```text
data analyze
  -> deck instantiate executive-brief
  -> deck validate --strict
  -> render deck --input
```

### 18.3 人工验收

至少准备以下固定 fixtures：

- 产品方案说明；
- 项目周报或月报；
- 技术主题解释；
- Markdown 项目总结 + 指标 CSV；
- 含作者观点和未经验证数字的研究笔记；
- 章节极不均衡的长文档。

人工检查：

- Deck 是否围绕 audience 和 objective 组织，而不是机械按标题分页；
- 每页是否有明确作用；
- 原文观点与系统验证事实是否视觉和语义可区分；
- Hybrid Deck 的图表是否真正支持相邻叙事；
- 是否存在凭空生成的结论、数字或建议；
- 页面是否有溢出、过载或重复。

## 19. 成功指标

1. Markdown-only 输入可以生成 5–10 页无需伪造数据文件的可用 Deck。
2. `topic-explainer`、`project-update`、`proposal` 各至少有两个固定 evaluation fixtures。
3. Hybrid Deck 中数据对象 provenance coverage 和 claim check coverage 均为 `1`。
4. 每个正文页可以追溯到 Markdown `sourceRefs`、数据 `evidence`，或通过 `claimStatus: source-text|author-claim` 明确标记为用户提供的表达。
5. 旧 Data Deck fixtures、命令和输出保持兼容。
6. 不新增后端、网络依赖、API key 或数据上传步骤。
7. 人工评审中不得出现把 Markdown 标题顺序直接当作最终故事线的默认行为。

## 20. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| Markdown Deck 退化为自动分页 | 演示缺少故事和取舍 | Deck Plan 设为必经契约，pattern 声明 story arc |
| 原文数字被误认为已验证 | 产生错误可信感 | 三层 claim status，strict 校验证据等级 |
| Article 与 Deck parser 漂移 | 重复维护和行为不一致 | 抽取共享 document structure 层 |
| Hybrid 验证和渲染使用不同数据 | 结论与图表不一致 | 校验 context source 与 `--input` 一致 |
| Pattern 数量快速膨胀 | registry 难维护 | 仅根据真实 fixture 和评估结果新增 |
| Narrative layouts 导致文件超限 | 违反 500 行规则 | 按 layout 责任拆分模块 |
| 远程图片不可用 | Deck 缺图或渲染失败 | 首期仅记录并 warning，允许无图片降级 |

## 21. 回滚与兼容策略

- 所有 DeckSpec 新字段均 optional，可直接回退到旧 renderer 行为。
- 新命令和 schema 不修改已有数据文件与产物，不涉及数据迁移。
- 若 Markdown workflow 质量不达标，可以移除 `deck analyze` 路由和新 pattern，同时保留现有 Data Deck 链路。
- Phase 2 可单独回滚，不影响 Phase 1 Markdown-only Deck。
- 不修改 `packages/miao-viz-cli/dist/` 和 `apps/web/dist/` 作为源文件；生成副本通过现有 build/pack 流程刷新。

## 22. 最脆弱假设

本方案假设 Agent 继续负责自然语言意图理解、pattern 选择和最终文案判断，而 CLI 负责确定性提取、候选推荐、契约验证和渲染。

如果产品目标变成“CLI 在没有 Agent 或模型参与时，也必须理解任意 Markdown 并生成高质量故事线”，则当前设计不足，需要引入模型 provider、配置、失败降级、隐私披露和 API key 管理。这会改变 Miao Vision 当前 local-first、无必需 API key 的产品边界，必须作为独立 PRD 决策，不能在本项目中隐式引入。

## 23. 推荐实施结论

先实施 Phase 1，只完成 Markdown-only Deck、DeckContext、意图结构、三个 narrative pattern、来源验证和无数据渲染。不要在第一阶段同时实现 Hybrid、图片下载和大量新布局。

Phase 1 验证“Deck Plan 能否把 Markdown 组织成真正可讲的故事”；该前提成立后，再进入 Phase 2，将现有可靠的数据 evidence 链路接入 Hybrid Deck。
