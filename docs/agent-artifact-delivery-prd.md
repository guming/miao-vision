# Agent Artifact Delivery PRD

> 日期：2026-08-05
> 产品范围：`miao-viz-cli` / `skills/miao-vision`
> 状态：Proposal

## 1. 背景

Miao Vision 已经能够通过 Agent 工作流生成自包含的 HTML、PDF 和 PNG artifact，并以结构化 CLI 结果返回输出路径、Evidence 验证结果、覆盖率、交互报告分享安全状态和周期报告变化。

当前生成链路为：

```text
用户请求生成报告
→ Agent 调用 miao-viz
→ CLI 生成 HTML / PDF / PNG
→ CLI 返回路径和验证字段
→ Agent 用自然语言回复文件路径
→ 用户打开文件后才能判断结果
```

生成成功不等于用户感知任务已经完成。仅返回文件路径会留下以下问题：

- 不同 Agent 的交付格式不一致；
- 用户无法在对话中直观看到 artifact 的视觉结果；
- `verified`、`coverage`、`shareSafe` 和周期变化没有转化为用户可理解的信息；
- 正式产物、中间 Context、Spec 和 Profile 文件容易混在一起；
- Agent 可能重新读取完整 HTML 或 PDF 并生成摘要，增加 token 消耗和事实漂移风险；
- 周报、月报更新完成后，用户不能立即看出本期相对上期的主要变化；
- 用户不知道下一步应该打开、导出、检查、比较还是继续更新。

本 PRD 定义统一的 Artifact Delivery 交付层，让 Agent 在对话中以低 token、可验证、可降级的方式呈现最终 artifact。

## 2. 产品定位

Artifact Delivery 是 Miao Vision 的统一产物交付层。

它将 CLI 已生成的正式产物、视觉预览、验证状态、有限摘要和后续动作组织成机器可读的 Delivery Manifest，由 Agent 在对话中呈现为一致的交付卡。

```text
CLI = 计算、验证、渲染、组织交付数据
Agent = 调用工作流、处理异常、呈现交付结果
客户端 = 展示预览、链接和可用操作
```

产品承诺：

> 用户无需打开文件，就能知道生成了什么、结果是否可信，以及下一步可以做什么。

Artifact Delivery 不是 Artifact Studio，不承担 artifact 的资产管理、自由编辑、托管或多人协作。

## 3. 用户价值

### 3.1 核心价值

| 用户问题 | 交付能力 | 用户价值 |
| --- | --- | --- |
| 不知道生成了什么 | 标题、类型、周期和视觉预览 | 降低理解与打开成本 |
| 不知道结果是否可靠 | 验证、Evidence 覆盖和分享安全状态 | 建立交付信任 |
| 不知道报告讲了什么 | 最多三个 KPI 和两条关键变化 | 快速判断 artifact 是否有价值 |
| 不知道下一步做什么 | 打开、导出、更新、比较等有限动作 | 推动任务真正完成 |

### 3.2 核心用户故事

> 当 Agent 完成一份报告后，我希望在对话中立即看到报告长什么样、是否可信以及可以做什么，从而不必理解文件路径、CLI 输出或中间文件。

### 3.3 产品价值边界

Artifact Delivery 不直接提升图表或内容质量。它提升的是：

- 用户对任务完成的感知；
- artifact 被打开和使用的概率；
- Evidence 与分享安全能力的可见性；
- 周期报告继续更新的转化率；
- 不同 Agent 和客户端之间的交付一致性；
- Agent 的 token 使用稳定性。

## 4. 目标用户与场景

### 4.1 一次性数据报告

用户提供 CSV、TSV、XLSX 或 JSON，让 Agent 生成报告。生成完成后，用户立即看到预览、关键指标、验证状态和正式 HTML/PDF 入口。

### 4.2 周报和月报更新

用户为已存在的 recurring report project 提供新一期数据。生成完成后，用户看到当前周期、正式 artifact、相对 baseline 的变化和异常状态。

### 4.3 Browser Deck

用户生成浏览器 Deck。Agent 展示封面或多页 contact sheet，并提供 HTML 和 PDF 入口。

### 4.4 Article Infographic

用户生成文章信息图。Agent 展示 PNG 预览，并提供 HTML、PNG 或 PDF 正式产物入口。

## 5. 产品目标

