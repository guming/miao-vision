# Evidence Lineage Coverage PRD

> 日期：2026-07-29
> 状态：规划稿
> 负责人：Miao Vision CLI
> 关联：`docs/report-intelligence-knowledge-prd.md`、`docs/evidence-grounded-visualization-generation.md`、`docs/miao-viz-interactive-runtime-prd.md`
> 目标：让报告中的每个 KPI、图表和 insight 都能定位到有效 evidence，能够复算关键结论，并向用户解释数据来源与计算口径。

---

## 1. 背景

Miao Vision 已具备 `context.evidence`、`$evidence:`、structured insight、claim check 和 `spec validate --verify`。这些能力已经能阻止一部分无依据的数字和强结论，但还没有形成覆盖 KPI、图表和 insight 的统一 lineage 契约。

当前主要差距：

- insight 可以声明 `evidence`、`derivedFrom` 和 `check`，KPI 与 chart 没有同等结构。
- “引用存在”不等于“结论正确”，部分引用尚未验证数值、排名、趋势或占比。
- chart 的字段、transform 与 evidence recipe 之间缺少显式映射。
- report、deck、summary、block/template 的验证规则和输出粒度不完全一致。
- CLI 没有统一输出覆盖率，CI 无法判断是否达到 100%。
- HTML 中 evidence 对最终读者不可见，用户无法快速回答“这个数字从哪里来”。

本项目不是新建 lineage 服务，而是在现有 spec、context、validator 和 renderer 上补齐统一的 provenance contract。

## 2. 产品判断

### 2.1 推荐方向

新增统一的 `provenance` 契约，由 KPI、chart 和 insight 共同使用；`spec validate --context --verify` 负责验证引用完整性与声明正确性；renderer 将已验证 provenance 转为用户可查看的 evidence drawer。

选择该方案的原因：

- 复用现有 `AnalyzeEvidence` 和 `$evidence:`，不产生第二套事实源。
- 保持 spec 简短、机器可读，适合 agent 生成和修复。
- 不依赖后台、数据库或网络，符合 local-first。
- coverage 可以确定性计算，适合 CLI、CI 和 recurring report。

### 2.2 不采用的方案

不通过分析标题、字段名或 transform 自动猜测最终 lineage。自动推断可用于生成 patch hint，但不能计入严格覆盖率，因为推断结果无法证明作者意图，也容易在字段重命名或复杂 transform 后失效。

### 2.3 关键假设

本方案假设所有可发布的 KPI、chart 和 insight 都能由 `context.evidence` 表达。如果某类图表只能依赖原始行而没有 evidence recipe，则该对象必须在 analyze 阶段生成对应 evidence，或明确标记为非分析型装饰对象；否则不能通过严格验证。

## 3. 目标与成功标准

### 3.1 Objective

让 Miao Vision 的报告结论可定位、可复算、可解释，使 evidence-grounded 从 insight 局部能力升级为整个报告的发布门槛。

### 3.2 Key Results

1. 核心 fixture 中 KPI、chart、insight 的 lineage coverage 均达到 100%。
2. 所有包含数值、排名、趋势、变化、占比或阈值判断的 insight 均执行语义 claim check。
3. `spec validate --context --verify` 对缺失、无效或不一致 provenance 返回结构化错误和修复建议。
4. self-contained HTML 中 100% 的分析对象可打开“查看依据”，且离线可用。
5. report、derived summary 和 deck 的 evidence ID 与计算口径在派生过程中保持一致。

### 3.3 非目标

- 不建设跨项目、跨组织的数据血缘平台。
- 不引入数据库连接器、权限系统或审计服务器。
- 不追踪原始文件之外的上游 ETL lineage。
- 不允许 agent 编写自定义校验代码。
- 不以大量自然语言说明替代机器可验证 provenance。
- Article infographic 暂不纳入本期 100% 发布门槛；其 `evidenceIds` 保持兼容，后续单独收敛。

## 4. 用户与场景

### 4.1 目标用户

