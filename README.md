# Miaoshou Vision

> Local-First Data Analytics Framework - 浏览器原生的 Evidence 类数据分析框架

## 🎯 项目特点

- 🔒 **隐私优先**：所有数据处理在浏览器端完成，无需后端服务器
- ⚡ **高性能**：DuckDB-WASM 提供接近原生的 SQL 分析性能
- 📝 **声明式**：Markdown + SQL + 声明式图表语法
- 🎯 **零运维**：纯静态部署，无需服务器

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

```
src/
├── components/      # Svelte 组件
├── lib/
│   ├── database/   # DuckDB-WASM 封装
│   ├── markdown/   # Markdown 解析器
│   ├── viz/        # 可视化组件
│   └── stores/     # Svelte 5 Runes 状态管理
├── utils/          # 工具函数
├── types/          # TypeScript 类型定义
├── App.svelte      # 主应用组件
└── main.ts         # 应用入口
```

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

### ✅ 已实现

- ✅ **CSV/Parquet 文件导入** - 拖拽上传，秒级加载
- ✅ **交互式 SQL 查询编辑器** - Monaco Editor 专业体验
- ✅ **数据可视化** - 柱状图、折线图、散点图
- ✅ **Markdown 驱动的报告** - Evidence 风格的数据报告
- ✅ **响应式数据流** - Svelte 5 Runes 状态管理
- ✅ **零服务器架构** - 完全在浏览器运行

### 🆕 最新功能

- 🎉 **vgplot 图表支持** - 基于 Mosaic 的交互式图表
- 📊 **可视化配置面板** - 无代码创建图表
- 🔄 **查询结果可视化** - 一键从 SQL 结果创建图表
- 📝 **Markdown 报告** - 在 Markdown 中嵌入 SQL 查询和图表

### 🚧 开发中

- [ ] 更多图表类型（面积图、饼图）
- [ ] 图表导出功能
- [ ] 多图表仪表板
- [ ] 报告导出 (PDF/HTML)

## 📦 部署

项目支持静态托管平台部署：

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## 📄 许可证

MIT
