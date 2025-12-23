# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Miao Vision** is a local-first data analytics framework that runs entirely in the browser. It combines:

- **DuckDB-WASM v1.29** - Browser-based SQL engine with OPFS persistence
- **Mosaic vgplot** - Declarative visualization integrated with DuckDB
- **Markdown Report System** - Evidence.dev-style data-driven documents
- **43+ Plugin Components** - Extensible component architecture
- **Clean Layered Architecture** - Bootstrap → Plugins/App → Core → Types

**Key Features:**
- 🔒 **Privacy-first**: All data processing in browser, zero backend
- ⚡ **High Performance**: Near-native SQL analysis via WebAssembly
- 💾 **Persistent Storage**: OPFS for cross-session data retention
- 🔌 **Multi-Source**: WASM (local), MotherDuck (cloud), HTTP proxy
- 📝 **Template Syntax**: Variables, conditionals, loops in Markdown
- 🎯 **Reactive Execution**: Automatic re-calculation on input changes

## Development Commands

```bash
npm run dev          # Start dev server (http://localhost:5173) - ALWAYS USE THIS
npm run build        # Production build
npm run check        # TypeScript/Svelte type checking
npm run check:size   # Check for files exceeding 500 lines
npm run test         # Run tests
npm run test:coverage # Test coverage report
npm run preview      # Preview production build
```

**⚠️ Critical:** Always use `npm run dev` - the app requires CORS headers for DuckDB-WASM's SharedArrayBuffer support. Direct file opening (`file://`) will NOT work.

## Architecture

### Layered Architecture

The project follows **Clean Architecture** principles with strict dependency rules:

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Application Entry (main.ts, App.svelte)              │
│                              │                                   │
│                              ▼                                   │
│  Layer 3: Bootstrap (Composition Root)                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ bootstrap/  - Wires all dependencies (DI)                   ││
│  │   ├── init-services.ts  (DI adapters)                       ││
│  │   ├── init-charts.ts    (vgplot registration)               ││
│  │   └── init-plugins.ts   (plugin registration)               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  Layer 2: Features                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │  plugins/   │ │    app/     │ │ components/ │                │
│  │  (43 comp)  │ │  (stores)   │ │  (UI)       │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│              │               │               │                   │
│              └───────────────┼───────────────┘                  │
│                              ▼                                   │
│  Layer 1: Core (Pure logic, interface-only dependencies)        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ core/  - connectors, database, markdown, engine, shared     ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  Layer 0: Types / Contracts                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ types/  - interfaces, type definitions                      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Rules (CRITICAL - MUST FOLLOW)