- 使用本地 CSV、XLSX、JSON 生成管理报告的业务用户。
- 需要检查数字来源和口径的报告读者或审核者。
- 调用 `miao-viz` 的 agent、CI 和自动化流程。
- 使用 recurring report 更新周期数据的维护者。

### 4.2 核心场景

1. Agent 生成报告后，在渲染前发现某张 KPI 卡没有 evidence 并自动修复。
2. 审核者点击图表的“查看依据”，看到来源字段、聚合、过滤条件、样本量和 evidence ID。
3. Insight 声称“华东排名第一”，validator 使用排序后的 evidence 复核其排名。
4. Recurring update 替换新数据后，沿用相同 evidence recipe，并提示口径或字段契约变化。
5. CI 读取 coverage 输出，对低于 100% 的核心报告阻止发布。

## 5. 产品原则

### 5.1 Evidence 是事实源

KPI、chart 和 insight 只能引用 `context.evidence` 中存在的 ID 和 path。spec 不得内嵌无法复算的分析结果。

### 5.2 Coverage 不等于正确性

覆盖率回答“是否有依据”；claim check 回答“声明是否与依据一致”。发布门槛必须同时满足完整性和正确性。

### 5.3 显式优于推断

严格模式只接受显式 provenance。CLI 可以根据 chart transform 或 `$evidence:` 生成 patch hint，但不得静默补全后判定通过。

### 5.4 一个契约，多处消费

Schema、validator、renderer、CLI summary 和 agent reference 使用同一 provenance 定义，避免 report、deck、summary 各自维护不同规则。

### 5.5 默认不打扰阅读

依据入口应可发现但不抢占正文。HTML 默认显示简短来源标记，详细 evidence 在 drawer 中展开；打印/PDF 使用紧凑脚注。

## 6. 对象范围与覆盖定义

### 6.1 计入分母的对象

- `bigvalue`、`delta`、`progress`、`gauge`、`infographic-kpi` 等 KPI 型 chart。
- 所有使用数据字段、aggregate 或 transform 的 chart。
- 所有 structured insight 和 legacy string insight。
- chart annotation 和 reference layer 中表达数据结论的对象。

以下对象不计入分母：

- cover、section title、纯文本说明。
- 不读取数据的装饰性 infographic block。
- 明确标记为 source note、method note 的非结论文本。

豁免必须由 schema 中固定枚举表达，不接受自由文本理由；首期仅允许 `decorative` 和 `methodology` 两种豁免。

Legacy string insight 的覆盖规则：

- 包含有效 `$evidence:` 引用且不包含需要语义复核的声明时，可以计为 covered，并产生迁移 warning。
- 包含数字、排名、趋势、变化、占比、相关性或阈值判断时，必须转换为 structured insight 并声明 claim check；不能仅靠 `$evidence:` 计为 covered。
- 不含分析声明的说明性文字不计入 eligible object。
- 无 evidence 的分析型 string insight 在 strict verify 中失败，不允许使用豁免绕过。

### 6.2 合格 provenance

一个对象只有同时满足以下条件才算 covered：

1. 至少声明一个 evidence ID。
2. evidence ID 存在于当前 context。
3. `derivedFrom` path 可解析并存在。
4. path 指向的值与对象使用的字段或结论类型兼容。
5. 当对象表达可验证声明时，声明适用的 `check` 和 `claimArgs`。
6. 所有 required claim check 执行成功。

对象是否需要 claim check 由第 8 节的对象级规则确定。仅在标题或正文中出现 `$evidence:`，可以满足引用和 path 要求，但不能替代 required claim check。

### 6.3 Coverage 公式

```text
objectCoverage = coveredObjects / eligibleObjects
claimCheckCoverage = passedClaimChecks / requiredClaimChecks
```

发布门槛：

- `objectCoverage = 1.0`
- `claimCheckCoverage = 1.0`
- `invalidReferences = 0`
- `failedClaimChecks = 0`

