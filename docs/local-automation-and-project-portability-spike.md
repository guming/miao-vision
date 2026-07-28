# 本地定时运行与 Report Project 迁移技术 Spike

> 状态：Evaluated
> 日期：2026-07-28

## 1. 结论

两项能力均可基于现有 Report Project 实现，但不应直接加入当前 CLI：

- 定时运行涉及操作系统任务管理、凭据环境、失败通知和删除权限，需要独立 PRD。
- 项目迁移涉及源数据路径、输入副本、Schema 升级和压缩包安全，需要版本化导入协议。

## 2. 本地定时运行

建议 CLI 只生成可审查的任务描述，不直接常驻：

```text
report schedule inspect <project>
report schedule export <project> --platform cron|launchd|task-scheduler
```

导出的任务调用现有 `report update`，输入路径由用户显式配置。默认不安装、不启用、不删除系统任务。

主要风险：

- 新一期文件发现规则不明确；
- 后台环境缺少 Playwright、字体或文件权限；
- 连续失败没有通知通道；
- 自动清理可能造成不可恢复的数据删除。

后续 PRD 必须定义输入发现、幂等运行、日志、通知和卸载流程。

## 3. Report Project 导入与导出

建议使用带清单的 ZIP：

```text
project.json
data-contract.json
evidence-plan.json
preferences.json
report.yaml
runs/                  # 默认不包含，可显式选择
export-manifest.json   # 文件哈希、Schema 版本、导出时间
```

导入流程必须先解压到临时目录，拒绝绝对路径、`..` 路径和符号链接，验证全部哈希与 Schema 后再移动到目标位置。

默认不包含源数据；若用户明确选择包含，必须在导出预览中列出文件和大小。

主要风险：

- 项目中的绝对输入路径在另一台机器失效；
- 旧 Schema 需要逐版本迁移；
- ZIP 路径穿越和恶意超大压缩包；
- 运行历史可能包含敏感数据或本地路径。

后续 PRD 必须定义兼容矩阵、迁移失败回滚、隐私清单和最大包体限制。