| From Layer | Can Depend On | FORBIDDEN Dependencies |
|------------|---------------|------------------------|
| **main.ts** | bootstrap, app, components | - |
| **bootstrap/** | core, plugins, app | - |
| **plugins/** | core, types | app, components, other plugins |
| **app/** | core, types | plugins, components |
| **components/** | core, app, plugins, types | - |
| **core/** | types **ONLY** | ❌ plugins, app, components |
| **types/** | **NOTHING** | ❌ everything |

**Verification:**
```bash
# Core layer MUST NOT depend on plugins or app
grep -r "from '@app" src/core/       # Should be empty
grep -r "from '@plugins" src/core/   # Should be empty
```

**Why This Matters:**
- ✅ Keeps core logic pure and testable
- ✅ Enables plugin hot-swapping
- ✅ Simplifies testing (mock interfaces, not implementations)
- ✅ Prevents circular dependencies

### Directory Structure

```
src/
├── bootstrap/         # Composition Root - wires dependencies
│   ├── index.ts           # Main entry: initializeApp()
│   ├── init-services.ts   # Register DI adapters
│   ├── init-charts.ts     # Register vgplot charts
│   └── init-plugins.ts    # Register all plugins
│
├── core/              # Core engine (43 files, ~8000 LOC)
│   ├── connectors/    # Multi-source connectors (WASM, MotherDuck, HTTP)
│   │   ├── types.ts       # Connector interface
│   │   ├── result.ts      # Result<T, E> pattern
│   │   ├── wasm/          # DuckDB-WASM connector
│   │   ├── motherduck/    # MotherDuck connector
│   │   └── http/          # HTTP proxy connector
│   ├── database/      # DuckDB-WASM, Mosaic, table loading
│   │   ├── duckdb.ts      # Legacy manager (being replaced)
│   │   ├── mosaic.ts      # Mosaic coordinator
│   │   ├── table-loader.ts # CSV/Parquet loading
│   │   └── template.ts    # SQL template interpolation
│   ├── engine/        # Execution engine
│   │   ├── report-execution.service.ts # Orchestrator
│   │   ├── reactive-executor.ts        # Reactive re-execution
│   │   ├── dependency-graph.ts         # Dependency analysis
│   │   ├── block-renderer.ts           # Block rendering
│   │   └── drilldown/                  # Chart drill-down
│   ├── markdown/      # Markdown processing
│   │   ├── parser.ts                   # Unified/Remark pipeline
│   │   ├── sql-executor.ts             # SQL block execution
│   │   ├── conditional-processor.ts    # {#if} syntax
│   │   ├── loop-processor.ts           # {#each} syntax
│   │   └── rehype-block-placeholder.ts # DOM placeholders
│   ├── registry/      # Component registration
│   │   ├── component-registry.ts       # Main registry
│   │   ├── component-definition.ts     # defineComponent()
│   │   ├── config-parser.ts            # YAML parsing
│   │   ├── data-resolver.ts            # Data source resolution
│   │   ├── component-mount.ts          # Svelte mounting
│   │   └── schemas.ts                  # Zod validation
│   └── shared/        # Shared utilities
│       ├── di/            # Dependency injection container
│       ├── pure/          # Pure functions (with tests)
│       ├── format/        # Global formatting system
│       └── chart.service.ts # Chart config builder
│
├── plugins/           # Pluggable components (43 components)
│   ├── inputs/        # 8 input components
│   │   ├── dropdown/
│   │   ├── buttongroup/
│   │   ├── textinput/
│   │   ├── slider/
│   │   ├── daterange/
│   │   ├── checkbox/
│   │   └── dimensiongrid/
│   ├── data-display/  # 22 data display components
│   │   ├── bigvalue/
│   │   ├── datatable/
│   │   ├── value/
│   │   ├── sparkline/
│   │   ├── bar-chart/
│   │   ├── pie-chart/
│   │   ├── histogram/
│   │   ├── delta/
│   │   ├── sankey/
│   │   ├── waterfall/
│   │   ├── progress/
│   │   ├── bullet-chart/
│   │   ├── boxplot/
│   │   ├── calendar-heatmap/
│   │   ├── gauge/
│   │   ├── kpigrid/
│   │   ├── heatmap/
│   │   ├── radar/
│   │   ├── funnel/
│   │   └── treemap/
│   ├── viz/           # 7 vgplot charts + utilities
│   │   ├── chart-builder.ts   # Chart config builder
│   │   └── data-adapter.ts    # vgplot data adapter
│   ├── ui/            # 6 UI components
│   │   ├── alert/
│   │   ├── tabs/
│   │   ├── accordion/
│   │   ├── tooltip/
│   │   ├── details/
│   │   └── modal/
│   └── layout/        # 1 layout component
│       └── grid/
│
├── app/               # Application layer
│   └── stores/        # Svelte 5 stores (Runes mode)
│       ├── database.svelte.ts        # DB connection state
│       ├── report.svelte.ts          # Report state
│       ├── report-inputs.ts          # Input values
│       ├── chart.svelte.ts           # Chart configs
│       ├── query-workspace.svelte.ts # SQL workspace
│       └── connection.svelte.ts      # Connection mgmt
│
├── components/        # UI components (non-plugin)
│   ├── sql-workspace/     # SQL editor UI
│   │   └── results/       # Query result display
│   └── connections/       # Connection management UI
│
├── types/             # Type definitions (bottom layer)
│   ├── chart.ts           # Chart types
│   ├── connection.ts      # Connection types
│   ├── data-viz.ts        # Visualization types
│   ├── database.ts        # Database types
│   ├── inputs.ts          # Input component types
│   ├── report.ts          # Report types
│   └── interfaces/        # Interface contracts
│       ├── chart-builder.ts   # IChartBuilder, IInputInitializer
│       └── stores.ts          # IInputStore, IDatabaseStore
│
├── App.svelte         # Main application component (1040 lines)
└── main.ts            # Application entry point
```

### Path Aliases

| Alias | Path | Usage |
|-------|------|-------|
| `@/` | `src/` | General imports |
| `@core/` | `src/core/` | Core engine imports |
| `@plugins/` | `src/plugins/` | Plugin imports |
| `@app/` | `src/app/` | Application layer imports |

**Import Examples:**
```typescript
// ✅ Good: Core imports
import { componentRegistry, parseMarkdown } from '@core'
import { duckDBManager } from '@core/database'
import { fmt } from '@core/shared/format'

// ✅ Good: Plugin imports
import { Dropdown, useInput } from '@plugins/inputs'
import { BigValue, DataTable } from '@plugins/data-display'

// ✅ Good: App imports
import { reportStore, databaseStore } from '@app/stores'

// ❌ Bad: Core importing from plugins
// In core/engine/something.ts:
import { chartService } from '@plugins/viz'  // FORBIDDEN!

// ✅ Good: Core using interface
import type { IChartBuilder } from '@/types/interfaces'
const builder = container.resolve<IChartBuilder>('chartBuilder')
```

## Technology Stack

### Core Technologies

| Technology | Version | Purpose | Key Features |
|------------|---------|---------|--------------|
| **Svelte 5** | ^5.15 | UI Framework | Runes mode, compiler-optimized |
| **TypeScript** | ^5.7 | Type System | Strict mode, full type safety |
| **DuckDB-WASM** | ^1.29 | SQL Engine | WebAssembly, OPFS, Arrow |
| **Mosaic vgplot** | latest | Visualization | DuckDB integration, reactive |
| **Monaco Editor** | ^0.52 | Code Editor | IntelliSense, syntax highlight |
| **Unified/Remark** | ^11.0 | Markdown | Plugin-based parsing |
| **Vite** | ^6.0 | Build Tool | Fast HMR, optimized builds |

### Key Patterns

**1. Svelte 5 Runes** (NOT Svelte 4 Stores)
```typescript
// ✅ Correct: Svelte 5 Runes
let count = $state(0)
let doubled = $derived(count * 2)
$effect(() => {
  console.log('count changed:', count)
})

// ❌ Wrong: Svelte 4 Stores (don't use)
import { writable } from 'svelte/store'
let count = writable(0)
```

**2. Result Pattern** (NOT Exceptions)
```typescript
// ✅ Correct: Explicit error handling
const result = await connector.query(sql)
if (!result.ok) {
  handleError(result.error)  // Type-safe error
  return
}
const data = result.value

// ❌ Wrong: Exception-based
try {
  const data = await connector.query(sql)
} catch (error) {
  // Easy to forget, type-unsafe
}
```

**3. Dependency Injection** (NOT Direct Imports)
```typescript
// ✅ Correct: Core uses DI
import type { IChartBuilder } from '@/types/interfaces'
const builder = container.resolve<IChartBuilder>('chartBuilder')

// ❌ Wrong: Core imports plugin directly
import { chartService } from '@plugins/viz'
```

**4. Pure Functions** (NOT Side Effects)
```typescript
// ✅ Correct: Pure function
export function extractSQLBlocks(content: string): ParsedCodeBlock[] {
  return blocks  // No side effects
}

// ❌ Wrong: Side effects
export function extractSQLBlocks(content: string): void {
  globalState.blocks = blocks  // Mutates global state!
}
```

## Template Syntax

Miaoshou supports Svelte-like template syntax in Markdown:

### Variable Interpolation
```markdown
# Report for ${metadata.company}

Total sales: $${sales_data.total}
Average: ${sales_data.avg.toFixed(2)}
```

### Conditionals
```markdown
{#if ${revenue.value} > 1000000}
## 🎉 Great Performance!
Revenue exceeded $1M this quarter.
{:else if ${revenue.value} > 500000}
## 📈 Good Progress
Halfway to the $1M goal.
{:else}
## 📊 Room for Improvement
{/if}
```

**Supported Operators:** `>`, `<`, `>=`, `<=`, `===`, `!==`, `&&`, `||`

### Loops
```markdown
## Top Products

{#each top_products as product}
- **${product.name}**: $${product.revenue} (${product.units} units)
{:else}
No products found.
{/each}

## Indexed Loop
{#each customers as customer, index}
${index + 1}. ${customer.name} - ${customer.email}
{/each}
```

### Complete Example
```markdown
# Sales Report for ${inputs.region}

\`\`\`sql name=summary
SELECT
  SUM(revenue) as total_revenue,
  COUNT(*) as order_count
FROM sales
WHERE region = '${inputs.region}'
\`\`\`

{#if ${summary.total_revenue} > 100000}
## 🎉 Target Achieved!
{:else}
## 📊 Progress Report
{/if}

Total Revenue: $${summary.total_revenue}

## Top Sellers

\`\`\`sql name=top_sellers
SELECT product_name, revenue
FROM sales
WHERE region = '${inputs.region}'
ORDER BY revenue DESC
LIMIT 5
\`\`\`

{#each top_sellers as item, i}
${i + 1}. **${item.product_name}**: $${item.revenue}
{/each}
```

## Data Flow

### 1. File Upload → DuckDB
```
User uploads CSV/Parquet
     ↓
FileUploader.svelte
     ↓
loadDataIntoTable(file, tableName)
     ↓
DuckDB-WASM.insertArrowFromIPCStream()
     ↓
OPFS Persistence (survives page refresh)
```

### 2. SQL Query → Visualization
```
User writes SQL in Monaco Editor
     ↓
parseMarkdown() → Extract SQL blocks
     ↓
executeSQLBlock()
     ↓
DuckDB-WASM.query(sql)
     ↓
Apache Arrow → toJSON()
     ↓
chartBuilder.buildFromBlock()
     ↓
Mosaic Coordinator.update()
     ↓
vgplot.render() → DOM
```

### 3. Reactive Execution
```
User changes input (e.g., dropdown)
     ↓
inputStore.update({ region: 'West' })
     ↓
findAffectedBlocks(changedInputs)
     ↓
analyzeDependencies() → Dependency graph
     ↓
topologicalSort() → Execution order
     ↓
reExecuteAffectedBlocks()
     ↓
Update all dependent visualizations
```

## Plugin Development

### Plugin Structure
Each plugin follows this structure:

```
plugins/category/component-name/
├── index.ts               # Exports
├── ComponentName.svelte   # Svelte component
├── definition.ts          # Component registration
├── metadata.ts            # Metadata (props, examples)
├── types.ts               # TypeScript types
└── ComponentName.test.ts  # Tests (optional)
```

### Creating a New Plugin

**1. Define Metadata**
```typescript
// metadata.ts
import { createMetadata } from '@core/registry'

export const MyComponentMetadata = createMetadata({
  type: 'input',           // 'input' | 'dataDisplay' | 'ui' | 'layout'
  language: 'mycomponent', // Unique identifier
  displayName: 'My Component',
  description: 'Component description',
  icon: '🔧',
  category: 'custom',
  tags: ['input', 'custom'],
  props: [
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Current value'
    }
  ],
  examples: [
    `\`\`\`mycomponent
value: default
options: a, b, c
\`\`\``
  ]
})
```

**2. Define Component Registration**
```typescript
// definition.ts
import { defineComponent } from '@core/registry'
import { z } from 'zod'
import MyComponent from './MyComponent.svelte'
import { MyComponentMetadata } from './metadata'

const MyComponentSchema = z.object({
  value: z.string(),
  options: z.array(z.string()).optional()
})

export const componentRegistration = defineComponent({
  metadata: MyComponentMetadata,
  schema: MyComponentSchema,
  component: MyComponent,

  parseConfig: (block, context) => {
    return configParser.parse(block.content, MyComponentSchema)
  },

  resolveData: async (config, context) => {
    return {
      config,
      options: config.options || []
    }
  }
})
```

**3. Create Svelte Component**
```svelte
<!-- MyComponent.svelte -->
<script lang="ts">
  import type { MyComponentData } from './types'
  import type { IInputStore } from '@/types/interfaces'
  import { useStringInput } from '../use-input.svelte'

  interface Props {
    data: MyComponentData
    inputStore: IInputStore
  }

  let { data, inputStore }: Props = $props()

  const input = useStringInput(
    inputStore,
    data.config.name,
    data.config.defaultValue
  )
</script>

<div class="my-component">
  <select value={input.value} onchange={e => input.setValue(e.target.value)}>
    {#each data.options as option}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>
```

**4. Register Plugin**
```typescript
// bootstrap/init-plugins.ts
import { componentRegistration as myComponent } from '@plugins/custom/my-component'

export function registerPlugins(): void {
  // ... other registrations
  componentRegistry.register(myComponent)
}
```

## Common Tasks

### Adding a New Input Component

1. Create directory: `src/plugins/inputs/my-input/`
2. Copy structure from `dropdown/` as template
3. Update metadata, definition, and Svelte component
4. Use `useStringInput()` or `useNumberInput()` from `use-input.svelte.ts`
5. Register in `bootstrap/init-plugins.ts`
6. Test in Markdown: ` ```my-input ... ``` `

### Adding a New Chart Type

1. For vgplot charts: Add to `bootstrap/init-charts.ts`
2. For custom charts: Create in `plugins/data-display/`
3. Use D3.js or other libraries as needed
4. Ensure data binding works with SQL results

### Modifying Core Logic

**⚠️ Important:** Core changes affect all plugins.

1. Ensure NO imports from `@plugins/` or `@app/`
2. Use interfaces from `types/interfaces/`
3. Add tests if modifying pure functions
4. Run `npm run check` to verify type safety
5. Verify dependency rules: `grep -r "from '@plugins" src/core/`

### Adding a Store Interface

If core needs access to a new store:

1. Define interface in `types/interfaces/stores.ts`
2. Implement in `app/stores/`
3. Register adapter in `bootstrap/init-services.ts`
4. Core uses: `container.resolve<IMyStore>('myStore')`

## Code Quality Standards

### File Size Limits

- **Maximum:** 500 lines per file
- **Warning:** 400+ lines (consider refactoring)
- **Check:** `npm run check:size`

**Refactoring Strategies:**
- Extract pure functions to `core/shared/pure/`
- Split large components into sub-components
- Move types to separate files
- Extract constants to separate files

### TypeScript

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Best Practices:**
- ✅ Use `interface` for object types
- ✅ Use `type` for unions/intersections
- ✅ Define return types explicitly
- ✅ Avoid `any` (use `unknown` if needed)
- ✅ Use Zod for runtime validation

### Testing

**Where to Add Tests:**
- ✅ Pure functions in `core/shared/pure/`
- ✅ Utility functions with business logic
- ✅ Critical algorithms (dependency graph, etc.)
- ❌ Svelte components (complex, low ROI)
- ❌ Simple type definitions

**Test File Naming:**
```
block-utils.ts       → block-utils.test.ts
dependency-graph.ts  → dependency-graph.test.ts
```

**Run Tests:**
```bash
npm run test              # Run all tests
npm run test:coverage     # Coverage report
npm run test -- -t "test name"  # Run specific test
```

## UI Design System

### Tailwind CSS with Gemini Style

**Color System:**
```css
/* Gradient colors */
bg-gemini-primary    /* Blue → Purple → Pink gradient */
text-gemini-blue
text-gemini-purple
text-gemini-pink

