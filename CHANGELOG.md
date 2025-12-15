# Changelog

All notable changes to Miao Vision will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-14

### Added - UI Design System

#### 📚 Documentation
- **Complete UI Design System Documentation** (`UI_DESIGN_SYSTEM.md`)
  - Comprehensive design principles and guidelines
  - Full color system with Gemini-inspired gradients
  - Typography system with Inter and JetBrains Mono fonts
  - Component library documentation
  - Layout patterns and spacing system
  - Animation and transition guidelines
  - Responsive design patterns
  - Accessibility best practices

- **Components Quick Reference** (`COMPONENTS_QUICK_REFERENCE.md`)
  - Fast lookup guide for all components
  - Code examples for buttons, forms, navigation
  - Common UI patterns and snippets
  - Utility class reference

- **VS Code Workspace Configuration** (`.vscode/`)
  - Optimized editor settings for the project
  - Recommended extensions for Svelte/TypeScript/Tailwind
  - Font configuration matching design system
  - Color theme customizations

#### 🎨 Design System Implementation

**Typography System**
- Implemented Inter font family (Google Sans alternative)
  - Weights: 400, 500, 600, 700
  - Optimized letter-spacing for different sizes
  - Professional line-height ratios
- Implemented JetBrains Mono for code
  - Enabled font ligatures for better code readability
  - Applied to Monaco Editor and Markdown Editor
- Enhanced font rendering
  - Antialiasing and subpixel rendering
  - OpenType features: kerning, ligatures, contextual alternates

**Button Component System** (`src/app.css`)
- Base `.btn` class with consistent styling
- Size variants: `.btn-sm`, `.btn-md`, `.btn-lg`
- Style variants:
  - `.btn-primary` - Gemini gradient (blue → purple)
  - `.btn-secondary` - Dark gray
  - `.btn-ghost` - Transparent
  - `.btn-danger` - Red
  - `.btn-outline` - Bordered
- Icon button sizes: `.btn-icon`, `.btn-icon-sm`
- Smooth hover effects with transform and shadow
- Focus-visible keyboard navigation support
- Disabled state styling

**Form Component System** (`src/app.css`)
- Input components: `.form-input`, `.form-select`, `.form-textarea`
- Size modifiers: `.form-input-sm`, `.form-input-lg`
- Supporting classes:
  - `.form-label` - Consistent label styling
  - `.form-group` - Proper spacing
  - `.form-error` - Error messages
  - `.form-hint` - Helper text
- Hover state border color transitions
- Focus ring with primary color
- Disabled state styling

**Navigation Enhancement** (`src/App.svelte`)
- Improved `.nav-item` interactions
  - Cubic-bezier easing for smooth transitions
  - Subtle translateX on hover (2px)
  - Focus-visible indicators
  - Active state with semibold font weight
- Enhanced `.report-item` styling
  - Consistent with nav-item behavior
  - Smooth delete button reveal animation
  - Scale effect on delete button hover
- Optimized scrollbar styling for report list
  - Thin scrollbar (6px width)
  - Smooth color transitions
  - Auto-hide behavior

**Responsive Design** (`src/App.svelte`)
- Tablet breakpoint (1024px)
  - Fixed sidebar with slide-in animation
  - Full-width main content
  - Single-column layouts
  - Optimized padding and font sizes
- Mobile breakpoint (768px)
  - Reduced spacing and font sizes
  - Full-width buttons
  - Stacked layouts
  - Compact cards
- Small mobile breakpoint (480px)
  - Full-width sidebar
  - Further reduced spacing
  - Maximum touch-friendly sizing

### Changed

**Code Quality**
- Fixed Svelte 5 reactivity warnings
  - Updated `markdownEditor` to use `$state<MarkdownEditor | null>(null)` in `src/App.svelte:29`
  - Updated `contentContainer` to use `$state<HTMLDivElement | null>(null)` in `src/components/ReportRenderer.svelte:21`
- Cleaned up unused CSS selectors
  - Removed `.result-table` responsive styles from `src/components/ReportRenderer.svelte`

**Performance**
- Optimized font loading with `display=swap`
- Added preconnect hints for Google Fonts
- Reduced animation durations for micro-interactions

**Accessibility**
- Added `focus-visible` states to all interactive elements
- Implemented proper ARIA labels for icon buttons
- Enhanced keyboard navigation support
- Ensured WCAG 2.1 AA color contrast compliance

### Technical Details

**Files Modified**
- `src/App.svelte` - Navigation, buttons, responsive layout
- `src/app.css` - Design system components, utilities
- `src/components/MonacoEditor.svelte` - JetBrains Mono font
- `src/components/MarkdownEditor.svelte` - JetBrains Mono font
- `src/components/ReportRenderer.svelte` - Fixed reactivity, cleaned CSS
- `index.html` - Added Google Fonts (Inter, JetBrains Mono)
- `tailwind.config.js` - Typography system configuration
- `README.md` - Added UI Design System section

**Files Created**
- `UI_DESIGN_SYSTEM.md` - Complete design system documentation
- `COMPONENTS_QUICK_REFERENCE.md` - Quick reference guide
- `.vscode/settings.json` - Workspace settings
- `.vscode/extensions.json` - Recommended extensions
- `CHANGELOG.md` - This file

### Dependencies

No new runtime dependencies added. All improvements use existing:
- Tailwind CSS (existing)
- Google Fonts CDN (existing infrastructure)

---

## [1.0.0] - 2025-12-01

### Added
- Initial release
- CSV/Parquet file upload
- DuckDB-WASM integration
- SQL query editor with Monaco
- Vgplot chart visualization
- Markdown-driven reports
- Svelte 5 Runes state management

---

[Unreleased]: https://github.com/yourusername/miaoshou-vision/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/yourusername/miaoshou-vision/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yourusername/miaoshou-vision/releases/tag/v1.0.0
