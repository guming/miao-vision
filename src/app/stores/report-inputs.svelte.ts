/**
 * Report Inputs Store (Svelte 5 Runes)
 *
 * Manages interactive input state for reports
 * Input components (Dropdown, DateRange, etc.) update this store
 * SQL queries and charts subscribe to changes
 */

/**
 * Input value types
 */
export type InputValue = string | number | boolean | Date | null | string[] | number[]

/**
 * Input state: key-value pairs of input names and their values
 */
export interface InputState {
  [key: string]: InputValue
}

/**
 * Input definition with metadata
 */
export interface InputDefinition {
  name: string
  type: 'dropdown' | 'daterange' | 'buttongroup' | 'checkbox' | 'slider' | 'text'
  label?: string
  defaultValue?: InputValue
}

/**
 * Input store interface for Svelte 5
 * Compatible with IInputStore from types/interfaces/stores.ts
 */
export interface InputStore {
  /** Get current state (reactive) */
  readonly state: InputState
  /** Subscribe to store changes (for IInputStore compatibility) */
  subscribe(fn: (value: InputState) => void): () => void
  /** Set a single input value */
  setValue(name: string, value: InputValue): void
  /** Get current value of an input */
  getValue(name: string): InputValue
  /** Reset to initial values */
  reset(): void
  /** Reset a single input */
  resetInput(name: string): void
  /** Check if an input has a value */
  has(name: string): boolean
  /** Set multiple values at once */
  setValues(values: InputState): void
  /** Get all current values */
  getAll(): InputState
}

/**
 * Create a report inputs store using Svelte 5 Runes
 */
export function createInputStore(initialValues: InputState = {}): InputStore {
  let values = $state<InputState>({ ...initialValues })

  // Subscribers for IInputStore compatibility
  const subscribers = new Set<(state: InputState) => void>()

  function notifySubscribers() {
    const currentValues = { ...values }
    subscribers.forEach(fn => fn(currentValues))
  }

  return {
    get state() {
      return values
    },

    subscribe(fn: (value: InputState) => void): () => void {
      // Call immediately with current value
      fn({ ...values })
      // Add to subscribers
      subscribers.add(fn)
      // Return unsubscribe function
      return () => {
        subscribers.delete(fn)
      }
    },

    setValue(name: string, value: InputValue) {
      values = { ...values, [name]: value }
      notifySubscribers()
    },

    getValue(name: string): InputValue {
      return values[name] ?? null
    },

    reset() {
      values = { ...initialValues }
      notifySubscribers()
    },

    resetInput(name: string) {
      const newState = { ...values }
      delete newState[name]
      values = newState
      notifySubscribers()
    },

    has(name: string): boolean {
      return name in values && values[name] !== null && values[name] !== undefined
    },

    setValues(newValues: InputState) {
      values = { ...values, ...newValues }
      notifySubscribers()
    },

    getAll(): InputState {
      return { ...values }
    }
  }
}

/**
 * Global registry of input stores by report ID
 */
const inputStoreRegistry = new Map<string, InputStore>()

/**
 * Get or create input store for a report
 */
export function getInputStore(reportId: string, initialValues: InputState = {}): InputStore {
  if (!inputStoreRegistry.has(reportId)) {
    inputStoreRegistry.set(reportId, createInputStore(initialValues))
  }
  return inputStoreRegistry.get(reportId)!
}

/**
 * Clear input store for a report
 */
export function clearInputStore(reportId: string) {
  inputStoreRegistry.delete(reportId)
}

/**
 * Clear all input stores
 */
export function clearAllInputStores() {
  inputStoreRegistry.clear()
}
