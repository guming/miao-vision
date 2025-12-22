import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/pure/**/*.ts', 'src/lib/inputs/**/*.ts', 'src/lib/services/**/*.ts'],
      exclude: ['src/lib/pure/index.ts', 'src/lib/services/index.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
      '@app': path.resolve(__dirname, './src/app')
    }
  }
})
