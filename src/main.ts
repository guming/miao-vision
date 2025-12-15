import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'

// Import block registry to trigger registration (legacy system)
import './lib/blocks/index'
import { blockRegistry } from './lib/blocks/registry'

// Import and initialize new Component Registry system
import { componentRegistry } from './lib/core/component-registry'
import { initializeComponents, getComponentDocumentation } from './lib/core/init-components'

// Verify legacy block registration
console.log('🚀 Main.ts: App starting...')
console.log('📦 Legacy blocks:', blockRegistry.getAll())

// Initialize new Component Registry
console.log('\n🎨 Initializing Component Registry System...')
initializeComponents()

// Log component documentation
const componentDocs = getComponentDocumentation()
console.log('\n📚 Component Documentation:')
console.log('  Total components:', componentDocs.total)
console.log('  By category:', componentDocs.byCategory)
console.log('  Registered languages:', componentRegistry.getAllLanguages())

console.log('\n✨ Component Registry initialized successfully!\n')

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app