- 为 report、recurring report、deck 和 article 提供统一交付结构；
- Agent 默认在对话中展示 artifact 视觉预览；
- 正式 HTML、PDF 或 PNG 可以通过一次点击打开；
- 状态必须来自 CLI 结构化验证结果，而不是 Agent 主观判断；
- KPI 和变化摘要只能来自已验证 Evidence 或确定性 changes 结果；
- 周期报告必须显示当前 period 和相对 baseline 的变化；
- Agent 不需要读取完整 HTML 或 PDF 才能完成交付；
- 默认交付回复控制在 300 tokens 以内；
- 不支持原生交付卡的客户端能够降级为 Markdown；
- 保持 artifact 自包含、本地优先且可脱离 Agent 客户端独立使用。

## 6. 非目标

本项目不做：

- Artifact Studio 或独立资产管理后台；
- artifact 文件库、全文搜索、标签和收藏；
- 拖拽式报告或 Deck 编辑器；
- HTML、PDF 或 PNG 在线编辑；
- 云托管、公开分享链接和账号系统；
- 多人协作、评论和审批；
- 定时任务调度；
- 让 LLM 重新阅读和总结完整 artifact；
- 使用视觉模型评估报告质量；
- 在 Delivery Manifest 中嵌入原始数据；
- 改变 HTML、PDF 和 PNG 作为正式交付物的产品定位；
- 在 Web App 中复制 CLI 的验证、Evidence 或渲染逻辑。

## 7. 设计原则

### 7.1 正式 artifact 优先

预览图用于帮助用户判断是否打开，HTML、PDF 或 PNG 仍是正式交付物。预览不能替代正式文件。

### 7.2 CLI 计算，Agent 呈现

CLI 负责生成所有确定性字段。Agent 只能选择合适的呈现方式，不能重新计算 KPI、重写验证状态或自由总结整份 artifact。

### 7.3 Evidence-first

所有展示数字必须来自已验证 Evidence。周期变化必须来自 recurring report 的确定性变化结果。

### 7.4 渐进披露

默认交付只展示足够判断结果的信息。完整 Evidence、Spec、Context 和诊断内容按需打开，不进入默认对话回复。

### 7.5 客户端无关

Delivery Manifest 声明产物、状态和语义动作，不声明特定客户端的按钮组件或样式。

### 7.6 可降级

PNG、PDF 或客户端卡片不可用时，必须仍能通过 Markdown、HTML 路径和结构化状态完成交付。

## 8. 核心体验

### 8.1 交付卡结构

交付卡固定包含五个区域，优先级不可由 Agent 随意改变：

1. 状态；
2. 视觉预览；
3. 正式产物入口；
4. 关键摘要；
5. 后续动作。

示例：

```text
┌────────────────────────────────────────────┐
│ 销售经营周报 · 2026-W32          ✓ 已验证 │
│                                            │
│          artifact 视觉预览                 │
│                                            │
│ ¥128.4万 营收   +12.3% 环比                │
│ 华东增长最快 · 1 项需要关注                │
│                                            │
│ [打开 HTML] [查看 PDF] [查看证据]          │
│ 建议：用下周数据更新                       │
└────────────────────────────────────────────┘
```

### 8.2 Report 预览

- 默认使用已存在的 PNG 导出能力生成报告预览；
- 第一版使用完整报告截图或当前 PNG 输出，不新增视觉模型；
- 预览失败时不阻止 HTML 交付；
- 预览只作为辅助 artifact，不改变正式 HTML 的内容。

### 8.3 Deck 预览

- 最小版本使用 Deck 封面作为预览；
- 后续可以生成最多六页的 contact sheet；
- contact sheet 必须由确定性浏览器截图生成，不使用生成式视觉模型；
- PDF 失败但 HTML 成功时，仍可交付 HTML。

### 8.4 Article 预览

- 优先使用正式 PNG 输出作为预览；
- 如果用户只请求 HTML，则可以额外生成低成本 PNG 预览；
- PNG 失败时降级为 HTML 链接和文本状态。

## 9. 状态模型

### 9.1 用户可见状态

| 状态 | 用户文案 | 呈现规则 |
| --- | --- | --- |
| `ready` | 已生成并验证 | 正常展示和交付 |
| `needs_review` | 已生成，需要检查 | 黄色提示并列出主要原因 |
| `restricted` | 不建议分享 | 不显示“可安全分享”，突出风险 |
| `failed` | 生成失败 | 不展示成功卡，显示错误和修复建议 |
| `missing` | 产物文件不可用 | 保留元信息，禁用对应入口 |

### 9.2 验证与分享安全

`verified` 和 `shareSafe` 表达不同语义，不得合并：

