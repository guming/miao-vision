# Deck Markdown 与意图驱动生成：串行实施计划

> 日期：2026-08-13
> 状态：待批准
> 上游 PRD：`docs/deck-markdown-and-intent-prd.md`
> 执行规则：严格 one by one；Task N 验收通过并记录结果后，才能开始 Task N+1

## 1. 实施目标

在不破坏现有 Data Deck 的前提下，依次交付：

1. Markdown/TXT 文档结构分析；
2. DeckContext 与用户意图结构；
3. Narrative Deck Plan、block catalog 和 DeckSpec；
4. 无数据输入的 Narrative Deck 验证与渲染；
5. Markdown-only 完整 CLI 工作流；
6. Markdown + 数据文件的 Hybrid Deck；
7. 技能文档、评估 fixtures 和发布检查。

计划涉及超过 8 个文件，但不新增服务、语言、运行时、API key、账号或网络依赖。

## 2. 串行执行协议

每个任务按以下顺序执行，不得并行开发，也不得提前修改后续任务文件：

```text
读取当前任务
  -> 检查工作区漂移
  -> 只实现当前任务范围
  -> 运行当前任务定向测试
  -> 运行全量基础门禁
  -> 记录验收结果
  -> 当前任务标记完成
  -> 开始下一任务
```

强制规则：

- 同一时间只能有一个 `IN_PROGRESS` 任务。
- 当前任务任何 MUST 验收失败时立即停止，不得以“后续任务会修复”为理由继续。
- 不使用并行 sub-agent、并行测试进程或并行实现分支。
- 每项任务结束后执行 `git diff --check` 和 `npm run check:size`。
- 行为变更任务结束后执行其定向 Vitest；公共契约或 CLI 变更还必须执行 `npm run test:run` 与 `npm run build:cli`。
- 不编辑 `packages/miao-viz-cli/dist/`、`apps/web/dist/` 或其他生成目录作为源文件。
- 用户现有的无关修改和未跟踪文件不得清理、覆盖或纳入任务。

任务状态只允许：`PENDING`、`IN_PROGRESS`、`DONE`、`BLOCKED`。

## 3. 任务总览

| 顺序 | 状态 | 任务 | 阶段完成点 |
|---:|---|---|---|
| 1 | DONE | 抽取共享 Document Structure Analyzer | 内部基础能力 |
| 2 | DONE | 建立 DeckContext schema 与 source-id 契约 | 内部基础能力 |
| 3 | DONE | 建立 Context dispatcher 与旧 AnalyzeContext adapter | 内部兼容层 |
| 4 | DONE | 扩展 Deck Plan schema | Plan 契约可用 |
| 5 | DONE | 扩展 narrative block 与 pattern registry | Planner 知识可用 |
| 6 | DONE | 扩展 DeckSpec canonical pattern 与来源字段 | Spec 契约可用 |
| 7 | DONE | 实现 Deck Markdown Analyzer 与 `deck analyze` | Markdown 分析可用 |
| 8 | DONE | 实现 Narrative 来源和语义验证 | Narrative spec 可验证 |
| 9 | DONE | 实现 narrative layouts 与无数据渲染 | 手写 Narrative spec 可渲染 |
| 10 | DONE | 实现 narrative pattern instantiate | Phase 1 端到端可用 |
| 11 | DONE | 完成 Markdown-only workflow hardening | Phase 1 可发布 |
| 12 | DONE | 实现 Hybrid Deck analyze 与数据一致性 | Phase 2 端到端可用 |
| 13 | DONE | 更新技能、CLI 文档和评估 fixtures | 发布候选完成 |
| 14 | DONE | 全量回归与发布验收 | 计划完成 |

## 4. 串行 Todo

### Task 1 — 抽取共享 Document Structure Analyzer

**目标**

从现有 article Markdown 分析逻辑中抽出中性的文档结构解析层，Article 行为保持不变。

**改动范围**

- 新增 `packages/miao-viz-cli/src/document-structure.ts`。
- 新增 `packages/miao-viz-cli/src/document-structure.test.ts`。
- 调整 `packages/miao-viz-cli/src/article-analyzer.ts` 使用共享结果。
- 必要时调整现有 article analyzer 测试，但不得改变公开输出。

**实现要求**