当 `eligibleObjects = 0` 时，coverage 返回 `1.0`，并附带 `empty: true`，避免空报告被误认为已验证的分析报告。

## 7. 统一 Provenance 契约

### 7.1 Spec 结构

KPI、chart 和 insight 使用同一个容器，但按对象类型采用不同的必填规则：

```yaml
provenance:
  evidence:
    - by_region
  derivedFrom:
    - $evidence:by_region.rows[0].region
    - $evidence:by_region.rows[0].revenue
  check: rank_position
  claimArgs:
    rows: $evidence:by_region.rows
    subjectField: region
    valueField: revenue
    subject: East
    expectedRank: 1
    order: desc
```

字段含义：

| 字段 | 必填条件 | 说明 |
|------|----------|------|
| `evidence` | 所有分析对象 | 使用的 evidence ID，至少一个 |
| `derivedFrom` | 所有分析对象 | 对象实际消费的 evidence path |
| `check` | 表达可验证声明时 | 使用现有固定检查类型 |
| `claimArgs` | `check` 需要参数时 | 只引用 evidence path 或确定性常量 |
| `exemption` | 非分析对象 | 仅允许固定枚举 |

对象级最小要求：

| 对象 | `evidence` | `derivedFrom` | `check` / `claimArgs` |
|------|------------|---------------|-----------------------|
| KPI | 必填 | 必填，必须定位显示值 | 默认要求 `value_match` |
| 普通 chart | 必填 | 必填，可指向完整 `rows` 或所用字段 | 不要求；chart 标题表达排名、趋势等声明时才要求 |
| Insight | 必填 | 必填，定位声明所用值 | 按第 8 节声明类型要求 |
| Annotation/reference | 必填 | 必填，定位标注值 | 表达比较或阈值声明时要求 |

Chart 的 provenance 证明“可视化数据来自哪里”，不要求对每个 mark 执行单值 claim check。Chart 标题若只是描述编码，如“Revenue by Region”，不产生 required claim check；若标题写“East Leads All Regions”，则必须执行 `rank_position`。

为减少 trivial 用例的 token 成本，schema 允许短写：

```yaml
provenance: $evidence:total.values.revenue
```

规范化后等价于一个 evidence ID 加一个精确 `derivedFrom` path。短写必须包含完整 path，不采用“默认取第一个 values 字段”或“默认取第一行”的隐式规则。复杂 chart 和多路径声明仍必须使用完整结构。

### 7.2 向后兼容

- structured insight 现有顶层 `evidence`、`derivedFrom`、`check`、`claimArgs` 在一个小版本周期内继续读取。
- validator 将旧结构规范化为内部 `provenance`，并返回迁移 warning。
- 新生成的 block、template、summary 和 agent 示例只写新结构。
- 下一个 minor release 移除新生成路径对旧结构的输出，但仍保持读取兼容。

兼容映射：

| 旧结构 | 规范化结果 | 严格覆盖判定 |
|--------|------------|--------------|
| `insight.evidence` | `provenance.evidence` | 仍需有效 `derivedFrom` |
| `insight.derivedFrom` | `provenance.derivedFrom` | path 全部可解析才通过 |
| `insight.check` / `claimArgs` | 同名 provenance 字段 | required check 通过才计入 |
| string insight 中 `$evidence:` | 从正文提取 evidence/path | 仅非声明型文字可直接 covered |
| chart reference/annotation 的 `evidence` | 对应子对象 provenance | 不自动代表整张 chart covered |
| block/template `requiredEvidence` | 仅作为候选 evidence | 不自动映射为对象 provenance |
| 无 evidence 字段的旧 chart | 无法安全规范化 | strict verify 报 `PROVENANCE_REQUIRED` |

`requiredEvidence` 表达 block/template 的适用条件，不表达某个 chart 的实际数据 lineage，因此不能用它代替 chart provenance。

### 7.3 Evidence 元数据要求

用于发布的 evidence 至少包含：