- `verified`：artifact 中的内容是否通过 Evidence 和 Spec 验证；
- `coverage`：适用验证对象的 Evidence 覆盖率；
- `shareSafe`：交互 artifact 是否满足第三方交付的数据暴露与安全条件。

只有 `shareSafe: true` 时，Agent 才能显示“可安全分享”。静态 artifact 没有 `shareSafe` 字段时，不应推断为不安全或安全。

## 10. Delivery Manifest

### 10.1 目标

Delivery Manifest 是 CLI 与 Agent 之间的稳定交付协议。它让 Agent 无需解析不同命令的输出结构，也无需读取完整 artifact。

### 10.2 建议结构

```json
{
  "schemaVersion": 1,
  "kind": "report",
  "status": "ready",
  "title": "销售经营周报",
  "period": "2026-W32",
  "artifacts": {
    "primary": {
      "format": "html",
      "path": "/absolute/path/report.html"
    },
    "alternatives": [
      {
        "format": "pdf",
        "path": "/absolute/path/report.pdf"
      }
    ],
    "preview": {
      "format": "png",
      "path": "/absolute/path/report.png"
    }
  },
  "verification": {
    "verified": true,
    "coverage": 1,
    "shareSafe": true
  },
  "summary": {
    "metrics": [],
    "highlights": [],
    "changeCounts": {
      "up": 3,
      "down": 1,
      "warnings": 0
    }
  },
  "actions": [
    "open_primary",
    "open_pdf",
    "update_period"
  ]
}
```

### 10.3 字段规则

#### 顶层字段

- `schemaVersion`：Delivery Manifest schema 版本，第一版固定为 `1`；
- `kind`：`report`、`recurring-report`、`deck` 或 `article`；
- `status`：用户可见状态模型中的稳定枚举；
- `title`：来自已验证 Spec、项目配置或 article spec；
- `period`：仅 recurring report 必填，其他类型省略。

#### Artifact 字段

- 所有路径使用绝对路径，减少 Agent 和客户端二次解析；
- `primary` 必须明确当前任务的主交付物；
- `alternatives` 只包含实际成功写入的 artifact；
- `preview` 只在文件实际存在时返回；
- Manifest 不包含 context、profile、spec 等中间文件，除非它们被显式归类为诊断资源。

#### Verification 字段

- `verified` 直接复用 CLI 验证结果；
- `coverage` 直接复用 provenance coverage，不由 Agent 计算；
- `shareSafe` 只在当前 artifact 适用时返回；
- `status` 必须从结构化验证、warning 和分享安全结果确定性映射。

#### Summary 字段

- `metrics` 最多三个；
- `highlights` 最多两条；
- 所有数字必须引用已验证 Evidence ID 和路径；
- recurring report 的 `changeCounts` 来自确定性 changes 结果；
- Summary 不允许包含 Agent 自由生成的长文本；
- 缺少可靠摘要时返回空数组，不猜测内容。

#### Actions 字段

第一版允许以下语义动作：

- `open_primary`；
- `open_pdf`；
- `open_preview`；
- `inspect_evidence`；
- `update_period`；
- `compare_previous`；
- `show_in_folder`。

每个 Manifest 最多返回三个推荐动作。动作必须根据现有 artifact 和项目状态确定性生成，不得指向当前工作流不支持的能力。

### 10.4 输出方式

第一版将 `delivery` 作为现有 `{ ok: true, value }` 中的新增字段，不改变现有 `output`、`artifacts`、`verified`、`coverage`、`shareSafe` 和 recurring report 返回字段。

兼容示例：

```json
{
  "ok": true,
  "value": {
    "output": ["/absolute/path/report.html"],
    "verified": true,
    "delivery": {
      "schemaVersion": 1,
      "kind": "report",
      "status": "ready"
    }
  }
}
```

旧 Agent 可以继续读取现有字段，新 Agent 优先读取 `value.delivery`。

## 11. Agent 呈现规范

### 11.1 成功交付

Agent 必须：

- 第一行说明 artifact 已生成及其状态；
- 客户端支持时直接展示本地 PNG 预览；
- 提供主 artifact 的可点击链接；
- 最多显示三个 KPI、两条 highlight 和三个动作；
- 周期报告显示 period 和 baseline 变化；
- 使用 Delivery Manifest 的字段，不读取完整 HTML 或 PDF；
- 默认不展示 Context、Profile、Spec 或临时文件路径。

### 11.2 Needs review

Agent 必须：