- 支持 `.md`、`.markdown`、`.txt`。
- 提取 frontmatter、标题层级、段落、列表、blockquote、表格和图片引用。
- 共享层不包含 Deck pattern、slide、evidence 或 renderer 知识。
- 保持 article analyzer 的现有错误码和返回 shape。

**验收标准**

- MUST：同一输入重复解析得到深度相等的 document structure。
- MUST：新增测试覆盖 frontmatter、嵌套标题、段落、列表、引用、表格、图片、空文档和非法扩展名。
- MUST：现有 article analyzer/infographic 测试输出不变。
- MUST：`packages/miao-viz-cli/src/article-analyzer.ts` 不因抽取而超过 500 行。
- 命令：`npm run test:run -- document-structure article-analyzer agent`。
- 门禁：`npm run check:size`、`git diff --check`。

**完成定义**

共享 analyzer 已被 Article 实际调用，且没有任何 Deck 公共 API 变化。

---

### Task 2 — 建立 DeckContext schema 与 source-id 契约

**依赖**：Task 1 DONE。

**目标**

实现 PRD §8 的完整 DeckContext 类型、Zod schema、parser 和稳定 source id 生成器，但暂不接入 CLI。

**改动范围**

- 新增 `deck-context-schema.ts`。
- 新增 `deck-context-schema.test.ts`。
- 新增 narrative/data/hybrid context fixtures。

**实现要求**

- 完整定义 `DeckRequest`、`DeckSource`、`NarrativeContext`、`ContentSection`、`ContentPoint`、`ContentClaim`、`ContentImageRef` 和 planning candidates。
- `durationMinutes` 必须为正数；`desiredLength` 使用 PRD enum。
- source id 为规范化相对路径 SHA-256 前 8 位；节点 id 使用确定性序号。
- `data?: AnalyzeContext` 复用现有 schema，不复制 evidence schema。
- 不保留 `analyzeContextRef`。

**验收标准**

- MUST：合法 narrative、data、hybrid fixtures 均通过 schema。
- MUST：缺少 `version/request/sources/planning`、错误 duration、重复 source id、失效 source id 均返回结构化 schema issue。
- MUST：不同绝对工作目录下，相同规范化相对路径生成相同 source id。
- MUST：同一文件内容重复分析的全部节点 id 一致。
- 命令：`npm run test:run -- deck-context-schema`。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run check:size`、`git diff --check`。

**完成定义**

DeckContext 是可导入、可验证的内部公共类型，但未改变任何已有 CLI 行为。

---

### Task 3 — Context dispatcher 与旧 AnalyzeContext adapter

**依赖**：Task 2 DONE。

**目标**

为 deck commands 建立唯一 context 判型入口，并把旧 AnalyzeContext 无损适配为 DeckContext 视图。

**改动范围**

- 新增 `deck-context-dispatch.ts` 和测试。
- 调整 `cli-deck.ts` 的 instantiate/validate context 读取。
- 保留旧命令输出 shape。

**实现要求**

- `parseDeckCommandContext()` 返回 `kind`、规范化 DeckContext 和可选 AnalyzeContext。
- 先识别显式 DeckContext，再尝试 AnalyzeContext。
- 双失败返回 `INVALID_DECK_CONTEXT`，details 包含两种 shape 的首个 issue 和修复提示。
- adapter 不修改 AnalyzeContext evidence、catalog、sampleWarnings 或 intent。

**验收标准**

- MUST：现有 AnalyzeContext fixtures 通过 dispatcher，原有 deck validate/instantiate 测试全部通过。
- MUST：DeckContext fixture 通过 dispatcher。
- MUST：模糊或非法 JSON 不被静默识别，返回 `INVALID_DECK_CONTEXT`。
- MUST：adapter 后 evidence ids、paths 和 warning codes 与原对象一致。
- 命令：`npm run test:run -- deck-context-dispatch deck-cli deck-knowledge-registry`。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run check:size`、`git diff --check`。

**完成定义**

所有 deck context 读取集中到 dispatcher，旧 Data Deck 行为无回归。

---

### Task 4 — 向后兼容扩展 Deck Plan schema

**依赖**：Task 3 DONE。

**目标**

扩展现有 `deck-plan-schema.ts`，不替换旧 schema、不重命名 `blockedClaims`。

**改动范围**

- 修改 `deck-plan-schema.ts`。
- 扩展 `deck-plan-schema.test.ts`。
- 新增三个 narrative plan fixtures。

**实现要求**