- 稳定 `id`
- query recipe 或等价确定性计算描述
- 使用的输入字段
- aggregate、group、sort、limit 和 filter
- 结果值或结果行
- row count

时间、文件 hash 和展示格式属于可选 metadata，不参与首期覆盖率计算。

## 8. Claim Check 规则

Required claim check 只由对象表达的声明触发，而不是由“对象拥有 provenance”触发：

| 对象/声明类型 | Required check | 最低 evidence 要求 |
|---------------|----------------|--------------------|
| KPI 显示单值 | `value_match` | 单值或明确聚合结果 |
| 普通 chart，无结论型标题 | 无 | chart-ready rows 或相关字段 |
| total insight | `value_match` | 单值或明确聚合结果 |
| rank insight/标题 | `rank_position` | 已排序分组结果、subject 和 value |
| share insight/标题 | `share_formula` | numerator 和 denominator |
| trend insight/标题 | `trend_periods` | 至少 3 个有序时间点 |
| delta insight/标题 | `delta_formula` | from、to 和计算模式 |
| correlation insight/标题 | `value_match` + `sample_size` | r、n 和可靠性信息 |
| distribution insight | `value_match` 或 `sample_size` | 分布统计或 bins |
| data-quality insight | `sample_size` 或 `caveat_present` | profile warning |

`evidence_ref_exists` 仅证明引用存在，不能作为 rank、share、trend、delta 或 correlation 的最终发布检查。

一个 required check 缺失时产生 `PROVENANCE_CHECK_REQUIRED`；已声明但执行不通过时产生 `PROVENANCE_CHECK_FAILED`。对象只有在所有 required check 通过后，才计入 `passedClaimChecks`。非 required 的附加 check 如果被作者声明，也必须执行成功，否则对象不能发布。

容差由 check 类型提供安全默认值；spec 只能在允许范围内收紧或放宽。超出范围时 validator 返回错误，不静默接受。

## 9. 现有 Validator 迁移策略

当前验证职责分散在 `spec-validator.ts`、`spec-validator-intelligence.ts`、`claim-check.ts`、`chart-evidence.ts` 和 `patch-hints.ts`。迁移采用“统一 issue source、保留公共入口”，不一次性搬迁所有规则。

### 9.1 职责归属

| 模块 | 迁移后职责 |
|------|------------|
| `spec-validator.ts` | schema、字段、transform 等通用 spec 校验；调用 provenance validator |
| `provenance-validator.ts` | evidence ID/path、对象兼容性、required check、coverage 的唯一 issue source |
| `spec-validator-intelligence.ts` | 保留非 provenance 的语言、样本、block/template intelligence 规则 |
| `claim-check.ts` | 保持纯函数执行器，由 provenance validator 调用 |
| `chart-evidence.ts` | 只负责 render 前解析 reference value，不再承担验证 |
| `patch-hints.ts` | 根据统一 provenance issue 生成 JSON Patch，不重复判断业务规则 |

### 9.2 去重与兼容

- 每个 provenance 失败只由 `provenance-validator.ts` 创建一次 issue。
- 现有 evidence/insight 错误码通过兼容映射暴露一个 minor release，内部携带新的 canonical code。
- `spec-validator.ts` 中现有 path check 先改为委托，再删除旧实现，避免双跑期间重复报错。
- coverage 只从 normalized provenance 和 canonical issues 计算，不扫描 warning 文本。
- golden tests 同时断言 code、spec path、issue 数量和 coverage，防止重复或分歧。

## 10. CLI 体验

### 10.1 Validate 输出

现有命令保持不变：

```bash
npm run miao-viz -- spec validate \
  --spec report.yaml \
  --profile profile.json \
  --context context.json \
  --verify
```

成功结果增加：

```json
{
  "ok": true,
  "value": {
    "coverage": {
      "objectCoverage": 1,
      "claimCheckCoverage": 1,
      "eligibleObjects": 8,
      "coveredObjects": 8,
      "requiredClaimChecks": 3,
      "passedClaimChecks": 3,
      "byType": {
        "kpi": { "eligible": 3, "covered": 3 },
        "chart": { "eligible": 3, "covered": 3 },
        "insight": { "eligible": 2, "covered": 2 }
      }
    }
  }
}
```

