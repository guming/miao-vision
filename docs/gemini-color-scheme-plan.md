# Gemini Color Scheme Integration Plan
> 保持 Evidence.dev 布局，使用 Gemini 多彩配色方案

**目标：** Evidence.dev 布局 + Gemini 渐变配色
**日期：** 2025-12-13

---

## 🎨 Gemini UI 风格分析

### 核心设计特点

1. **多彩渐变** - Gemini 的品牌特色
   - 主渐变：蓝色 → 紫色 → 粉色
   - 不使用单一颜色，偏好渐变组合
   - 动态、活力、现代感

2. **Material Design 3**
   - Google 的最新设计语言
   - 柔和的圆角 (16px-24px)
   - 层次分明的阴影系统
   - 更大的留白

3. **双主题支持**
   - 浅色模式：纯白背景 + 渐变强调
   - 深色模式：深灰背景 + 渐变强调

4. **玻璃态 (Glassmorphism)**
   - 半透明背景
   - 毛玻璃模糊效果
   - 渐变边框

---

## 🌈 Gemini 配色方案

### 主渐变色

```css
/* Gemini 品牌渐变 - 蓝紫粉 */
.gemini-gradient-primary {
  background: linear-gradient(135deg,
    #4285F4 0%,    /* Google Blue */
    #8B5CF6 50%,   /* Purple */
    #EC4899 100%   /* Pink */
  );
}

/* Gemini 文字渐变 */
.gemini-text-gradient {
  background: linear-gradient(90deg,
    #4285F4 0%,
    #A855F7 50%,
    #EC4899 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Gemini 边框渐变 */
.gemini-border-gradient {
  border: 2px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg, #4285F4, #8B5CF6, #EC4899) border-box;
}
```

### 辅助渐变色

```css
/* 成功状态 - 绿色渐变 */
.gemini-success {
  background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
}

/* 警告状态 - 橙黄渐变 */
.gemini-warning {
  background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
}

/* 错误状态 - 红粉渐变 */
.gemini-error {
  background: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
}

/* 信息状态 - 青蓝渐变 */
.gemini-info {
  background: linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%);
}
```

### 背景色系

```css
/* 浅色模式 */
--bg-primary: #FFFFFF;
--bg-secondary: #F8F9FA;
--bg-tertiary: #F1F3F4;
--surface: rgba(255, 255, 255, 0.95);

/* 深色模式 */
--bg-dark-primary: #1E1E1E;
--bg-dark-secondary: #2D2D2D;
--bg-dark-tertiary: #3A3A3A;
--surface-dark: rgba(30, 30, 30, 0.95);
```

### 文字色系

```css
/* 浅色模式 */
--text-primary: #202124;
--text-secondary: #5F6368;
--text-tertiary: #80868B;

/* 深色模式 */
--text-dark-primary: #E8EAED;
--text-dark-secondary: #9AA0A6;
--text-dark-tertiary: #5F6368;
```

---

## 📋 实施 TODO 清单

### Phase 1: Tailwind 配置更新 (30分钟)

#### ✅ 任务清单

- [ ] **更新 tailwind.config.js - 添加 Gemini 渐变色**
  ```javascript
  extend: {
    backgroundImage: {
      'gemini-primary': 'linear-gradient(135deg, #4285F4 0%, #8B5CF6 50%, #EC4899 100%)',
      'gemini-hover': 'linear-gradient(135deg, #3B78E7 0%, #7C4FDB 50%, #D93D85 100%)',
      'gemini-success': 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      'gemini-warning': 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
      'gemini-error': 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
    }
  }
  ```

- [ ] **添加 Google Fonts - Material Symbols**
  ```html
  <!-- index.html -->
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  ```

- [ ] **配置圆角系统 - Material Design 3 风格**
  ```javascript
  borderRadius: {
    'gemini-sm': '12px',
    'gemini-md': '16px',
    'gemini-lg': '20px',
    'gemini-xl': '24px',
  }
  ```