- `deckPlan.intent` 扩展为五个 pattern。
- 新增 optional `objective/sourceStrategy/storyArc`。
- outline 新增 optional `sourceRefs/contentMode/claimStatus/speakerGoal`。
- role 扩展为 PRD §10.1 的闭合 block id enum。
- 对三个新 pattern 运行语义验证，强制 narrative/hybrid 必需字段。
- 两个旧 pattern 缺少新增字段仍合法。

**验收标准**

- MUST：所有旧 deck plan fixtures 不修改即可通过。
- MUST：三个新 pattern 的合法 fixture 通过。
- MUST：新 pattern 缺少 objective、storyArc、speakerGoal 或 source/evidence 时返回精确字段路径。
- MUST：未注册 role 被拒绝。
- MUST：字段名保持 `blockedClaims`，schema 和 fixtures 中不出现 `unsupportedClaims`。
- 命令：`npm run test:run -- deck-plan-schema`。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run check:size`、`git diff --check`。

**完成定义**

新旧 Deck Plan 同时合法，且 narrative plan 已有严格、机器可读的契约。

---

### Task 5 — 扩展 Narrative Block 与 Pattern Registry

**依赖**：Task 4 DONE。

**目标**

在现有 registry 中加入 narrative blocks 和三个 pattern，避免创建第二套规划系统。

**改动范围**

- 修改 `deck-knowledge-registry.ts`，必要时按 data/narrative 职责拆分，单文件不得超过 500 行。
- 扩展 `deck-knowledge-registry.test.ts`。
- 必要时扩展 context catalog 类型和 codec 测试。

**实现要求**

- 加入 `narrative-cover`、`section-summary`、`quote-focus`、`text-comparison`、`decision-request`、`narrative-ending`。
- block 声明 `supportedSources` 和 narrative `requiredContent`。
- 三个 pattern 映射到闭合 block id 列表。
- 数据 pattern 和现有 block 评分保持不变。

**验收标准**

- MUST：narrative context 推荐 narrative blocks，不推荐需要数据的 KPI/trend/ranking blocks。
- MUST：data context 的 catalog 与当前 fixtures 等价。
- MUST：hybrid context 可同时得到适用的 narrative 与 data blocks。
- MUST：缺少 quote、comparison source 或 decision request 时，对应 block 有结构化 blocked reason。
- 命令：`npm run test:run -- deck-knowledge-registry context-schema`。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run check:size`、`git diff --check`。

**完成定义**

一个 registry 可以确定性描述 Data、Narrative 和 Hybrid Deck 的 block 候选。

---

### Task 6 — 扩展 DeckSpec canonical pattern 与来源字段

**依赖**：Task 5 DONE。

**目标**

落实 DeckSpec 的 pattern、来源和兼容规则。

**改动范围**

- 修改 `deck-types.ts`、`deck-schema.ts`、`deck-validator.ts`。
- 扩展 `deck.test.ts`。

**实现要求**

- 新增 canonical `pattern`、`audience`、`objective`。
- 保留 deprecated 二值 `intent`。
- parser 将仅有旧 intent 的 spec 规范化为同值 pattern。
- 两字段冲突返回 `DECK_PATTERN_MISMATCH`。
- Slide 新增 `purpose/sourceRefs` 和 claim status。
- `verified-claim` 必须携带并通过现有 grounding 字段；其他状态不得显示为 verified。

**验收标准**

