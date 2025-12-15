# 添加交互式组件指南

本文档总结了添加类似 Dropdown 的交互式输入组件的步骤和经验。

## 核心架构：Block Registry 模式

所有交互式组件都通过 **Block Registry** 系统注册，避免修改核心渲染器代码。

### 关键组件

1. **Block Registry** (`src/lib/blocks/registry.ts`)
   - 统一管理所有自定义 block 类型
   - 提供 `register()`, `has()`, `get()` 方法
   - `shouldCreatePlaceholder()` 决定是否在 markdown 中创建占位符

2. **Input Store** (`src/lib/stores/report-inputs.ts`)
   - 管理每个 report 的输入状态
   - 按 `reportId` 隔离，支持多报告并存
   - 提供 `setValue()`, `getValue()`, `has()` 等方法

3. **SQL Template System** (`src/lib/sql/template.ts`)
   - 支持 `${inputs.variableName}` 语法
   - 在 SQL 执行前替换变量值
   - 自动处理 SQL 注入防护（字符串转义）

---

## 添加新组件的步骤

以添加 `Dropdown` 为例：

### 1. 创建类型定义

**文件：** `src/types/inputs.ts`

```typescript
export interface DropdownConfig {
  name: string           // 变量名（用于 ${inputs.name}）
  data: string          // SQL 数据源名称
  value: string         // 值列名
  label?: string        // 显示列名（可选，默认同 value）
  title?: string        // 标题
  placeholder?: string  // 占位文本
  defaultValue?: string // 默认值
  multiple?: boolean    // 是否多选
}

export interface DropdownOption {
  value: string
  label: string
}

export interface DropdownData {
  config: DropdownConfig
  options: DropdownOption[]
}
```

### 2. 创建 Parser（解析器）

**文件：** `src/lib/inputs/dropdown-parser.ts`

**作用：** 从 markdown 代码块解析配置，从 SQL 结果提取数据

**关键点：**
- 解析 YAML-like 配置（`key: value` 格式）
- 从 `reportBlocks` 中查找 SQL 数据源
- **注意：** QueryResult 使用 `data` 字段，不是 `rows`
- 返回 `DropdownData` 或 `null`

```typescript
export function buildDropdownFromBlock(
  block: ParsedCodeBlock,
  reportBlocks: ReportBlock[]
): DropdownData | null {
  // 1. 解析配置
  const config = parseDropdownConfig(block.content)

  // 2. 查找 SQL 数据源
  const dataBlock = reportBlocks.find(
    b => b.type === 'sql' && b.metadata?.name === config.data
  )

  // 3. 提取选项（注意：使用 .data 不是 .rows）
  for (const row of dataBlock.sqlResult.data) {
    options.push({ value: row[valueColumn], label: row[labelColumn] })
  }

  return { config, options }
}
```

### 3. 创建 Svelte 组件

**文件：** `src/components/inputs/Dropdown.svelte`

**关键点：**
- 使用 **Svelte 5 Runes** (`$state`, `$props`, `$effect`)
- 接收 `data` 和 `inputStore` props
- 在 `handleChange` 中调用 `inputStore.setValue()`
- 使用 `$effect()` 初始化默认值

```svelte
<script lang="ts">
  let { data, inputStore }: Props = $props()
  let currentValue = $state<string | null>(data.config.defaultValue || null)

  function handleChange(event: Event) {
    const newValue = (event.target as HTMLSelectElement).value || null
    currentValue = newValue
    inputStore.setValue(data.config.name, newValue)
  }

  $effect(() => {
    if (data.config.defaultValue && !inputStore.has(data.config.name)) {
      inputStore.setValue(data.config.name, data.config.defaultValue)
    }
  })
</script>
```

### 4. 创建 Block 注册文件

**文件：** `src/lib/blocks/dropdown-block.ts`

**作用：** 定义如何解析和渲染组件