/* Semantic colors */
bg-success    /* Green */
bg-error      /* Red */
bg-warning    /* Yellow */
bg-info       /* Blue */
```

**Typography:**
- **UI Font:** Inter (Google Sans alternative)
- **Code Font:** JetBrains Mono (with ligatures)

**Component Classes:**
```html
<!-- Buttons -->
<button class="btn btn-md btn-primary">Primary Action</button>
<button class="btn btn-sm btn-secondary">Secondary</button>

<!-- Forms -->
<input type="text" class="form-input" placeholder="Enter text" />
<select class="form-select">...</select>

<!-- Cards -->
<div class="evidence-card">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

<!-- Layouts -->
<div class="container">...</div>
<div class="grid grid-cols-3 gap-4">...</div>
```

**References:**
- [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) - Complete design system
- [COMPONENTS_QUICK_REFERENCE.md](./COMPONENTS_QUICK_REFERENCE.md) - Component examples

## Build Configuration

### Vite Config (CRITICAL for DuckDB-WASM)

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [svelte()],

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },

  optimizeDeps: {
    exclude: [
      '@duckdb/duckdb-wasm',
      'mosaic-core',
      'mosaic-sql'
    ]
  }
})
```

**Why CORS Headers?**
- DuckDB-WASM uses `SharedArrayBuffer`
- `SharedArrayBuffer` requires cross-origin isolation
- Without these headers, DuckDB will fail to initialize