- 明确使用“需要检查”，不能显示纯成功状态；
- 展示最重要的一个或两个结构化原因；
- 说明正式 artifact 是否仍然可打开；
- 不使用“已验证”或“可安全分享”等冲突表述。

### 11.3 Restricted

Agent 必须：

- 明确说明当前 artifact 不建议交付第三方；
- 展示导致 restricted 的主要结构化问题；
- 不自动发布、发送或生成分享承诺；
- 保留本地预览和修复入口。

### 11.4 失败交付

Agent 必须：

- 优先展示结构化错误代码、用户语言描述和可执行修复建议；
- 不展示成功卡；
- 如果 HTML 成功但 PDF 或 preview 失败，则按部分成功交付 HTML；
- 不为了补全交付而切换到未授权的渲染器或上传服务。

### 11.5 Markdown 降级

客户端不支持原生卡片或本地图片时，Agent 使用以下顺序输出：

1. 状态和标题；
2. 主 artifact 链接或绝对路径；
3. 最多三个指标；
4. 主要 warning；
5. 最多三个后续动作。

降级不能触发新的 LLM 总结。

## 12. Token 与体积预算

### 12.1 Agent token 预算

| 内容 | 上限 |
| --- | ---: |
| KPI | 3 个 |
| Highlights | 2 条 |
| Actions | 3 个 |
| 默认 Agent 交付回复 | 300 tokens |
| 完整 HTML/PDF 进入模型上下文 | 禁止 |

### 12.2 Manifest 预算

- 建议序列化大小不超过 8 KB；
- 不包含原始数据行；
- 不包含完整 Analyze Context；
- 不包含完整 Evidence 结果；
- Metrics 只保存展示值以及对应 Evidence 引用；
- 错误详情继续使用现有结构化错误，不复制进成功 Manifest。

### 12.3 成本原则

```text
CLI 计算摘要、验证、变化
→ 生成 Delivery Manifest 和预览 PNG
→ Agent 读取少量结构化字段
→ 输出低于 300 tokens 的交付结果
```

PNG、HTML、PDF 和 Manifest 均由本地确定性工具生成，不使用模型 token。Agent 只负责呈现 Manifest。

## 13. 工作流

### 13.1 一次性 Report

```text
data analyze
→ spec instantiate / author
→ spec validate --verify
→ render report
→ 生成 HTML / 可选 PDF / PNG preview
→ 生成 Delivery Manifest
→ Agent 呈现交付卡
```

### 13.2 Recurring Report

```text
report info
→ report update
→ 校验 Data Contract
→ 重放 Evidence Plan
→ 生成 changes
→ 渲染当前 Run
→ 生成 Delivery Manifest
→ Agent 呈现本期与 baseline 变化
```

### 13.3 部分失败

```text
HTML 成功
→ PDF 或 preview 失败
→ 保留成功 artifact
→ Delivery status = needs_review 或 ready + warning
→ Agent 交付 HTML 并说明缺失格式
```

状态映射必须由失败类型和现有 CLI 错误严重性确定，不能由 Agent 临时决定。

## 14. 产品与架构边界

```text
miao-viz CLI
  ├── analyze / validate / render
  ├── HTML / PDF / PNG artifacts
  ├── verification / changes / share safety
  └── Delivery Manifest
               ↓
Miao Vision Skill
  ├── 调用工作流
  ├── 读取 Delivery Manifest
  └── 选择卡片或 Markdown 呈现
               ↓
Agent Client
  ├── 展示本地图片
  ├── 提供文件链接
  └── 显示上下文动作
```

依赖必须保持单向：客户端和 Skill 不得成为验证、Evidence、摘要计算或渲染逻辑的 source of truth。

## 15. 分期

### Phase 1：Skill 交付规范

独立价值：无需修改 CLI 协议，即可复用现有 PNG、HTML/PDF 路径和验证结果，统一 Agent 回复。

范围：

- 在 source skill 中增加统一交付规则；
- Report 默认展示 PNG 预览和正式 artifact 链接；
- 限制指标、highlight、动作和 token 数量；
- 增加成功、needs review、restricted、failed 和 Markdown 降级规则；
- 不新增服务或客户端 UI。

### Phase 2：Delivery Manifest

独立价值：CLI 提供稳定协议，不同 Agent 无需了解各命令的输出差异。

范围：

