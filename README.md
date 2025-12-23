# Miaoshou Vision

> Local-First Data Analytics Framework - 浏览器原生的 Evidence 类数据分析框架

## 🎯 项目特点

- 🔒 **隐私优先**：所有数据处理在浏览器端完成，无需后端服务器
- ⚡ **高性能**：DuckDB-WASM 提供接近原生的 SQL 分析性能，支持 OPFS 持久化
- 📝 **声明式**：Markdown + SQL + 声明式图表语法，支持模板、条件和循环
- 🎯 **零运维**：纯静态部署，无需服务器
- 🔌 **插件化**：43+ 可插拔组件，Evidence.dev 风格的架构
- 🏗️ **清晰架构**：分层设计，依赖注入，完整的类型安全

## 🏗️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vite | ^6.0 | 构建工具 |
| Svelte 5 | ^5.15 | UI 框架（Runes 模式） |
| TypeScript | ^5.7 | 类型系统 |
| DuckDB-WASM | ^1.29 | 浏览器端 SQL 引擎 |
| Mosaic vgplot | latest | 数据可视化 |
| Monaco Editor | ^0.52 | 代码编辑器 |
| Unified/Remark | ^11.0 | Markdown 解析 |

## 📁 项目结构

本项目采用 **清晰分层架构 + Evidence.dev 风格插件系统**，实现核心引擎与可插拔组件的分离。

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
├── plugins/           # 可插拔组件（43 个组件）
│   ├── inputs/        # 8 个输入组件
│   ├── data-display/  # 22 个数据展示组件
│   ├── viz/           # 图表工具和数据适配器
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

### 路径别名

| 别名 | 路径 | 用途 |
|------|------|------|
| `@core/` | `src/core/` | 核心引擎 |
| `@plugins/` | `src/plugins/` | 插件系统 |
| `@app/` | `src/app/` | 应用层 |
| `@/` | `src/` | 通用导入 |

### 架构文档

📚 **核心架构**
- [DEPENDENCY_ARCHITECTURE.md](./docs/DEPENDENCY_ARCHITECTURE.md) - 分层架构和依赖规则
- [PLUGIN_ARCHITECTURE.md](./docs/PLUGIN_ARCHITECTURE.md) - 插件系统详解
- [DATA_SOURCES_ARCHITECTURE.md](./docs/DATA_SOURCES_ARCHITECTURE.md) - 连接器架构

📚 **技术细节**
- [DUCKDB_PERSISTENCE_ARCHITECTURE.md](./docs/DUCKDB_PERSISTENCE_ARCHITECTURE.md) - OPFS 持久化
- [MOSAIC_STATE_MANAGEMENT.md](./docs/MOSAIC_STATE_MANAGEMENT.md) - Mosaic 状态管理

## 🎨 UI 设计系统

本项目采用现代化的 Gemini 风格设计系统，提供完整的组件库和设计规范：

📚 **设计文档**
- [UI Design System](./UI_DESIGN_SYSTEM.md) - 完整的设计系统文档
- [Components Quick Reference](./COMPONENTS_QUICK_REFERENCE.md) - 组件速查手册

🎯 **设计特点**
- **Gemini 风格渐变** - 蓝→紫→粉渐变色系统
- **Inter 字体** - 现代化的 UI 字体（Google Sans 替代方案）
- **JetBrains Mono** - 专业的代码字体，支持连字
- **完整的组件系统** - 按钮、表单、导航、卡片等
- **响应式设计** - 支持手机、平板、桌面
- **无障碍支持** - WCAG 2.1 AA 合规

🚀 **快速使用**

```html
<!-- 主要按钮 -->
<button class="btn btn-md btn-primary">创建报告</button>

<!-- 表单输入 -->
<input type="text" class="form-input" placeholder="输入文本" />

<!-- 卡片 -->
<div class="evidence-card">
  <h3>卡片标题</h3>
  <p>卡片内容</p>
</div>
```

查看 [Components Quick Reference](./COMPONENTS_QUICK_REFERENCE.md) 获取更多示例。

## 🚀 快速开始

### ⚠️ 重要提示

**必须使用开发服务器运行，不要直接双击打开 HTML 文件！**

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（重要！）
npm run dev

# 3. 在浏览器中访问
# http://localhost:5173
```

### 其他命令

```bash
# 类型检查
npm run check

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

> 💡 遇到问题？查看 [故障排除指南](./TROUBLESHOOTING.md)

## 🎨 核心功能

### ✅ 数据处理

- ✅ **多数据源支持** - DuckDB-WASM (本地)、MotherDuck (云端)、HTTP 代理
- ✅ **OPFS 持久化** - 数据跨会话保存，刷新页面不丢失
- ✅ **CSV/Parquet 文件导入** - 拖拽上传，秒级加载
- ✅ **交互式 SQL 编辑器** - Monaco Editor，代码补全和语法高亮
- ✅ **SQL 模板系统** - 变量插值、条件渲染、循环处理

### ✅ 数据可视化（43 个组件）

**输入组件 (8 个)**
- Dropdown、ButtonGroup、TextInput、Slider
- DateRange、Checkbox、DimensionGrid

**数据展示 (22 个)**
- BigValue、DataTable、Value、Sparkline
- Bar Chart、Pie Chart、Histogram、Delta
- Sankey、Waterfall、Progress、Bullet Chart
- BoxPlot、Calendar Heatmap、Gauge、KPIGrid
- Heatmap、Radar、Funnel、Treemap

**图表 (7 个 vgplot)**
- Line、Bar、Area、Scatter、Pie、Chart、Histogram

**UI 组件 (6 个)**
- Alert、Tabs、Accordion、Tooltip、Details、Modal

### ✅ Markdown 报告系统

- ✅ **Evidence 风格语法** - 在 Markdown 中嵌入 SQL 和组件
- ✅ **模板语法** - `${variable}` 插值
- ✅ **条件渲染** - `{#if} {:else} {/if}`
- ✅ **循环处理** - `{#each} {:else} {/each}`
- ✅ **响应式执行** - 输入变化自动重新计算
- ✅ **依赖分析** - 智能检测 Block 依赖关系

### ✅ 架构特性

- ✅ **清晰分层架构** - Bootstrap → Plugins/App → Core → Types
- ✅ **依赖注入** - 接口驱动，松耦合设计
- ✅ **插件系统** - Evidence.dev 风格的组件注册
- ✅ **完整类型安全** - TypeScript 严格模式
- ✅ **Svelte 5 Runes** - 现代化响应式状态管理

### 🚧 规划中

- [ ] 地图组件（Choropleth、Point Map）
- [ ] 更多图表类型（BubbleChart、Calendar等）
- [ ] 多页面路由支持
- [ ] 自动刷新和实时数据
- [ ] PWA 离线支持

## 📦 部署

项目支持静态托管平台部署：

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## 📄 许可证

MIT