失败时保持 `{ ok: false, code, message, ... }` 风格，并携带：

- `objectType`
- `objectId` 或 spec path
- `evidenceId`
- `derivedFrom`
- `check`
- `repairHint`

### 10.2 错误码

| Code | 条件 | 修复提示 |
|------|------|----------|
| `PROVENANCE_REQUIRED` | 分析对象未声明 provenance | 添加 evidence 和 derivedFrom |
| `PROVENANCE_EVIDENCE_NOT_FOUND` | evidence ID 不存在 | 使用 context 中有效 ID 或重新 analyze |
| `PROVENANCE_PATH_NOT_FOUND` | derivedFrom 无法解析 | 修正 `$evidence:` path |
| `PROVENANCE_PATH_INCOMPATIBLE` | path 与对象字段或声明不匹配 | 改用正确结果字段 |
| `PROVENANCE_CHECK_REQUIRED` | 声明需要语义检查 | 添加对应 check 和 claimArgs |
| `PROVENANCE_CHECK_FAILED` | 声明与 evidence 不一致 | 修正声明或 evidence recipe |
| `PROVENANCE_EXEMPTION_INVALID` | 非法或不适用的豁免 | 删除豁免或改为分析 provenance |
| `PROVENANCE_COVERAGE_INCOMPLETE` | 汇总覆盖率低于门槛 | 根据缺失对象列表修复 |

现有 insight error code 保持读取兼容，新实现内部映射到统一 provenance issue，避免 CLI 消费方突然失效。

### 10.3 Render 门槛

- 带 `--context` 的 report render 默认要求 provenance 引用有效。
- 严格发布和 CI 使用 `spec validate --verify`；未达到 100% 时不得进入 render。
- 开发预览允许非严格 render，但输出顶部 warning banner，并在机器结果中标记 `verified: false`。
- recurring report update 始终使用严格门槛，防止旧项目在新数据上静默改变口径。

## 11. HTML、交互与 PDF 用户体验

### 11.1 查看依据

每个分析对象提供统一入口：

- KPI：数值下方显示来源标记。
- Chart：标题区显示“查看依据”。
- Insight：正文末尾显示 evidence badge。

打开 drawer 后展示：

1. 指标或结论名称。
2. evidence ID。
3. 来源字段。
4. 聚合、分组、过滤、排序和时间范围。
5. 样本量与数据质量 caveat。
6. 用于该对象的结果行或单值。
7. claim check 类型与通过状态。

drawer 仅使用已经嵌入 HTML 的 context/evidence，不发起网络请求。

### 11.2 运行时过滤后的 Evidence

静态 provenance 描述发布时口径；交互式 runtime 的 filter 会改变当前视图结果。drawer 必须明确区分：

- `Published evidence`：来自 `context.evidence`、已经 validator 验证的发布时结果。
- `Current view`：runtime 按当前 filters 从嵌入数据重新计算的派生结果。

当 filter 生效时：

- KPI 和 chart 显示 Current view 数值。
- drawer 同时展示 Published evidence 与 Current view，并列出活动过滤条件。
- Current view 使用与发布 evidence 相同的 aggregate recipe；runtime 不允许改变指标定义。
- 无法在浏览器可靠复算时，对象保持 Published evidence 数值并标记“filter not applied”，不得显示与 drawer 不一致的数字。
- Current view 不改写静态 coverage；它通过独立的 runtime recipe consistency 测试保证正确性。

cross-chart filtering 和 global filters 使用同一规则，避免不同交互路径产生两套口径。

### 11.3 打印与 PDF

- drawer 不进入正文打印布局。
- 每个对象显示紧凑 evidence 编号。
- 报告末尾生成 Evidence Appendix，列出编号、口径、字段和样本量。
- 同一 evidence 被多个对象使用时只列一次。

