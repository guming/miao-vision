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

### Key Directories
```
src/
├── components/       # Svelte UI components
├── lib/
│   ├── blocks/       # Block-level rendering (SQL, charts)
│   ├── core/         # Core application logic
│   ├── database/     # DuckDB-WASM wrapper
│   ├── markdown/     # Markdown parser and plugins
│   ├── stores/       # Svelte 5 Runes state management
│   └── viz/          # Mosaic/vgplot connector
├── types/            # TypeScript type definitions
└── App.svelte        # Main application component
```

### Data Flow
1. Files uploaded via FileUploader → DuckDB-WASM (Web Worker)
2. SQL queries executed via QueryRunner → DuckDB → Apache Arrow → JSON
3. Visualization: Query results → Mosaic Coordinator → vgplot → DOM

### Path Alias
Use `@/` for imports from `src/` (configured in tsconfig.json and vite.config.ts).

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