- MUST：全部旧 DeckSpec fixtures 继续通过并得到规范化 pattern。
- MUST：五个 pattern 均可解析。
- MUST：intent/pattern 冲突返回指定错误码与字段路径。
- MUST：三个 claim status 的允许/禁止组合均有正反测试。
- MUST：旧 renderer 输入不要求新增字段。
- 命令：`npm run test:run -- deck deck-knowledge-validator deck-provenance`。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run check:size`、`git diff --check`。

**完成定义**

DeckSpec 新契约可用，旧 spec 无破坏性变化。

---

### Task 7 — 实现 Deck Markdown Analyzer 与 `deck analyze`

**依赖**：Task 6 DONE。

**目标**

把共享文档结构转换为 NarrativeContext，并开放只读 CLI analyze 命令。

**改动范围**

- 新增 `deck-content-analyzer.ts` 和测试。
- 修改 `cli-deck.ts`、`cli-help.ts`。
- 增加 Markdown fixtures 和 CLI tests。

**实现要求**

- `miao-viz deck analyze <file> --intent <text> [--output <json>]`。
- intent 写入 request.rawIntent；显式 frontmatter 可填 audience/occasion/duration/tone，命令行 intent 优先。
- 提取 sections、points、quotes、claims、images 和推荐 pattern candidates。
- 只识别 claim signals，不创造总结数字、建议、因果或预测。
- CLI 返回现有 `{ ok: true, value: ... }` 风格。

**验收标准**

- MUST：Markdown 和 TXT 均输出合法 DeckContext。
- MUST：`10 分钟` 若被确定性识别则写入 `durationMinutes: 10`；无法可靠识别时不猜测。
- MUST：远程图片被记录并产生 warning，不发生网络请求。
- MUST：空文档、非法扩展、缺失文件返回稳定错误码。
- MUST：同一输入两次执行输出除显式时间戳外一致；首版不得写入时间戳。
- 命令：`npm run test:run -- deck-content-analyzer deck-cli agent`。
- 手工：运行一次 `npm run miao-viz -- deck analyze <fixture.md> --intent "项目更新"`，确认 stdout 是机器可读 JSON。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run check:size`、`git diff --check`。

**完成定义**

用户可以把 Markdown 转成合法 DeckContext，但尚不承诺自动生成和渲染 Deck。

---

### Task 8 — Narrative 来源与语义验证

**依赖**：Task 7 DONE。

**目标**

让 `deck validate` 正确验证 Narrative Deck，而不误用数据字段验证。

**改动范围**

- 新增或扩展 narrative validator 模块。
- 修改 `deck-validator.ts`、`cli-deck.ts`。
- 增加 narrative validation tests。

**实现要求**

- 验证 source/section/paragraph/image refs 存在。
- 验证 claimStatus 与 claimType/grounding 映射。
- narrative-only 不执行 dataset profile 和 chart field validation。
- 检查 pattern 必需 roles、每页主 claim 数量和内容预算。
- 错误包含 code、path、message、hint。

**验收标准**

- MUST：合法 narrative spec + DeckContext strict validate 成功。
- MUST：失效 source ref 精确定位到 slide/sourceRefs 索引。
- MUST：author-claim 伪装 verified 被 strict 阻断。
- MUST：没有数据的 spec 使用 chart/KPI data block 被阻断。
- MUST：旧 data validate 行为和 provenance coverage 不变。
- 命令：`npm run test:run -- deck-narrative-validator deck-cli deck-knowledge-validator deck-provenance`。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run check:size`、`git diff --check`。

**完成定义**

手写 Narrative DeckSpec 可以通过严格来源验证，且不能冒充数据验证结论。

---

### Task 9 — Narrative layouts 与无数据渲染

**依赖**：Task 8 DONE。

**目标**

支持手写 Narrative DeckSpec 在没有 `--input` 时渲染 HTML/PDF。

**改动范围**

- 修改 `deck-types.ts`、`deck-schema.ts`。
- 新增或拆分 narrative layout renderer。
- 修改 `deck-renderer.ts`、`cli-deck.ts`。
- 扩展 `deck.test.ts`、`deck-cli.test.ts`。

**实现要求**

- 增加 `quote-focus`、`section-summary`、`comparison-text`、`decision` layout。
- `renderSlide()` 覆盖全部 layout，并对未知 layout exhaustive fail。
- narrative-only 分支不调用 load/profile/field validation，rows 为 `[]`。
- data/hybrid 与 legacy 分支保持现有输入要求。
- HTML 保持 self-contained、16:9、键盘导航和 print/PDF 行为。

**验收标准**

- MUST：四种新 layout 均有 schema、semantic 和 renderer 测试。
- MUST：每个 spec slide 对应恰好一个 `.slide`，不得静默丢页。
- MUST：Narrative Deck 不传 `--input` 成功渲染 HTML。
- MUST：legacy 无 context render 仍要求 `--input`。
- MUST：数据 Deck 的现有 HTML snapshot/结构断言不变。
- MUST：长标题、长 quote、五个 bullet 的 fixture 无明显溢出；超预算输入在 validate 阶段失败。
- 命令：`npm run test:run -- deck deck-cli`。
- 手工：渲染 narrative fixture，检查首页、引用页、对比页、决策页和打印预览。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run test:e2e`、`npm run check:size`、`git diff --check`。

**完成定义**

手写并验证后的 Narrative DeckSpec 可生成 HTML/PDF；尚不依赖自动 instantiate。