- [ ] **配置阴影系统 - Material Design 3 层级**
  ```javascript
  boxShadow: {
    'gemini-1': '0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px rgba(60, 64, 67, 0.15)',
    'gemini-2': '0 2px 6px rgba(60, 64, 67, 0.3), 0 1px 4px rgba(60, 64, 67, 0.15)',
    'gemini-3': '0 4px 8px rgba(60, 64, 67, 0.3), 0 2px 6px rgba(60, 64, 67, 0.15)',
  }
  ```

---

### Phase 2: 全局样式更新 (30分钟)

#### ✅ 任务清单

- [ ] **更新 src/app.css - Gemini 基础样式**
  - 替换 CSS 变量为 Gemini 配色
  - 添加渐变文字 utility class
  - 添加玻璃态效果 class

- [ ] **创建 Gemini 组件样式库**
  ```css
  @layer components {
    .gemini-card {
      @apply bg-white rounded-gemini-lg shadow-gemini-2;
      @apply border border-gray-100;
    }

    .gemini-card-gradient {
      @apply bg-white rounded-gemini-lg;
      border: 2px solid transparent;
      background: linear-gradient(white, white) padding-box,
                  linear-gradient(135deg, #4285F4, #8B5CF6, #EC4899) border-box;
    }

    .gemini-glass {
      @apply backdrop-blur-lg bg-white/80;
      @apply border border-white/20;
    }
  }
  ```

---

### Phase 3: 组件迁移 - Gemini 风格 (2-3小时)

#### App.svelte Header

- [ ] **标题使用 Gemini 渐变文字**
  ```css
  h1 {
    background: linear-gradient(90deg, #4285F4, #8B5CF6, #EC4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  ```

- [ ] **导航标签改为渐变下划线**
  ```css
  .nav-tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4285F4, #8B5CF6);
  }
  ```

- [ ] **状态徽章使用渐变背景**
  ```css
  .status-badge.ready {
    background: linear-gradient(135deg, #10B981, #34D399);
    color: white;
  }
  ```

#### 按钮系统 - 全面渐变化

- [ ] **主按钮 - Gemini 主渐变**
  ```css
  .btn-primary {
    background: linear-gradient(135deg, #4285F4, #8B5CF6, #EC4899);
    color: white;
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #3B78E7, #7C4FDB, #D93D85);
    box-shadow: 0 6px 16px rgba(66, 133, 244, 0.6);
    transform: translateY(-2px);
  }
  ```

- [ ] **次要按钮 - 渐变边框**
  ```css
  .btn-secondary {
    background: white;
    color: #4285F4;
    border: 2px solid transparent;
    background: linear-gradient(white, white) padding-box,
                linear-gradient(135deg, #4285F4, #8B5CF6) border-box;
  }
  ```

#### ReportList.svelte

- [ ] **"+ New" 按钮 - Gemini 渐变**
  ```css
  .btn-new {
    background: linear-gradient(135deg, #4285F4, #8B5CF6);
  }
  ```

- [ ] **Active 报告项 - 渐变左边框**
  ```css
  .report-item.active {
    background: #F8F9FF;
    border-left: 4px solid;
    border-image: linear-gradient(to bottom, #4285F4, #8B5CF6) 1;
  }
  ```

- [ ] **操作按钮 hover - 渐变效果**
  ```css
  .action-btn:hover {
    background: linear-gradient(135deg, #EEF2FF, #F3E8FF);
  }
  ```

#### 卡片组件

- [ ] **创建 Gemini 风格卡片变体**
  - 标准卡片：白色背景 + 阴影
  - 渐变卡片：渐变边框
  - 玻璃卡片：毛玻璃效果

- [ ] **Chart Display - 渐变边框卡片**
  ```css
  .chart-display {
    border: 3px solid transparent;
    background: linear-gradient(white, white) padding-box,
                linear-gradient(135deg, #4285F4, #8B5CF6, #EC4899) border-box;
    border-radius: 20px;
  }
  ```

#### Empty State

- [ ] **空状态图标 - 渐变色**
  ```css
  .empty-state-large .icon {
    background: linear-gradient(135deg, #4285F4, #8B5CF6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  ```

