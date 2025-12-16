# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Miaoshou Vision is a local-first data analytics framework that runs entirely in the browser. It combines DuckDB-WASM for SQL analytics, Mosaic vgplot for visualization, and a Markdown-based report system.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Production build
npm run check    # TypeScript/Svelte type checking
npm run check:size  # Check for files exceeding 500 lines
npm run preview  # Preview production build
```

**Important:** Always use `npm run dev` - the app requires proper CORS headers for DuckDB-WASM's SharedArrayBuffer support.

## Architecture

### Core Technology Stack
- **Svelte 5 with Runes mode** - All components use `$state`, `$derived`, `$effect`, `$props`
- **DuckDB-WASM** - Browser-based SQL engine running in Web Workers
- **Mosaic vgplot** - Declarative visualization integrated with DuckDB
- **Monaco Editor** - SQL and Markdown editing
- **Unified/Remark** - Markdown parsing with custom plugins

### Plugin Architecture (Evidence.dev Style)

The project uses a plugin architecture that separates the core engine from pluggable components.

```
src/
├── core/              # Core engine (not pluggable)
│   ├── database/      # DuckDB-WASM, Mosaic, table loading
│   ├── engine/        # Block rendering, reactive execution
│   ├── markdown/      # Parser, SQL executor, conditionals
│   ├── registry/      # Component registration system
│   └── shared/        # DI, pure functions, chart service
│
├── plugins/           # Pluggable components
│   ├── inputs/        # Dropdown, ButtonGroup
│   ├── data-display/  # BigValue, DataTable, Value
│   ├── viz/           # Chart utilities, data adapter
│   └── ui/            # Alert
│
├── app/               # Application layer
│   └── stores/        # Svelte stores (report, database, chart, inputs)
│
├── components/        # Svelte UI components
├── types/             # TypeScript type definitions
└── App.svelte         # Main application component
```

### Path Aliases

| Alias | Path | Usage |
|-------|------|-------|
| `@core/` | `src/core/` | Core engine imports |
| `@plugins/` | `src/plugins/` | Plugin imports |
| `@app/` | `src/app/` | Application layer imports |
| `@/` | `src/` | General imports |

**Import Examples:**
```typescript
// Core imports
import { componentRegistry, parseMarkdown } from '@core'
import { duckDBManager } from '@core/database'

// Plugin imports
import { Dropdown, useInput } from '@plugins/inputs'
import { BigValue, DataTable } from '@plugins/data-display'

// App imports
import { reportStore, databaseStore } from '@app/stores'
```

### Data Flow
1. Files uploaded via FileUploader → DuckDB-WASM (Web Worker)
2. SQL queries executed via QueryRunner → DuckDB → Apache Arrow → JSON
3. Visualization: Query results → Mosaic Coordinator → vgplot → DOM

### Creating New Plugins

See `docs/PLUGIN_ARCHITECTURE.md` for detailed instructions on:
- Plugin directory structure
- Metadata definition
- Component registration
- Best practices

## Important Conventions

### Svelte 5 Runes
All state management uses Svelte 5 Runes syntax:
```typescript
let state = $state<Type>({ ... })
let derived = $derived(state.something)
$effect(() => { /* side effects */ })
```

### File Size Limit
Files should stay under 500 lines. Run `npm run check:size` to verify. Files over 400 lines should be considered for refactoring.

### DuckDB-WASM Requirements
The Vite dev server is configured with CORS headers for SharedArrayBuffer support:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

### UI Design System
Uses Tailwind CSS with a custom Gemini-style design system:
- Gradient colors: `bg-gemini-primary`, `text-gemini-*`
- Fonts: Inter (UI), JetBrains Mono (code)
- Component classes: `btn`, `btn-primary`, `form-input`, `evidence-card`

See `UI_DESIGN_SYSTEM.md` and `COMPONENTS_QUICK_REFERENCE.md` for details.
