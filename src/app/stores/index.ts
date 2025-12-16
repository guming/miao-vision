/**
 * Application Stores
 *
 * Svelte stores for application state management.
 */

// Report state
export { reportStore } from './report.svelte'

// Database state
export { databaseStore } from './database.svelte'

// Chart state
export { chartStore } from './chart.svelte'

// Input state
export {
  createInputStore,
  getInputStore,
  clearInputStore,
  clearAllInputStores
} from './report-inputs'

export type {
  InputStore,
  InputState,
  InputValue,
  InputDefinition
} from './report-inputs'