```typescript
import { mount } from 'svelte'
import { blockRegistry } from './registry'
import { buildDropdownFromBlock } from '@/lib/inputs/dropdown-parser'
import Dropdown from '@/components/inputs/Dropdown.svelte'

const dropdownBlock: BlockDefinition<DropdownData> = {
  language: 'dropdown',  // markdown 中的 ```dropdown
  description: 'Interactive dropdown input',

  parser: (block, context) => {
    return buildDropdownFromBlock(block, context.blocks)
  },

  renderer: (container, data, context) => {
    const inputStore = (context as any).inputStore
    if (!inputStore) {
      container.innerHTML = '<div style="color: red;">Error: Input store not available</div>'
      return
    }
    mount(Dropdown, { target: container, props: { data, inputStore } })
  }
}

blockRegistry.register(dropdownBlock)
```

### 5. 注册到 Block Index

**文件：** `src/lib/blocks/index.ts`

```typescript
import './bigvalue-block'
import './datatable-block'
import './dropdown-block'  // ← 添加这一行
```

### 6. 默认值初始化（关键！）

**文件：** `src/lib/inputs/initialize-defaults.ts`

**为什么需要：** SQL 模板变量 `${inputs.xxx}` 在执行 SQL 前必须有值，否则会是 `NULL`

```typescript
export function initializeInputDefaults(
  blocks: ParsedCodeBlock[],
  inputStore: InputStore
): void {
  for (const block of blocks) {
    if (block.language === 'dropdown') {
      const config = parseDropdownConfig(block.content)
      if (config?.defaultValue && !inputStore.has(config.name)) {
        inputStore.setValue(config.name, config.defaultValue)
      }
    }
  }
}
```

**在 App.svelte 中调用：**

```typescript
async function handleExecuteReport() {
  const inputStore = getInputStore(report.id)

  // 关键：在执行 SQL 之前初始化默认值
  initializeInputDefaults(parsed.codeBlocks, inputStore)

  const inputValues = get(inputStore)
  const templateContext = { inputs: inputValues, metadata: report.metadata }

  await executeReport(report, parsed.codeBlocks, onProgress, templateContext)
}
```

---

## 核心文件修改清单

### ✅ 必须修改的文件

1. **`src/main.ts`**
   ```typescript
   import './lib/blocks/index'  // 触发 block 注册
   ```

2. **`src/lib/markdown/rehype-block-placeholder.ts`**
   ```typescript
   import { shouldCreatePlaceholder } from '@/lib/blocks'

   if (shouldCreatePlaceholder(language)) {
     // 创建占位符
   }
   ```

3. **`src/components/ReportRenderer.svelte`**
   ```typescript
   // 修改条件判断，支持 blockRegistry
   const isRegisteredBlock = blockRegistry.has(blockType)
   if (!block && !isDataConsumerBlock && !isRegisteredBlock) {
     continue  // 跳过未执行的块
   }

   // 添加 blockRegistry 处理逻辑
   else if (blockRegistry.has(blockType)) {
     const blockDef = blockRegistry.get(blockType)!
     const parsedBlock = parsedCodeBlocks.find(cb => cb.id === blockId)

     const context: RenderContext = {
       blocks: report.blocks,
       inputs: inputStore ? get(inputStore) : {},
       metadata: report.metadata,
       inputStore: inputStore  // 传递 inputStore
     }

     const data = blockDef.parser(parsedBlock, context)
     if (data) {
       const container = document.createElement('div')
       await blockDef.renderer(container, data, context)
       placeholder.replaceWith(container)
     }
   }
   ```

4. **`src/App.svelte`**
   ```typescript
   import { getInputStore } from './lib/stores/report-inputs'
   import { initializeInputDefaults } from './lib/inputs/initialize-defaults'

   let currentInputStore = $state<InputStore | null>(null)

   async function handleExecuteReport() {
     const inputStore = getInputStore(report.id)
     currentInputStore = inputStore

     initializeInputDefaults(parsed.codeBlocks, inputStore)  // 关键

     const templateContext = {
       inputs: get(inputStore),
       metadata: report.metadata
     }

     await executeReport(report, parsed.codeBlocks, onProgress, templateContext)
   }
   ```

5. **`src/lib/markdown/sql-executor.ts`**
   ```typescript
   export async function executeSQLBlock(
     block: ParsedCodeBlock,
     tableMapping: Map<string, string>,
     templateContext?: SQLTemplateContext  // 添加参数
   ): Promise<...> {
     let sql = block.content
     if (templateContext && hasTemplateVariables(sql)) {
       sql = interpolateSQL(sql, templateContext)  // 替换变量
     }
     // 执行 SQL
   }
   ```

---

## 常见陷阱和解决方案

### 1. ❌ Dropdown 不显示
**原因：** `ReportRenderer.svelte` 中的条件判断太早跳过了

**解决：** 添加 `blockRegistry.has(blockType)` 检查：
```typescript
const isRegisteredBlock = blockRegistry.has(blockType)
if (!block && !isDataConsumerBlock && !isRegisteredBlock) {
  continue  // ← 注册的 block 不会被跳过
}
```

### 2. ❌ `rows is not iterable`
**原因：** `QueryResult` 使用 `data` 字段，不是 `rows`

**解决：** 使用正确的字段名
```typescript
for (const row of dataBlock.sqlResult.data) {  // ✅ 正确
  // 不是 .rows
}
```

### 3. ❌ SQL 查询报错 "table does not exist"
**原因：** 模板变量 `${inputs.xxx}` 为 NULL，导致 WHERE 子句失败

**解决：** 在执行 SQL **之前**调用 `initializeInputDefaults()`
```typescript
initializeInputDefaults(parsed.codeBlocks, inputStore)  // 必须在 executeReport 之前
await executeReport(...)
```

### 4. ❌ Block 没有注册
**原因：** `src/lib/blocks/index.ts` 没有被 import

**解决：** 在 `src/main.ts` 中添加 import
```typescript
import './lib/blocks/index'  // 触发所有 block 注册
```

---

## Markdown 使用示例

```markdown
# 步骤 1：准备数据源

