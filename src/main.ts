import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'

// Import core registry
import { componentRegistry } from '@core/registry'

// Import plugin initialization
import { initializePlugins, getPluginDocumentation } from '@core/registry/init-plugins'

// Initialize Plugin System
console.log('🚀 Main.ts: App starting...')
console.log('\n🔌 Initializing Plugin System...')
initializePlugins()

// Log plugin documentation
const pluginDocs = getPluginDocumentation()
console.log('\n📚 Plugin Documentation:')
console.log('  Total components:', pluginDocs.total)
console.log('  By category:', pluginDocs.byCategory)
console.log('  Registered languages:', componentRegistry.getAllLanguages())

console.log('\n✨ Plugin system initialized successfully!\n')

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app