- 增加 Delivery Manifest schema 和 TypeScript 类型；
- 为 report、recurring report、deck 和 article 生成 `value.delivery`；
- 复用现有 PNG、verified、coverage、shareSafe、artifacts 和 changes；
- 保持现有结构化输出向后兼容；
- 增加 schema、命令和工作流测试。

### Phase 3：客户端原生卡片

独立价值：支持 Delivery Manifest 的客户端可以提供更直观的按钮、状态和预览布局。

范围：

- 将 Manifest 映射为客户端原生 Artifact Card；
- 不支持的客户端继续使用 Markdown；
- 不把客户端组件引入 CLI；
- 不新增云服务或 artifact 数据库。

每个 Phase 都必须可独立合并和使用。如果 Phase 3 永不实施，Phase 1 和 Phase 2 仍然构成完整的低 token 交付体验。

## 16. 验收标准

### 16.1 Report 正常路径

- CLI 成功生成 HTML 和 PNG；
- Delivery Manifest 通过 schema 校验；
- `primary` 指向实际存在的 HTML；
- `preview` 指向实际存在的 PNG；
- Agent 展示预览、验证状态和主 artifact 链接；
- KPI 与其 Evidence 引用一致；
- Agent 默认交付回复不超过 300 tokens。

### 16.2 Recurring Report

- Manifest 包含当前 period；
- `changeCounts` 与当前 Run 的 changes 一致；
- 所有 artifact 路径指向当前 Run；
- baseline 缺失时省略比较信息，不生成虚构变化；
- Agent 不误把上一期 artifact 当作当前交付物。

### 16.3 Deck 与 Article

- Deck 至少提供 HTML 主产物和封面预览；
- Article 优先复用正式 PNG 作为预览；
- PDF 不存在时不显示 `open_pdf`；
- 所有 alternatives 都对应实际存在的文件。

### 16.4 Review 与 Restricted

- 存在阻止纯成功交付的 warning 时不显示绿色 ready；
- 用户能看到最重要的结构化原因；
- `shareSafe: false` 时不显示“可安全分享”；
- restricted artifact 不触发发布或发送动作。

### 16.5 失败与降级

- Preview 失败但 HTML 成功时，HTML 仍可交付；
- PDF 失败但 HTML 成功时，不丢失 HTML；
- 路径不存在时对应 artifact 状态为 missing 或不返回；
- Manifest 解析失败时，Agent 回退到现有结构化 CLI 输出；
- 不支持图片的客户端能够完整展示 Markdown 降级结果。

### 16.6 安全性

- Manifest 不包含原始数据行；
- Summary 数字全部可以追溯到 Evidence；
- 本地路径不会被自动上传；
- 交互报告只有 `shareSafe: true` 才显示安全分享表述；
- Agent 不读取完整 artifact 以补写摘要。

## 17. 测试范围

### 17.1 单元测试

- Delivery Manifest schema 的合法和非法输入；
- 状态映射；
- Artifact 主次选择；
- Metrics 和 actions 数量限制；
- 不适用字段的省略；
- 相对路径转绝对路径；
- 缺失 artifact 过滤；
- recurring report changeCounts 映射。

### 17.2 CLI 集成测试

- `render report` 的 HTML + PNG 交付；
- `render report` 的 HTML + PDF + PNG 交付；
- `report update` 的当前 Run 和 baseline changes；
- Deck HTML/PDF 与预览；
- Article HTML/PNG/PDF；
- Preview 或 PDF 部分失败；
- trusted interactive report 的 shareSafe 状态。

### 17.3 Agent 工作流测试

- 正常交付卡；
- needs review 交付；
- restricted 交付；
- failed 交付；
- 不支持本地图片时的 Markdown 降级；
- 默认回复 token 预算；
- 不读取完整 HTML/PDF。

### 17.4 手工验收

- 用户能在不打开正式文件的情况下说出 artifact 类型、状态和主要指标；
- 用户只需一次点击即可打开主 artifact；
- 周报更新后用户能直接识别本期相对上期的变化；
- 中间 Context、Profile 和 Spec 不出现在默认交付中；
- artifact 离开 Agent 客户端后仍可独立打开和分享。

## 18. 成功指标

第一版记录以下指标：

- artifact 生成后的打开率；
- 从生成完成到首次打开的时间；
- 用户追问“文件在哪”“怎么看”“是否成功”的比例；
- 生成后继续执行导出、比较或周期更新的比例；
- Preview 生成成功率；
- Delivery Manifest schema 成功率；
- Markdown 降级率；
- Agent 交付回复 token 中位数。

建议目标：