## 12. Agent 工作流

```text
data analyze
  -> context.evidence + recipes
  -> block/template instantiate 写入 provenance
  -> agent 组织 narrative，不计算数字
  -> spec validate --context --verify
  -> coverage 或结构化 issues
  -> agent 根据 repairHint 修复
  -> render verified artifact
```

Agent 行为约束：

- 不得为了通过 coverage 引用与对象无关的 evidence。
- 不得把 `evidence_ref_exists` 用作复杂声明的替代检查。
- 若 context 缺少所需 evidence，应重新 analyze 或调整报告内容，不得伪造 evidence。
- legacy string insight 应优先迁移为 structured insight。

## 13. 功能分期

### Phase 1：统一契约与覆盖率门槛

独立价值：CLI 可以确定性判断报告是否达到 100% evidence coverage。

- 增加统一 provenance schema 和内部 normalized 类型。
- 为 KPI、chart、insight 建立 eligible object classifier。
- 复用现有 path resolver 和 claim check。
- `spec validate --verify` 输出 coverage 和统一 issue。
- 核心 fixture 在 CI 中强制 100%。

### Phase 1.5：确定性 Provenance 生成

独立价值：减少 agent 手写 provenance 的 token 和出错成本。

- 为 registry entry 增加对象级 provenance recipe，而不是从 `requiredEvidence` 猜测。
- block/template instantiate 根据 recipe 写入精确 evidence path。
- 只有字段、aggregate、group 和 result shape 全部匹配时才自动生成。
- 无法确定映射时返回候选 path 和 patch hint，由 agent 明确选择。
- 支持单 path 短写，复杂对象保持完整结构。

### Phase 2：正确性校验收敛

独立价值：已覆盖对象进一步证明结论与 evidence 一致。

- 将 rank、share、trend、delta、correlation 强制映射到语义 check。
- 校验 chart transform 与 evidence recipe 的字段、聚合和分组兼容性。
- summary/deck 派生时保留 provenance，不允许仅复制文案。
- recurring update 对 evidence recipe 和 spec lineage 做变更检测。

### Phase 3：用户可解释性

独立价值：最终读者无需 CLI 即可检查报告依据。

- HTML evidence badge 和 drawer。
- Evidence Appendix 与 PDF 脚注。
- 展示口径、样本量、过滤条件和检查状态。
- 增加键盘操作、焦点管理和打印测试。

每个 Phase 均可独立发布；后续 Phase 未完成时，不影响前一阶段的可用性。

## 14. 验收标准

### 14.1 Happy path

- analyze → instantiate → validate → render 全链路成功。
- 3 个 KPI、3 张 chart、2 条 insight 的报告返回 `8/8` covered。
- HTML 中 8 个对象均可打开正确 evidence。
- 同一 evidence 的复用不会重复计入错误或 appendix。

### 14.2 Error path

- 缺失 evidence ID 时返回 `PROVENANCE_EVIDENCE_NOT_FOUND`。
- 无效 path 时返回 `PROVENANCE_PATH_NOT_FOUND`。
- 排名与 evidence 不一致时返回 `PROVENANCE_CHECK_FAILED`。
- 分析对象使用装饰豁免时返回 `PROVENANCE_EXEMPTION_INVALID`。
- coverage 低于 100% 时 strict validate 失败且列出全部缺失对象。

### 14.3 Edge cases

- 空数据和零 eligible object。
- evidence 返回空 rows。
- filter 后 denominator 为零。
- 时间点少于 3 个却声明趋势。
- 同一字段经过 derive、aggregate、sort、limit 后的 path 映射。
- legacy insight 与新 provenance 混用。
- recurring update 中字段缺失、类型变化或 recipe hash 变化。
- global filter 后 Current view 与 Published evidence 并存。
- runtime 无法复算某个 recipe 时保持发布值并显示降级状态。

### 14.4 产品验收