**Troubleshooting:**
```bash
# If DuckDB fails to load:
1. Check browser console for SharedArrayBuffer errors
2. Verify headers in Network tab
3. Restart dev server: Ctrl+C, npm run dev
4. Clear browser cache
```

## Troubleshooting

### Common Issues

**1. DuckDB-WASM fails to initialize**
```
Error: SharedArrayBuffer is not defined
```
**Solution:** Use `npm run dev` (not `file://`), check CORS headers

**2. Import errors from core to plugins**
```
Error: Cannot find module '@plugins/...'
```
**Solution:** Core should NOT import plugins. Use DI instead:
```typescript
// ❌ Bad
import { chartService } from '@plugins/viz'

// ✅ Good
import type { IChartBuilder } from '@/types/interfaces'
const builder = container.resolve<IChartBuilder>('chartBuilder')
```

**3. Circular dependencies**
```
Warning: Circular dependency detected
```
**Solution:** Check dependency graph, usually core ↔ plugins. Fix by:
- Moving types to `types/`
- Using interfaces instead of concrete classes
- Extracting to separate modules

**4. Component not rendering**
```
Component 'mycomponent' not found in registry
```
**Solution:**
1. Check registration in `bootstrap/init-plugins.ts`
2. Verify language name matches exactly
3. Check console for registration errors
4. Test: `componentRegistry.has('mycomponent')`