- 90% 以上成功任务显示预览；
- 95% 以上交付卡的主 artifact 可打开；
- Agent 交付回复 token 中位数低于 250；
- 不增加任何模型侧完整 artifact 读取；
- recurring report 能够正确显示 period 和 baseline change；
- Delivery Manifest 失败不影响现有 artifact 生成与结构化输出。

## 19. 风险与缓解

### 19.1 用户不打开 artifact 的原因判断错误

风险：用户不打开 artifact 可能是内容质量不足，而不是交付不直观。

缓解：实施前记录当前打开率、打开后行为和文件位置追问比例。上线后比较预览曝光与正式 artifact 打开的转化变化。

### 19.2 预览增加生成时间

风险：Playwright PNG 导出会增加本地渲染时间。

缓解：预览失败不阻止 HTML；复用现有浏览器导出路径；记录预览耗时；后续再根据数据决定是否默认生成低分辨率首屏图。

### 19.3 CLI 输出膨胀

风险：Manifest 复制完整 Evidence 或诊断数据，增加 Agent 上下文和维护成本。

缓解：8 KB 建议预算；只包含最多三个 metric 和两个 highlight；完整 Evidence 保持外部引用。

### 19.4 客户端能力不一致

风险：部分 Agent 客户端不能显示本地图片或可点击路径。

缓解：协议保持客户端无关；Skill 提供固定 Markdown 降级；正式 artifact 始终保留本地绝对路径。

### 19.5 状态语义混淆

风险：`verified`、`coverage`、`shareSafe` 和 Run status 被错误合并成单一成功状态。

缓解：PRD 冻结字段语义；状态映射在 CLI 中确定性实现；Agent 不自行解释原始字段。

## 20. 最脆弱假设与决策门槛

本 PRD 假设：用户没有打开 artifact 的主要原因之一是交付不直观，而不是 artifact 本身质量不足。

如果基线数据显示用户已经频繁打开 artifact，但打开后很快退出或不继续操作，则优先级应转向报告内容质量、视觉质量或加载体验，不应继续扩大交付卡范围。

在进入 Phase 3 前，至少满足以下一个信号：

- 预览显著提升正式 artifact 打开率；
- 用户频繁使用交付卡中的后续动作；
- 多个 Agent 客户端希望复用统一 Delivery Manifest；
- Markdown 交付已经成为明显的体验瓶颈。

## 21. 发布与回滚

### 21.1 发布

- Phase 1 更新 source skill，并通过现有 build/pack 流程刷新分发副本；
- Phase 2 以向后兼容字段发布，不移除任何现有 CLI 返回字段；
- 更新 README 和 Skill reference，说明交付行为与客户端降级；
- 使用 report、recurring report、deck 和 article fixtures 做发布前 smoke test。

### 21.2 回滚

- Phase 1 可以回滚 Skill 交付规范，不影响 artifact 文件；
- Phase 2 可以停止返回 `value.delivery`，旧字段仍保持可用；
- Delivery Manifest 不写入用户原始数据，不需要数据迁移；
- Phase 3 客户端可以回退到 Markdown，不影响 CLI 和已生成 artifact。

## 22. 依赖

本项目不需要 API key、远程服务或第三方账号。

现有依赖：

- Miao Vision CLI 的结构化 `{ ok, value }` 输出；
- 现有 HTML、PDF 和 PNG 渲染能力；
- Playwright Chromium，用于现有 PDF/PNG 浏览器导出；
- Evidence、provenance、share safety 和 recurring report changes；
- Agent 客户端的本地文件链接与可选本地图片展示能力。

## 23. 已批准设计摘要

- **Building**：统一的 Agent Artifact Delivery 层，由 Skill 交付规范和 CLI Delivery Manifest 组成，让用户在对话中看到预览、状态、有限摘要、正式 artifact 和后续动作。
- **Not building**：Artifact Studio、资产管理、编辑器、云托管、多人协作、LLM 全文总结和视觉模型质检。
- **Approach**：先统一 Skill 的低 token 交付行为，再在 CLI 中增加向后兼容的 Delivery Manifest，最后依据真实使用数据决定是否建设客户端原生卡片。
- **Key decisions**：CLI 是交付数据 source of truth；摘要只能来自 Evidence；PNG 预览复用现有能力；默认回复不超过 300 tokens；所有客户端必须可降级到 Markdown。
- **Unknowns**：客户端原生卡片的具体组件由未来客户端负责人在 Phase 3 决定，因为它不影响前两阶段的协议与用户价值。