\`\`\`sql regions_list
SELECT * FROM (VALUES
  ('North America'),
  ('Europe'),
  ('Asia Pacific')
) AS t(region)
\`\`\`

# 步骤 2：创建 Dropdown

\`\`\`dropdown
name: selected_region
data: regions_list
value: region
title: Select a Region
defaultValue: North America
\`\`\`

# 步骤 3：使用变量过滤数据

\`\`\`sql filtered_data
SELECT * FROM sales
WHERE region = ${inputs.selected_region}
\`\`\`

**重要：** 不需要手动添加引号！系统会自动处理：
- 字符串值 → 自动加单引号并转义
- 数字/布尔值 → 直接插入
- 数组 → 转换为 `(value1, value2, ...)`

# 步骤 4：显示结果

\`\`\`chart
type: line
data: filtered_data
x: month
y: revenue
\`\`\`
```

---

## 文件结构总结

```
src/
├── types/inputs.ts                    # 1. 类型定义
├── lib/
│   ├── blocks/
│   │   ├── registry.ts                # 核心注册系统
│   │   ├── index.ts                   # 2. 导出入口
│   │   └── dropdown-block.ts          # 3. Block 注册
│   ├── inputs/
│   │   ├── dropdown-parser.ts         # 4. Parser
│   │   └── initialize-defaults.ts     # 5. 默认值初始化
│   ├── stores/
│   │   └── report-inputs.ts           # Input Store
│   └── sql/
│       └── template.ts                # SQL 模板变量替换
├── components/
│   └── inputs/
│       └── Dropdown.svelte            # 6. Svelte 组件
└── main.ts                            # 7. 注册入口 import
```

---

## 调试 Tips

1. **查看 Block 注册状态**
   ```typescript
   console.log('Registered blocks:', blockRegistry.getAll())
   // 应该包含 'dropdown'
   ```

2. **检查 Placeholder 创建**
   ```typescript
   console.log('shouldCreatePlaceholder("dropdown"):', shouldCreatePlaceholder('dropdown'))
   // 应该返回 true
   ```

3. **验证数据解析**
   ```typescript
   console.log('Dropdown data:', buildDropdownFromBlock(...))
   // 应该返回 { config, options }
   ```

4. **检查 Input Store**
   ```typescript
   console.log('Input values:', get(inputStore))
   // 应该包含 { selected_region: 'North America' }
   ```

---

## 下一步：添加其他组件

按照相同模式可以添加：
- **DateRange** - 日期范围选择器
- **ButtonGroup** - 按钮组
- **Checkbox** - 复选框
- **Slider** - 滑块
- **TextInput** - 文本输入框

只需重复上述步骤，替换组件名称即可！
