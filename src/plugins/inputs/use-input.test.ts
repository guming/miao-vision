/**
 * useInput Composable - Unit Tests
 *
 * Tests for the Svelte 5 input binding composable.
 * Note: Full reactivity testing requires component-level tests.
 * These tests focus on the API contract and store interactions.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createInputStore, type InputStore } from '@app/stores/report-inputs'

// ============================================================================
// InputStore Tests (Foundation for useInput)
// ============================================================================

describe('InputStore', () => {
  let store: InputStore

  beforeEach(() => {
    store = createInputStore()
  })

  describe('basic operations', () => {
    it('creates store with empty initial state', () => {
      expect(store.has('test')).toBe(false)
    })

    it('creates store with initial values', () => {
      const storeWithInit = createInputStore({ region: 'West', year: 2024 })
      expect(storeWithInit.getValue('region')).toBe('West')
      expect(storeWithInit.getValue('year')).toBe(2024)
    })

    it('sets and gets string values', () => {
      store.setValue('region', 'East')
      expect(store.getValue('region')).toBe('East')
      expect(store.has('region')).toBe(true)
    })

    it('sets and gets number values', () => {
      store.setValue('count', 42)
      expect(store.getValue('count')).toBe(42)
    })

    it('sets and gets boolean values', () => {
      store.setValue('active', true)
      expect(store.getValue('active')).toBe(true)
    })

    it('sets and gets array values', () => {
      store.setValue('tags', ['a', 'b', 'c'])
      expect(store.getValue('tags')).toEqual(['a', 'b', 'c'])
    })

    it('sets null values', () => {
      store.setValue('optional', null)
      expect(store.getValue('optional')).toBe(null)
    })

    it('returns null for non-existent keys', () => {
      expect(store.getValue('missing')).toBe(null)
    })
  })

  describe('has()', () => {
    it('returns false for undefined keys', () => {
      expect(store.has('undefined')).toBe(false)
    })

    it('returns false for null values', () => {
      store.setValue('nullValue', null)
      expect(store.has('nullValue')).toBe(false)
    })

    it('returns true for non-null values', () => {
      store.setValue('value', 'test')
      expect(store.has('value')).toBe(true)
    })

    it('returns true for empty string', () => {
      store.setValue('empty', '')
      expect(store.has('empty')).toBe(true)
    })

    it('returns true for zero', () => {
      store.setValue('zero', 0)
      expect(store.has('zero')).toBe(true)
    })

    it('returns true for false boolean', () => {
      store.setValue('bool', false)
      expect(store.has('bool')).toBe(true)
    })
  })

  describe('reset operations', () => {
    it('resets single input', () => {
      store.setValue('a', 1)
      store.setValue('b', 2)

      store.resetInput('a')

      expect(store.has('a')).toBe(false)
      expect(store.getValue('b')).toBe(2)
    })

    it('resets all inputs to initial values', () => {
      const storeWithInit = createInputStore({ initial: 'value' })
      storeWithInit.setValue('initial', 'modified')
      storeWithInit.setValue('new', 'added')

      storeWithInit.reset()

      expect(storeWithInit.getValue('initial')).toBe('value')
      expect(storeWithInit.has('new')).toBe(false)
    })
  })

  describe('subscribe', () => {
    it('notifies subscribers on value change', () => {
      const values: string[] = []

      store.subscribe(state => {
        if (state.test !== undefined) {
          values.push(state.test as string)
        }
      })

      store.setValue('test', 'first')
      store.setValue('test', 'second')

      expect(values).toContain('first')
      expect(values).toContain('second')
    })

    it('unsubscribe stops notifications', () => {
      let callCount = 0

      const unsubscribe = store.subscribe(() => {
        callCount++
      })

      store.setValue('a', 1)
      const countAfterFirst = callCount

      unsubscribe()

      store.setValue('b', 2)

      // Should not increase after unsubscribe
      expect(callCount).toBe(countAfterFirst)
    })
  })
})

// ============================================================================
// useInput API Contract Tests
// ============================================================================

describe('useInput API Contract', () => {
  /**
   * These tests verify the expected behavior of useInput through
   * the InputStore, which is the foundation of the composable.
   *
   * Full reactivity testing would require Svelte component testing.
   */

  describe('default value initialization', () => {
    it('should set default value when store is empty', () => {
      const store = createInputStore()
      const name = 'region'
      const defaultValue = 'West'

      // Simulate what useInput does on mount
      if (defaultValue !== undefined && !store.has(name)) {
        store.setValue(name, defaultValue)
      }

      expect(store.getValue(name)).toBe(defaultValue)
    })

    it('should not override existing value with default', () => {
      const store = createInputStore({ region: 'East' })
      const name = 'region'
      const defaultValue = 'West'

      // Simulate what useInput does on mount
      if (defaultValue !== undefined && !store.has(name)) {
        store.setValue(name, defaultValue)
      }

      expect(store.getValue(name)).toBe('East')
    })
  })

  describe('value synchronization', () => {
    it('should sync value from store updates', () => {
      const store = createInputStore()
      let syncedValue: string | null = null

      // Simulate useInput subscription behavior
      store.subscribe(state => {
        const storeValue = state['test']
        if (storeValue !== undefined) {
          syncedValue = storeValue as string | null
        }
      })

      store.setValue('test', 'updated')

      expect(syncedValue).toBe('updated')
    })

    it('should handle multiple rapid updates', () => {
      const store = createInputStore()
      const values: string[] = []

      store.subscribe(state => {
        const value = state['rapid']
        if (value !== undefined) {
          values.push(value as string)
        }
      })

      store.setValue('rapid', 'a')
      store.setValue('rapid', 'b')
      store.setValue('rapid', 'c')

      expect(values[values.length - 1]).toBe('c')
    })
  })

  describe('setValue behavior', () => {
    it('should update store when setValue is called', () => {
      const store = createInputStore()
      const name = 'input'

      // Simulate useInput.setValue
      const setValue = (value: string | null) => {
        store.setValue(name, value)
      }

      setValue('new value')

      expect(store.getValue(name)).toBe('new value')
    })

    it('should handle null values', () => {
      const store = createInputStore({ input: 'initial' })

      store.setValue('input', null)

      expect(store.getValue('input')).toBe(null)
    })
  })

  describe('reset behavior', () => {
    it('should reset to default value', () => {
      const store = createInputStore()
      const name = 'input'
      const defaultValue = 'default'

      store.setValue(name, 'changed')

      // Simulate useInput.reset with default
      store.setValue(name, defaultValue)

      expect(store.getValue(name)).toBe(defaultValue)
    })

    it('should clear value when no default', () => {
      const store = createInputStore()
      const name = 'input'

      store.setValue(name, 'value')

      // Simulate useInput.reset without default
      store.resetInput(name)

      expect(store.has(name)).toBe(false)
    })
  })
})

