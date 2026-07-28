# Miao Vision 智能报告工作流 PRD

> 状态：Proposal
> 日期：2026-07-28
> 产品范围：`miao-viz-cli`、`skills/miao-vision`

## 1. 产品目标

在现有确定性报告流水线之上，补齐业务场景入口、报告派生摘要、可控修改和跨期变化表达，使用户更容易把本地数据持续转成可信、可交付的报告。

产品承诺：

> CLI 负责确定性分析、验证和渲染；Agent 负责理解意图、选择模板和组织修改。所有最终数字与结论仍须通过 CLI 验证。

## 2. 产品架构

```text
用户意图与本地数据
        ↓
Agent：识别场景、选择模板、提出修改
        ↓
CLI：analyze → instantiate → validate → render
        ↓
HTML / PDF / Report Project
```

边界说明：

- CLI 不提供自然语言对话能力。
- Agent 不直接计算或猜测指标。
- CLI 通过结构化结果、Evidence 和 Patch Hints 为 Agent 提供可靠操作接口。
- 网页抓取、PDF 表格识别等非结构化输入处理留在 Agent 层。

## 3. 当前能力基线

以下能力已经交付，不再作为本 PRD 的建设目标：

- 支持 CSV、TSV、XLSX、JSON 数据。
- 提供 10 个 Report Template 和 6 个基础 Report Block。
- 支持模板匹配、检查和实例化。
- 支持 `$evidence:` 引用、Evidence 路径验证及 `validate --verify --strict`。
- 支持机器可读的校验错误和 `--patch-hints`。
- 支持自包含 Report HTML、Report PDF 和单图 SVG。
- 支持 `report init/update/info/history/clean` 本地周期报告项目。
- Article Infographic 已支持 HTML、PNG 和 PDF。

现有模板偏向通用分析结构，例如快照、趋势排行、构成、分布、转化、差异和关系分析；它们尚未形成用户可直接理解的完整业务场景体系。

## 4. 增量产品功能

### 4.1 业务场景入口

为现有 Template 增加业务语义层。场景负责定义推荐指标、分析问题、章节顺序和适用条件，最终仍编译为现有 Report Spec。

首批场景：

| 场景 | 交付方式 |
|---|---|
| 经营概览 | 映射并组合现有快照、趋势和排行模板 |
| 销售分析 | 增加销售指标与维度约定，复用现有通用模板 |
| 营销效果 | 新增 CTR、CPA、转化等场景规则 |
| 财务摘要 | 新增收入、成本、利润及差异分析规则 |
| 问卷分析 | 增加题目分布、交叉分析和样本说明规则 |
| A/B 测试 | 新增实验指标、置信区间和显著性说明规则 |
| 数据质量审计 | 新增缺失、重复、异常和字段质量规则 |

CLI 输出可用场景、被阻止场景及原因；Agent 根据用户意图完成选择。场景定义必须复用 Catalog、Block 和 Template，不建立第二套渲染体系。

### 4.2 从现有报告派生管理层摘要

新增“从报告派生摘要”能力，而不是再次生成一份独立 Scorecard。

输入：

- 已验证的 Report Spec
- Analyze Context 与 Evidence
- 可选的摘要长度和关注重点

输出：

- 核心指标及同比、环比变化
- 最重要的趋势、异常和风险
- 基于证据的行动建议
- 每条结论对应的 Evidence ID 或原报告章节

派生摘要不得重新定义指标口径；原报告更新后可重新生成摘要并保持引用有效。

### 4.3 Agent 驱动的局部修改

局部修改是 Agent 工作流，不是 CLI 内置自然语言编辑器。

工作方式：

1. Agent 读取用户修改意图和现有 Spec。
2. CLI 返回校验问题、影响范围和 Patch Hints。
3. Agent 对 Spec 做最小修改。
4. CLI 重算必要 Evidence，并执行严格验证。
5. 验证通过后重新渲染。

首期支持修改章节、指标、维度、时间范围、图表类型和文字语气。未受影响的 Spec 节点保持不变，并输出变更摘要。

### 4.4 周期报告增强

复用现有 Report Project，不重复建设项目管理命令。新增：

- 本期与上期的核心指标变化摘要
- 新增异常、消失异常和排名变化
- 字段兼容问题的可操作修复提示
- 可选的本地定时运行入口
- Report Project 的导入、导出和迁移

### 4.5 输入与导出补齐

- 改善多 Sheet 选择和字段映射。
- 支持多个结构兼容文件的合并分析。
- 为 Data Report 增加 PNG 导出；Article PNG 已有能力保持不变。
- 保持 HTML 为默认交付物，PDF 用于打印和归档。

## 5. 非目标

- 云端数据库和数据上传
- 多人实时协作与审批
- 任意拖拽式报表设计器
- 自动因果推断
- 原生可编辑 PPTX
- CLI 内的自然语言聊天、网页抓取或非结构化 PDF 解析

## 6. Roadmap

### P0：业务场景产品化

- 建立 Scene → Template/Block 的机器可读映射。
- 上线经营概览、销售分析、营销效果和财务摘要。
- CLI 返回场景推荐、适用条件和阻止原因。
- Skill 使用场景入口完成选择与实例化。

**完成标准：** 四类业务需求均有明确入口，并通过真实数据端到端生成与验证。

### P1：派生摘要与可控修改

- 实现从已验证报告派生管理层摘要。
- 保留摘要结论到 Evidence 和原章节的引用。
- 定义 Agent Edit Contract、影响范围和变更摘要。
- 为局部修改增加回归测试。

**完成标准：** 摘要不产生新口径；常见修改无需重建未受影响章节。

### P1：周期变化表达

- 在现有 Report Project 中加入跨期指标、异常和排名变化。
- 改进数据契约失败的修复提示。
- 补充周期更新的端到端测试。

**完成标准：** 更新项目后能直接说明“本期发生了什么变化”，且全部变化可追溯。

### P2：场景与交付扩展

- 上线问卷、A/B 测试和数据质量审计场景。
- 支持多文件合并与更清晰的字段映射。
- 增加 Data Report PNG 导出。
- 评估本地定时运行和项目迁移能力。

**完成标准：** 新场景通过固定测试语料；新增输入和导出路径具备结构化错误与稳定性测试。

## 7. 验收方式

每项功能使用固定测试语料验收，至少覆盖：

- `data analyze`
- Scene/Template 实例化
- `spec validate --context --verify --strict`
- Report HTML/PDF 渲染
- 对应增量功能的黄金结果或结构断言

本 PRD 暂不设置成功率类 KPI；在建立可重复测试语料和运行记录后，再补充基线与目标值。

## 8. 文档关系

本 PRD 是智能报告体验的上层产品规划，复用以下已存在能力，不替代其详细设计：

- [Catalog 产品化 PRD v2](./catalog-productization-prd-v2.md)：已完成的 Template、Block、Catalog 基础。
- [报告生成稳定性实施计划](./report-generation-stability-implementation-plan.md)：Evidence、验证与端到端可靠性基础。
- [周期报告复用与 PDF 导出 PRD](./recurring-report-and-pdf-export-prd.md)：Report Project 与 PDF 的详细设计；本 PRD 仅定义其增量体验。