---

### Phase 4: 更新 UI 组件库 (1小时)

#### Button.svelte 组件

- [ ] **添加 Gemini 渐变变体**
  ```typescript
  variant?: 'primary' | 'secondary' | 'gemini' | 'gemini-outline'
  ```

- [ ] **实现 Gemini 按钮样式**
  ```css
  .gemini {
    background: linear-gradient(135deg, #4285F4, #8B5CF6, #EC4899);
    color: white;
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
  }

  .gemini-outline {
    background: white;
    border: 2px solid transparent;
    background-clip: padding-box;
    border-image: linear-gradient(135deg, #4285F4, #8B5CF6) 1;
  }
  ```

#### Card.svelte 组件

- [ ] **添加 Gemini 渐变边框选项**
  ```typescript
  borderStyle?: 'solid' | 'gradient' | 'none'
  ```

- [ ] **实现玻璃态效果**
  ```typescript
  glass?: boolean
  ```

---

### Phase 5: 图标系统 (1小时)

- [ ] **安装 Material Icons 或 Google Fonts Icons**
  ```bash
  npm install @material-design-icons/svg
  ```

- [ ] **替换 Emoji 为 Material Icons**
  - Upload → cloud_upload
  - Query → search
  - Visualize → bar_chart
  - Report → description

- [ ] **创建 Icon 组件包装器**
  ```svelte
  <!-- Icon.svelte -->
  <script>
    export let name: string
    export let gradient = false
  </script>

  <span class="material-icons" class:gradient>
    {name}
  </span>

  <style>
    .gradient {
      background: linear-gradient(135deg, #4285F4, #8B5CF6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  </style>
  ```

---

### Phase 6: 高级效果 (可选，1-2小时)

#### 动画增强

- [ ] **添加渐变动画**
  ```css
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .gemini-animated {
    background: linear-gradient(
      270deg,
      #4285F4,
      #8B5CF6,
      #EC4899,
      #4285F4
    );
    background-size: 400% 400%;
    animation: gradient-shift 8s ease infinite;
  }
  ```

#### 加载状态

- [ ] **创建 Gemini 风格 Loading Spinner**
  ```css
  .gemini-spinner {
    border: 3px solid transparent;
    border-top: 3px solid #4285F4;
    border-right: 3px solid #8B5CF6;
    border-bottom: 3px solid #EC4899;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  ```

#### Hover 效果增强

- [ ] **添加渐变 hover 光晕效果**
  ```css
  .btn-gemini:hover::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, #4285F4, #8B5CF6, #EC4899);
    filter: blur(8px);
    opacity: 0.5;
    z-index: -1;
  }
  ```

---

### Phase 7: 深色模式支持 (可选，1-2小时)

- [ ] **配置深色模式 Gemini 配色**
  ```css
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-primary: #1E1E1E;
      --bg-secondary: #2D2D2D;
      --text-primary: #E8EAED;
    }
  }
  ```

- [ ] **调整渐变在深色模式下的亮度**
  ```css
  .dark .gemini-gradient {
    background: linear-gradient(135deg,
      #5B9EFF 0%,    /* 更亮的蓝 */
      #9D75FF 50%,   /* 更亮的紫 */
      #FF6BB5 100%   /* 更亮的粉 */
    );
  }
  ```

---

## 🎯 设计对比

### 当前 Evidence.dev 风格

| 元素 | 当前样式 |
|------|---------|
| 主色 | `#3B82F6` (单一蓝色) |
| 按钮 | 扁平蓝色 |
| 标题 | 黑色文字 |
| 边框 | `#E5E7EB` 灰色 |
| 圆角 | 4-8px 小圆角 |
| 阴影 | 轻微阴影 |

### 目标 Gemini 风格

| 元素 | 目标样式 |
|------|---------|
| 主色 | 蓝→紫→粉 渐变 |
| 按钮 | 渐变背景 + 阴影 |
| 标题 | 渐变文字 |
| 边框 | 渐变边框 |
| 圆角 | 12-24px 大圆角 |
| 阴影 | Material Design 3 层级阴影 |

