# Miao Vision

> 🔒 Local-First Data Analytics Framework - 在浏览器中进行数据分析，数据永不离开本地

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-orange)](https://svelte.dev/)
[![DuckDB-WASM](https://img.shields.io/badge/DuckDB--WASM-1.29-yellow)](https://duckdb.org/docs/api/wasm)

---

## ✨ 核心特点

- 🔒 **隐私优先** - 所有数据处理在浏览器端完成，数据永不上传云端
- ⚡ **零成本部署** - 纯静态网站，免费托管到 Vercel/Netlify，年省 $5,000+
- 📝 **Markdown 驱动** - 用 Markdown + SQL 编写报告，10 分钟搭建仪表板
- 🚀 **专业级性能** - DuckDB-WASM 引擎，百万行数据查询 < 1 秒
- 🎨 **43+ 组件** - 开箱即用的图表、输入、UI 组件，覆盖 90% 需求

**适合场景**：个人数据分析 • 敏感数据报告 • 小团队 BI • 数据教学 • 离线分析

👉 **[为什么选择 Miaoshou?](./PRODUCT_OVERVIEW.md)** - 详细了解产品价值和适用场景

---

## 🚀 快速开始

### 安装和运行

```bash
# 1. 克隆项目
git clone https://github.com/your-username/miaoshou-vision.git
cd miaoshou-vision

# 2. 安装依赖
npm install

# 3. 启动开发服务器（⚠️ 必须使用，不要直接打开 HTML）
npm run dev

# 4. 浏览器访问
# http://localhost:5173
```

### 其他命令

```bash
npm run check          # TypeScript/Svelte 类型检查
npm run build          # 生产构建
npm run preview        # 预览生产构建
npm run check:size     # 检查文件大小（限制 500 行）
```

> ⚠️ **重要**：必须使用 `npm run dev` 启动，因为 DuckDB-WASM 需要特定的 CORS 头（SharedArrayBuffer 支持）

---

## 📖 30 秒示例

创建一个销售分析报告只需要简单的 Markdown：

````markdown
# 销售分析报告

## 数据加载

```sql sales_data
SELECT * FROM 'sales.csv'
```

## 筛选条件

```daterange
name: date_filter
title: 选择日期范围
```

## 数据查询

```sql filtered_sales
SELECT
  region,
  SUM(revenue) as total_revenue,
  COUNT(*) as order_count
FROM sales_data
WHERE date BETWEEN ${date_filter.start} AND ${date_filter.end}
GROUP BY region
```

## 可视化

```barchart
data: filtered_sales
x: region
y: total_revenue
title: 各区域收入对比
```

**总收入**: ${filtered_sales.reduce((sum, row) => sum + row.total_revenue, 0).toLocaleString()}
````

**就这么简单！** 改变日期范围，图表自动更新。

---

## 📚 文档导航

### 产品文档
- 📘 **[产品概述](./PRODUCT_OVERVIEW.md)** - 为什么选择 Miaoshou、使用场景、竞品对比
- 📗 **[功能路线图](./FEATURE_ROADMAP.md)** - v1.0 状态、未来规划、发布时间表
- 📕 **[组件速查](./COMPONENTS_QUICK_REFERENCE.md)** - 43 个组件的完整文档和示例
- 📙 **[设计系统](./UI_DESIGN_SYSTEM.md)** - Gemini 风格设计规范、组件样式

### 技术文档
- 🏗️ **[架构总览](./docs/ARCHITECTURE_OVERVIEW.md)** - 5 层架构、依赖规则、设计原则
- 🔌 **[插件架构](./docs/PLUGIN_ARCHITECTURE.md)** - 如何开发自定义组件
- 💾 **[数据源架构](./docs/DATA_SOURCES_ARCHITECTURE.md)** - 连接器系统、多数据源支持
- 🗄️ **[持久化架构](./docs/DUCKDB_PERSISTENCE_ARCHITECTURE.md)** - OPFS 持久化实现
- 🎨 **[状态管理](./docs/MOSAIC_STATE_MANAGEMENT.md)** - Mosaic 图表状态同步

### 开发文档
- 👨‍💻 **[CLAUDE.md](./CLAUDE.md)** - 面向 Claude Code 和开发者的完整开发指南
- 🆚 **[Evidence 对比](./docs/FEATURE-COMPARISION-EVIDENCE.md)** - 与 Evidence.dev 的详细对比

---

## 🏗️ 技术栈

<details>
<summary><b>点击查看技术栈详情</b></summary>

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vite** | ^6.0 | 构建工具 |
| **Svelte 5** | ^5.15 | UI 框架（Runes 模式） |
| **TypeScript** | ^5.7 | 类型系统（严格模式） |
| **DuckDB-WASM** | ^1.29 | 浏览器端 SQL 引擎 |
| **Mosaic vgplot** | latest | 声明式数据可视化 |
| **Monaco Editor** | ^0.52 | SQL/Markdown 编辑器 |
| **Unified/Remark** | ^11.0 | Markdown 解析和处理 |
| **Tailwind CSS** | ^3.4 | CSS 工具类框架 |

### 核心特性
- ✅ **Svelte 5 Runes** - 使用 `$state`、`$derived`、`$effect` 的现代响应式
- ✅ **DuckDB-WASM** - 接近原生的 SQL 性能，支持 Apache Arrow
- ✅ **OPFS 持久化** - 使用浏览器 Origin Private File System 跨会话保存数据
- ✅ **TypeScript 严格模式** - 完整的类型安全
- ✅ **依赖注入** - 接口驱动的清晰架构

</details>

---

## 📁 项目结构

<details>
<summary><b>点击查看项目结构</b></summary>

```
src/
├── bootstrap/         # 组合根层 - 依赖注入和初始化
│   ├── init-services.ts   # DI 适配器注册
│   ├── init-charts.ts     # vgplot 图表注册
│   └── init-plugins.ts    # 插件组件注册
│
├── core/              # 核心引擎（仅依赖 types/）
│   ├── connectors/    # 多数据源连接器（WASM、MotherDuck、HTTP）
│   ├── database/      # DuckDB-WASM, Mosaic 集成, 表加载
│   ├── engine/        # Block 渲染, 响应式执行, 依赖图
│   ├── markdown/      # 解析器, SQL 执行器, 条件/循环处理
│   ├── registry/      # 组件注册系统
│   └── shared/        # DI 容器, 纯函数, 格式化, 图表服务
│
├── plugins/           # 可插拔组件（43 个）
│   ├── inputs/        # 8 个输入组件
│   ├── data-display/  # 22 个数据展示组件
│   ├── viz/           # 7 个 vgplot 图表
│   ├── ui/            # 6 个 UI 组件
│   └── layout/        # 1 个布局组件
│
├── app/               # 应用层
│   └── stores/        # Svelte stores（通过接口与 core 交互）
│
├── components/        # Svelte UI 组件
├── types/             # TypeScript 类型定义和接口契约
├── App.svelte         # 主应用组件
└── main.ts            # 应用入口
```

### 架构原则
- **分层依赖** - Bootstrap → Plugins/App → Core → Types
- **依赖倒置** - Core 只依赖接口，不依赖具体实现
- **插件化** - Evidence.dev 风格的组件注册系统
- **类型安全** - 完整的 TypeScript 类型定义

查看 [架构文档](./docs/ARCHITECTURE_OVERVIEW.md) 了解详细设计。

</details>

---

## 📦 部署

Miao Vision 是纯静态网站，可部署到任何静态托管平台：

### 推荐平台

| 平台 | 免费额度 | 部署时间 | 推荐指数 |
|------|----------|----------|----------|
| **Vercel** | 100GB/月流量 | < 2 分钟 | ⭐⭐⭐⭐⭐ |
| **Netlify** | 100GB/月流量 | < 2 分钟 | ⭐⭐⭐⭐⭐ |
| **Cloudflare Pages** | 无限流量 | < 3 分钟 | ⭐⭐⭐⭐ |
| **GitHub Pages** | 100GB/月流量 | < 5 分钟 | ⭐⭐⭐⭐ |

### 快速部署

```bash
# 构建生产版本
npm run build

# dist/ 目录即可直接部署
```

**一键部署**：
- [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)
- [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

---

## 🤝 贡献

欢迎贡献！我们特别需要以下方面的帮助：
- 🗺️ 地图组件（Choropleth、Point Map）
- 🔌 数据库连接器（PostgreSQL、MySQL）
- 📊 更多图表类型
- 📖 文档和示例

查看 [贡献指南](./CONTRIBUTING.md) 了解如何参与。

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## 🔗 相关链接

- **官方网站**: [即将推出]
- **GitHub**: https://github.com/your-username/miaoshou-vision
- **问题反馈**: https://github.com/your-username/miaoshou-vision/issues
- **讨论区**: https://github.com/your-username/miaoshou-vision/discussions

---

**维护者**: Miao Vision Team
**当前版本**: v1.0 (Bootstrap + 43 Components)
**最后更新**: 2024-12-23
