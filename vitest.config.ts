import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    globals: true,
    environment: 'jsdom',
    // Workflow tests spawn the real CLI several times. CI and busy developer
    // machines need more than Vitest's 5s unit-test default for those subprocesses.
    testTimeout: 30_000,
    include: ['packages/miao-viz-cli/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'packages/miao-viz-cli/src/**/*.ts'
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/index.ts',
        '**/types.ts',
        '**/metadata.ts',
        '**/definition.ts',
        '**/*.svelte'
      ],
      thresholds: {
        lines: 25,
        functions: 25,
        branches: 20,
        statements: 25
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src')
    }
  }
})