---

## 📦 新增依赖

```bash
# 图标库（可选）
npm install @material-design-icons/svg

# Google Fonts（通过 CDN，无需安装）
# 已在 index.html 引入
```

---

## 🔧 配置文件更新预览

### tailwind.config.js - Gemini 扩展

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,svelte}'],
  theme: {
    extend: {
      // Gemini 渐变背景
      backgroundImage: {
        'gemini-primary': 'linear-gradient(135deg, #4285F4 0%, #8B5CF6 50%, #EC4899 100%)',
        'gemini-hover': 'linear-gradient(135deg, #3B78E7 0%, #7C4FDB 50%, #D93D85 100%)',
        'gemini-success': 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        'gemini-warning': 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
        'gemini-error': 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
        'gemini-glass': 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))',
      },

      // Gemini 圆角
      borderRadius: {
        'gemini-sm': '12px',
        'gemini-md': '16px',
        'gemini-lg': '20px',
        'gemini-xl': '24px',
        'gemini-2xl': '32px',
      },

      // Material Design 3 阴影
      boxShadow: {
        'gemini-1': '0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px rgba(60, 64, 67, 0.15)',
        'gemini-2': '0 2px 6px rgba(60, 64, 67, 0.3), 0 1px 4px rgba(60, 64, 67, 0.15)',
        'gemini-3': '0 4px 8px rgba(60, 64, 67, 0.3), 0 2px 6px rgba(60, 64, 67, 0.15)',
        'gemini-4': '0 6px 10px rgba(60, 64, 67, 0.3), 0 2px 8px rgba(60, 64, 67, 0.15)',
      },

      // 保持 Evidence.dev 的间距系统
      // ...现有配置
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

---

## ⏱️ 时间估算

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| Phase 1 | Tailwind 配置更新 | 30分钟 |
| Phase 2 | 全局样式更新 | 30分钟 |
| Phase 3 | 组件迁移 | 2-3小时 |
| Phase 4 | UI 组件库更新 | 1小时 |
| Phase 5 | 图标系统 | 1小时 |
| Phase 6 | 高级效果（可选） | 1-2小时 |
| Phase 7 | 深色模式（可选） | 1-2小时 |
| **总计** | **核心功能** | **5-6小时** |
| **总计** | **完整版本** | **8-10小时** |

---

## 🎨 参考资源

### Gemini UI 参考
- [Google Gemini 官网](https://gemini.google.com/)
- [Material Design 3](https://m3.material.io/)
- [Google Fonts](https://fonts.google.com/)

### 渐变工具
- [CSS Gradient](https://cssgradient.io/)
- [Gradient Magic](https://www.gradientmagic.com/)
- [UI Gradients](https://uigradients.com/)

### 图标资源
- [Material Icons](https://fonts.google.com/icons)
- [Material Symbols](https://fonts.google.com/icons?icon.set=Material+Symbols)

---

## 🚀 下一步行动

1. **Review** - 审查这个计划，确认方向
2. **Approve** - 批准开始实施
3. **Execute** - 按阶段执行迁移

---

**建议的实施顺序：**

1. ✅ **Phase 1-2 先行** - 打好基础（Tailwind 配置 + 全局样式）
2. ✅ **Phase 3 逐步迁移** - 从 Header 开始，逐个组件更新
3. ✅ **Phase 4-5 增强** - 更新组件库和图标系统
4. 🔄 **Phase 6-7 可选** - 根据需求决定是否添加高级效果和深色模式

---

**关键问题需要确认：**

❓ **是否需要深色模式？** Gemini 支持深色模式，是否需要？
❓ **动画程度？** 是否需要渐变动画、光晕效果等高级动画？
❓ **图标系统？** 使用 Material Icons 还是保留 Emoji？
❓ **圆角大小？** Gemini 使用较大圆角（16-24px），是否接受？

**请审阅并告知是否开始实施！** 🚀