**5. Type errors in Svelte files**
```
Property 'data' does not exist on type '{}'
```
**Solution:**
- Run `npm run check` to see all type errors
- Ensure props interface is defined: `let { data }: Props = $props()`
- Check TypeScript version (should be ^5.7)

## Performance Optimization

### DuckDB-WASM

**Best Practices:**
- ✅ Use `LIMIT` for large result sets
- ✅ Create indexes for repeated queries: `CREATE INDEX idx_date ON sales(date)`
- ✅ Use `EXPLAIN` to analyze query plans
- ✅ Prefer Parquet over CSV (10x faster)
- ❌ Avoid `SELECT *` (use specific columns)
- ❌ Avoid subqueries in WHERE (use JOINs)

**OPFS Persistence:**
```typescript
// Enable persistence (already configured)
await duckDBManager.initialize({
  persistenceMode: 'opfs',  // Data survives page refresh
  maxMemory: '1GB'
})
```

### Mosaic vgplot

**Optimization:**
- ✅ Let Mosaic query DuckDB directly (no JSON conversion)
- ✅ Use `filterBy` for cross-filtering
- ✅ Debounce interactive updates (300ms)
- ❌ Avoid materializing large datasets in memory

**Example:**
```typescript
// ✅ Good: Mosaic queries DuckDB
vgplot.plot(
  vgplot.lineY(
    vgplot.from('sales'),  // Direct DuckDB table
    { x: 'date', y: 'revenue' }
  )
)

// ❌ Bad: Load all data to memory
const data = await db.query('SELECT * FROM sales')
vgplot.plot(vgplot.lineY(data, { x: 'date', y: 'revenue' }))
```