- 用户可在 2 次点击内从任意分析对象看到依据。
- evidence drawer 中不出现无法解释的内部对象结构。
- 不连接网络时所有依据仍可查看。
- 不提供 context 的非严格预览不会被标记为 verified。

## 15. 度量与发布

### 15.1 核心指标

- `object_coverage`
- `claim_check_coverage`
- `invalid_reference_count`
- `failed_claim_check_count`
- `legacy_insight_count`
- `evidence_drawer_open_rate`，仅在本地运行时统计且默认不上传

CLI 只输出本次运行指标，不建设遥测后台。

### 15.2 发布门槛

- 五类 golden fixture：sales、marketing、product、finance、operations。
- 每类至少包含 KPI、聚合 chart、趋势或排名 insight。
- 所有 fixture coverage 为 100%，claim check 为 100%。
- `npm run test:run`、`npm run build:cli`、工作流 smoke test 通过。
- 文档与 source skill 引用统一 provenance 契约，不编辑生成副本作为事实源。

### 15.3 回滚

- provenance 新字段保持可选读取，严格门槛通过命令路径控制。
- 若 renderer drawer 出现回归，可单独回滚 Phase 3，不影响 Phase 1/2 验证。
- 不修改原始数据和 evidence run history，不需要数据迁移回滚。

## 16. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| spec 变长，增加 agent token | 生成成本上升 | 单 path 短写；Phase 1.5 使用显式 registry recipe 自动生成 |
| 自动 provenance 尚未具备 | Phase 1 手写成本高 | Phase 1 先限定 golden fixture 和严格发布入口，不把自动生成作为前置依赖 |
| 为追求 100% 产生无关引用 | 覆盖率失真 | 校验 path 与字段、transform、claim type 兼容性 |
| legacy spec 大量失败 | 升级阻力 | 一个 minor 周期读取兼容，提供迁移 warning 和 patch hint |
| evidence 结果过大 | HTML 膨胀 | drawer 只嵌入相关结果、样本和 recipe metadata |
| check 默认容差不合理 | 错误放行或误报 | 按 check 类型固定默认值，并用边界 fixture 验证 |
| report/deck 规则漂移 | 维护成本上升 | 使用统一 normalized provenance 和 validator core |
| 运行时过滤后 evidence 失配 | 用户看到两个不同数字 | drawer 区分 Published evidence 与 Current view，并强制复用同一 recipe |
| validator 模块超过 500 行 | 违反仓库硬限制 | 按 reference、compatibility、coverage 三个子模块拆分，单文件目标低于 400 行 |

## 17. 实施交接

主要改动范围预计超过 8 个文件，应按 Phase 分 PR，避免在现有大型模块继续堆叠职责。

建议职责边界：

- `provenance-schema.ts`：统一 schema 和 normalized 类型。
- `provenance-classifier.ts`：eligible object 与豁免判定。
- `provenance-reference-validator.ts`：evidence ID 与 path。
- `provenance-compatibility.ts`：字段、transform、对象类型兼容性。
- `provenance-coverage.ts`：required check 与 coverage 汇总。
- `provenance-validator.ts`：编排前三者，不重复实现规则。
- `provenance-renderer.ts`：badge、drawer、appendix view model。
- `spec-schema.ts` / `types.ts`：接入公共契约。
- `spec-validator-intelligence.ts`：委托统一 validator，保留兼容映射。
- block/template/summary/deck 生成路径：写入并保留 provenance。
- focused tests + workflow smoke fixture：覆盖 happy、error 和 edge paths。

所有新增非测试 `.ts` 文件以 400 行为设计上限、500 行为硬上限；达到 350 行时优先按职责拆分，避免在交付末期被 `check:size` 阻塞。

数据流保持单向：

```text
AnalyzeContext.evidence
        |
        v
Spec.provenance -> normalized provenance -> validator -> coverage/issues
                                           |
                                           v
                                  verified render metadata
                                           |
                                           v
                               HTML drawer / PDF appendix
```

不存在外部 API、MCP、第三方服务或新增运行时依赖。