---

### Task 10 — Narrative pattern instantiate

**依赖**：Task 9 DONE。

**目标**

让三个 narrative pattern 从 DeckContext 确定性生成可编辑、可验证、可渲染的 DeckSpec。

**改动范围**

- 修改 narrative registry/instantiator 模块和 `cli-deck.ts`。
- 增加 pattern fixtures 和 instantiate tests。

**实现要求**

- 支持 `topic-explainer`、`project-update`、`proposal`。
- 生成顺序来自 registry block mapping。
- 每页写入 purpose、sourceRefs、claimStatus 和合适 layout。
- 不凭空补充原文没有的事实、建议、决策或数字。
- 缺少可靠内容时省略 optional block；缺少 pattern 必需内容时返回 structured unsupported result，不生成空壳 Deck。

**验收标准**

- MUST：三个 pattern 各有至少两个 fixture，instantiate 后 parse 和 strict validate 均通过。
- MUST：同一 DeckContext 重复 instantiate 输出一致。
- MUST：所有输出 sourceRefs 都存在于 context。
- MUST：输出中不存在 context 未提供的数字文本。
- MUST：旧两个 data pattern 输出与当前 fixtures 等价。
- 命令：`npm run test:run -- deck-knowledge-registry deck-plan-schema deck-cli deck`。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run check:size`、`git diff --check`。

**完成定义**

Phase 1 的 analyze → instantiate → validate → render 主链路功能完整。

---

### Task 11 — Markdown-only workflow hardening

**依赖**：Task 10 DONE。

**目标**

以真实 fixtures 验证完整 Phase 1，并补齐失败修复信息和交付结果。

**改动范围**

- 新增 `deck-markdown-workflow.test.ts`。
- 增加产品方案、项目更新、技术解释、长文档和未验证数字 fixtures。
- 必要时修正文案预算、delivery summary 和 preview 行为。

**验收标准**

- MUST：三类 narrative fixture 全流程成功，并生成 5–10 页 Deck。
- MUST：空文档、单标题、超长章节、失效 source ref、未经验证数字均走预期错误或降级路径。
- MUST：delivery 标记 narrative claim 为 sourced 而非 verified data claim。
- MUST：preview 失败只产生 warning，不删除成功生成的 Deck。
- MUST：人工检查不是机械按 Markdown 标题一一分页。
- 命令：`npm run test:run -- deck-markdown-workflow deck-cli deck`。
- 手工：对三个 pattern 各渲染一份 HTML，检查故事线、来源状态和页面密度。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run test:e2e`、`npm run check:size`、`git diff --check`。

**完成定义**

Phase 1 可独立发布；即使不实施 Hybrid，Markdown-only Deck 仍完整可用。

---

### Task 12 — Hybrid Deck analyze 与数据一致性

**依赖**：Task 11 DONE。

**目标**

在已稳定的 Markdown-only 链路上接入现有 AnalyzeContext，完成 Hybrid Deck。

**改动范围**

- 修改 `deck-content-analyzer.ts`、`cli-deck.ts` 和 hybrid planner/validator。
- 增加 Markdown + CSV/XLSX fixtures 和 workflow tests。

**实现要求**

- 支持 `deck analyze notes.md --data metrics.csv --intent ...`。
- 通过共享模块调用 data analyze，不启动子进程。
- 同一 raw intent 写入 DeckContext.request，并传给 data analyze。
- 记录 request fingerprint；不回写或覆盖 AnalyzeContext 的解释字段。
- context data source 与 render `--input` 必须一致。
- narrative/source claim 与 verified data claim 保持分层。

**验收标准**

- MUST：至少两个 Hybrid fixtures 完成 analyze → instantiate → strict validate → render。
- MUST：所有数据 chart/KPI 的 object coverage 和 claim check coverage 均为 `1`。
- MUST：数据路径或 fingerprint 不一致返回结构化错误并停止渲染。
- MUST：数据不存在、字段失效和证据不足均保留现有错误语义。
- MUST：远程图片、无网络和无 API key 不影响无图降级。
- 命令：`npm run test:run -- deck-hybrid-workflow deck-cli deck-provenance deck-knowledge-validator`。
- 手工：确认 narrative 页面与相邻数据图表支持同一 story arc，不是简单拼接两份 Deck。
- 门禁：`npm run test:run`、`npm run build:cli`、`npm run test:e2e`、`npm run check:size`、`git diff --check`。