// ============================================================================
// Type-specific Input Tests
// ============================================================================

describe('Type-specific inputs', () => {
  describe('string inputs', () => {
    it('handles string values correctly', () => {
      const store = createInputStore()
      store.setValue('name', 'John')
      expect(store.getValue('name')).toBe('John')
    })

    it('handles empty strings', () => {
      const store = createInputStore()
      store.setValue('name', '')
      expect(store.getValue('name')).toBe('')
      expect(store.has('name')).toBe(true)
    })
  })

  describe('number inputs', () => {
    it('handles integer values', () => {
      const store = createInputStore()
      store.setValue('count', 42)
      expect(store.getValue('count')).toBe(42)
    })

    it('handles decimal values', () => {
      const store = createInputStore()
      store.setValue('price', 19.99)
      expect(store.getValue('price')).toBe(19.99)
    })

    it('handles zero', () => {
      const store = createInputStore()
      store.setValue('zero', 0)
      expect(store.getValue('zero')).toBe(0)
      expect(store.has('zero')).toBe(true)
    })

    it('handles negative numbers', () => {
      const store = createInputStore()
      store.setValue('negative', -10)
      expect(store.getValue('negative')).toBe(-10)
    })
  })

  describe('boolean inputs', () => {
    it('handles true value', () => {
      const store = createInputStore()
      store.setValue('active', true)
      expect(store.getValue('active')).toBe(true)
    })

    it('handles false value', () => {
      const store = createInputStore()
      store.setValue('active', false)
      expect(store.getValue('active')).toBe(false)
      expect(store.has('active')).toBe(true)
    })
  })

  describe('array inputs', () => {
    it('handles string arrays', () => {
      const store = createInputStore()
      store.setValue('tags', ['a', 'b', 'c'])
      expect(store.getValue('tags')).toEqual(['a', 'b', 'c'])
    })

    it('handles empty arrays', () => {
      const store = createInputStore()
      store.setValue('empty', [])
      expect(store.getValue('empty')).toEqual([])
    })

    it('handles number arrays', () => {
      const store = createInputStore()
      store.setValue('numbers', [1, 2, 3])
      expect(store.getValue('numbers')).toEqual([1, 2, 3])
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge cases', () => {
  it('handles special characters in input names', () => {
    const store = createInputStore()
    store.setValue('input-with-dash', 'value')
    store.setValue('input_with_underscore', 'value')
    store.setValue('input.with.dots', 'value')

    expect(store.has('input-with-dash')).toBe(true)
    expect(store.has('input_with_underscore')).toBe(true)
    expect(store.has('input.with.dots')).toBe(true)
  })

  it('handles unicode input names', () => {
    const store = createInputStore()
    store.setValue('输入', 'value')
    expect(store.getValue('输入')).toBe('value')
  })

  it('handles very long values', () => {
    const store = createInputStore()
    const longValue = 'x'.repeat(10000)
    store.setValue('long', longValue)
    expect(store.getValue('long')).toBe(longValue)
  })

  it('handles rapid toggle between values', () => {
    const store = createInputStore()

    for (let i = 0; i < 100; i++) {
      store.setValue('toggle', i % 2 === 0 ? 'on' : 'off')
    }

    expect(store.getValue('toggle')).toBe('off')
  })

  it('handles concurrent access to different keys', () => {
    const store = createInputStore()

    store.setValue('a', 1)
    store.setValue('b', 2)
    store.setValue('c', 3)

    expect(store.getValue('a')).toBe(1)
    expect(store.getValue('b')).toBe(2)
    expect(store.getValue('c')).toBe(3)
  })
})
