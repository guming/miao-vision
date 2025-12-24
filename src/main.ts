import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'

// Import bootstrap (handles all initialization)
import { initializeApp, getComponentDocumentation } from '@/bootstrap'

// Import stores for E2E testing
import { reportStore } from '@app/stores/report.svelte'
import { databaseStore } from '@app/stores/database.svelte'

// Initialize Application
console.log('🚀 Main.ts: App starting...')
initializeApp()

// Log component documentation
const docs = getComponentDocumentation()
console.log('\n📚 Component Documentation:')
console.log('  Total components:', docs.total)
console.log('  By category:', docs.byCategory)

console.log('\n✨ Application ready!\n')

const app = mount(App, {
  target: document.getElementById('app')!
})

// Expose stores globally for E2E testing
if (typeof window !== 'undefined') {
  ;(window as any).reportStore = reportStore
  ;(window as any).databaseStore = databaseStore
}

export default app