## Documentation

### Architecture Docs

- [ARCHITECTURE_OVERVIEW.md](./docs/ARCHITECTURE_OVERVIEW.md) - Complete architecture guide
- [DEPENDENCY_ARCHITECTURE.md](./docs/DEPENDENCY_ARCHITECTURE.md) - Dependency rules
- [PLUGIN_ARCHITECTURE.md](./docs/PLUGIN_ARCHITECTURE.md) - Plugin development
- [DATA_SOURCES_ARCHITECTURE.md](./docs/DATA_SOURCES_ARCHITECTURE.md) - Connector system
- [DUCKDB_PERSISTENCE_ARCHITECTURE.md](./docs/DUCKDB_PERSISTENCE_ARCHITECTURE.md) - OPFS

### API References

- [Component Registry API](./docs/PLUGIN_ARCHITECTURE.md#组件注册表-api)
- [Template Syntax](./docs/PLUGIN_ARCHITECTURE.md#模板语法-templating)
- [Format System](./docs/PLUGIN_ARCHITECTURE.md#sharedformat)

## Git Workflow

### Recent Architecture Evolution

```bash
# View recent architectural changes
git log --oneline -10

# Recent milestones:
b3bba92 - P2: Store interfaces (core → app decoupling)
aa754f3 - P2: Implement store interfaces
fdf419e - P1: Dependency injection (core → plugins decoupling)
e1721be - P0: Bootstrap layer introduction
166fc3e - Fix: Component registration deduplication
```

**Current Status:**
- ✅ P0: Bootstrap layer - **Completed**
- ✅ P1: IChartBuilder interface - **Completed**
- ✅ P2: Store interfaces - **Completed**
- 📋 P3: Event bus - **Planned**

### Commit Message Guidelines

Follow conventional commits:

```bash
feat: add new radar chart component
fix: resolve circular dependency in core/registry
refactor: extract pure function to shared/pure
docs: update PLUGIN_ARCHITECTURE with new components
test: add tests for dependency-graph.ts
chore: update dependencies
```

## Summary

**Key Takeaways for Claude Code:**

1. **Respect Dependency Rules** - Core NEVER imports from plugins/app
2. **Use Svelte 5 Runes** - Not Svelte 4 stores
3. **Follow Result Pattern** - Explicit error handling
4. **Keep Files Small** - Max 500 lines
5. **Add Tests** - For pure functions and algorithms
6. **Use Type Safety** - Full TypeScript strict mode
7. **Check Before Commit** - `npm run check && npm run test`

**When Making Changes:**

- ✅ Read relevant architecture docs first
- ✅ Follow existing patterns and conventions
- ✅ Test locally with `npm run dev`
- ✅ Verify dependency rules with grep
- ✅ Run type checking with `npm run check`
- ✅ Check file sizes with `npm run check:size`
- ✅ Update docs if needed

**Need Help?**

- Check `docs/ARCHITECTURE_OVERVIEW.md` for big picture
- Check `docs/PLUGIN_ARCHITECTURE.md` for plugin development
- Check existing code for patterns
- Use TypeScript IntelliSense (Ctrl+Space)

---

**Last Updated:** 2025-12-23
**Architecture Version:** v1.0 (Bootstrap + DI + 43 Components)
**Document Maintainer:** Claude Code Expert Team
