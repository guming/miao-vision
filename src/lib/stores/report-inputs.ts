/**
 * Report Inputs Store
 *
 * Manages interactive input state for reports
 * Input components (Dropdown, DateRange, etc.) update this store
 * SQL queries and charts subscribe to changes
 */

import { writable, derived, get } from 'svelte/store'

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
 * Create a report inputs store
 *
 * Each report gets its own isolated input store
 */
export function createInputStore(initialValues: InputState = {}) {
  const { subscribe, set, update } = writable<InputState>(initialValues)

  return {
    subscribe,
    set,
    update,

    /**
     * Set a single input value
     */
    setValue(name: string, value: InputValue) {
      update(state => ({
        ...state,
        [name]: value
      }))
    },

    /**
     * Get current value of an input
     */
    getValue(name: string): InputValue {
      const state = get({ subscribe })
      return state[name] ?? null
    },

    /**
     * Reset to initial values
     */
    reset() {
      set(initialValues)
    },

    /**
     * Reset a single input
     */
    resetInput(name: string) {
      update(state => {
        const newState = { ...state }
        delete newState[name]
        return newState
      })
    },

    /**
     * Check if an input has a value
     */
    has(name: string): boolean {
      const state = get({ subscribe })
      return name in state && state[name] !== null && state[name] !== undefined
    }
  }
}

/**
 * Type for input store
 */
export type InputStore = ReturnType<typeof createInputStore>

/**
 * Global registry of input stores by report ID
 * Allows multiple reports to have independent input state
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
