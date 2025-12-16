/**
 * useInput - Svelte 5 Composable for Input Components
 *
 * Provides a reactive binding between input components and the InputStore.
 * Handles:
 * - Initial value synchronization
 * - Reactive updates from store
 * - Default value initialization
 *
 * @module inputs/use-input
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useInput } from '@/lib/inputs/use-input.svelte'
 *
 *   let { data, inputStore }: Props = $props()
 *
 *   const input = useInput(inputStore, data.config.name, data.config.defaultValue)
 * </script>
 *
 * <select value={input.value} onchange={e => input.setValue(e.target.value)}>
 * ```
 */

import type { InputStore, InputValue } from '@app/stores'

/**
 * Input binding result
 */
export interface InputBinding<T extends InputValue = InputValue> {
  /** Current value (reactive) */
  readonly value: T | null
  /** Set a new value */
  setValue: (value: T | null) => void
  /** Reset to default value */
  reset: () => void
  /** Check if has a value set */
  readonly hasValue: boolean
}

/**
 * Create a reactive input binding
 *
 * This composable connects an input component to the InputStore with proper
 * Svelte 5 reactivity. It handles:
 * - Subscribing to store updates
 * - Setting default values on mount
 * - Providing a reactive `value` that updates when store changes
 *
 * @param store - The InputStore instance
 * @param name - The input name (key in store)
 * @param defaultValue - Optional default value to set if not already in store
 * @returns InputBinding with reactive value and setter
 *
 * @example Basic usage
 * ```svelte
 * const input = useInput(inputStore, 'region', 'West')
 *
 * // Read value
 * console.log(input.value) // 'West'
 *
 * // Set value
 * input.setValue('East')
 *
 * // Reset to default
 * input.reset()
 * ```
 */
export function useInput<T extends InputValue = InputValue>(
  store: InputStore,
  name: string,
  defaultValue?: T
): InputBinding<T> {
  // Internal state that tracks the store value
  let internalValue = $state<T | null>((defaultValue ?? null) as T | null)

  // Initialize default value in store if needed
  $effect(() => {
    if (defaultValue !== undefined && !store.has(name)) {
      store.setValue(name, defaultValue)
    }
  })

  // Subscribe to store changes
  $effect(() => {
    const unsubscribe = store.subscribe(state => {
      const storeValue = state[name]
      if (storeValue !== undefined) {
        internalValue = storeValue as T | null
      } else if (defaultValue !== undefined) {
        internalValue = defaultValue as T | null
      } else {
        internalValue = null
      }
    })

    return unsubscribe
  })

  return {
    get value() {
      return internalValue
    },

    setValue(value: T | null) {
      store.setValue(name, value)
    },

    reset() {
      if (defaultValue !== undefined) {
        store.setValue(name, defaultValue)
      } else {
        store.resetInput(name)
      }
    },

    get hasValue() {
      return store.has(name)
    }
  }
}

/**
 * Create a reactive input binding for string values
 *
 * Type-safe version of useInput for string inputs
 */
export function useStringInput(
  store: InputStore,
  name: string,
  defaultValue?: string
): InputBinding<string> {
  return useInput<string>(store, name, defaultValue)
}

/**
 * Create a reactive input binding for number values
 *
 * Type-safe version of useInput for number inputs
 */
export function useNumberInput(
  store: InputStore,
  name: string,
  defaultValue?: number
): InputBinding<number> {
  return useInput<number>(store, name, defaultValue)
}

/**
 * Create a reactive input binding for boolean values
 *
 * Type-safe version of useInput for boolean inputs (checkboxes)
 */
export function useBooleanInput(
  store: InputStore,
  name: string,
  defaultValue?: boolean
): InputBinding<boolean> {
  return useInput<boolean>(store, name, defaultValue)
}

/**
 * Create a reactive input binding for array values
 *
 * Type-safe version of useInput for multi-select inputs
 */
export function useArrayInput(
  store: InputStore,
  name: string,
  defaultValue?: string[]
): InputBinding<string[]> {
  return useInput<string[]>(store, name, defaultValue)
}