**完成定义**

Phase 2 可独立发布，且可单独回滚到 Markdown-only Phase 1。

---

### Task 13 — 技能、CLI 文档和评估 fixtures

**依赖**：Task 12 DONE。

**目标**

让 Agent 能正确选择 Data、Narrative 或 Hybrid workflow，并避免过度承诺。

**改动范围**

- 更新 `skills/miao-vision/SKILL.md` 和 `skills/miao-vision/references/deck.md`。
- 更新 CLI help 和相关产品文档。
- 更新 skill compatibility/runtime tests。
- 通过现有 build/pack 流程刷新生成副本，不直接编辑生成文件。

**实现要求**

- 路由说明三种 Deck source 模式。
- 明确 browser HTML/PDF、非 PPTX、无远程图片下载。
- Markdown workflow 要求 Deck Plan、source refs 和 claim status。
- Hybrid workflow 要求 data grounding coverage 为 1。
- 交付说明不得把 author claim 描述为 verified。

**验收标准**

- MUST：技能包含三条完整命令链和错误修复规则。
- MUST：旧 Data Deck 指令继续有效。
- MUST：CLI help 与真实 flags、错误和 optional `--input` 行为一致。
- MUST：skill runtime/compatibility tests 通过。
- 命令：`npm run test:skill-runtime`、`npm run pack:skill`、`npm run build`。
- 门禁：`npm run check:size`、`git diff --check`。

**完成定义**

文档、技能和 CLI 行为一致，Agent 不需要读取 renderer 内部实现即可执行工作流。

---

### Task 14 — 全量回归与发布验收

**依赖**：Task 13 DONE。

**目标**

只做验证和必要的同范围修复，不增加新功能。

**验收标准**

- MUST：`npm run test:run` 通过。
- MUST：`npm run build:cli` 通过。
- MUST：`npm run check:size` 通过，无新增超过 400 行 warning 的源文件。
- MUST：`npm run check` 通过。
- MUST：`npm run build` 通过。
- MUST：`npm run test:e2e` 通过。
- MUST：`npm run test:skill-runtime` 通过。
- MUST：手工完成 Data、Narrative、Hybrid 各一条 HTML workflow。
- MUST：手工完成 Narrative 与 Hybrid 各一条 PDF workflow，每个 slide 恰好一页。
- MUST：旧 data deck examples 全部可渲染。
- MUST：确认没有网络请求、API key、新服务或数据上传。
- MUST：`git diff --check` 通过，且 diff 不包含生成目录的手工源修改。

**完成定义**

所有自动化与人工门禁通过，PRD 成功标准逐项有证据，计划标记完成。

## 5. 停止条件

出现以下任一情况，当前任务标记 `BLOCKED`，不得开始下一项：

- 需要破坏旧 DeckSpec、Deck Plan 或 CLI 输出才能继续；
- 需要引入模型 provider、网络服务、API key 或数据上传；
- 需要把 Markdown 表格隐式当成结构化分析数据；
- 当前任务无法在全量测试通过的状态下独立合并；
- 单个非测试 TypeScript 文件将超过 500 行且无法按责任拆分；
- source claim 与 verified data claim 无法在产物中可靠区分。

解除阻塞必须先更新 PRD/计划并获得用户确认，不能在实现中静默改变边界。

## 6. 回滚策略

- Task 1–6 主要增加内部兼容契约，可逐项回滚且不迁移用户数据。
- Task 7 的 `deck analyze` 是新增命令，可独立移除。
- Task 8–10 的 Narrative 分支由 context kind 和 pattern 隔离，可回滚而保留 Data Deck。
- Task 12 Hybrid 分支可单独回滚到 Task 11 的 Markdown-only 发布点。
- 所有产物均为重新生成的静态文件，没有数据库或外部状态迁移。

## 7. 最脆弱假设

本计划假设 Agent 负责自然语言意图理解和最终叙事判断，CLI 负责确定性提取、候选、验证与渲染。如果实现过程中要求 CLI 在无 Agent/模型时理解任意 Markdown 并自主创作高质量故事线，应立即停止；这属于另一项产品边界决策，不能通过扩大当前任务解决。

## 8. 批准后的执行方式

用户批准后，从 Task 1 开始。每次只执行当前任务，提交验收结果后再进入下一任务；不得一次性宣布多个任务完成。
