/**
 * Secrets Manager - Unit Tests
 *
 * Tests for the secure secrets storage (sessionStorage-based)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSecretsManager, type ConnectionSecrets } from './secrets'

// Mock sessionStorage
const mockStorage = new Map<string, string>()

const mockSessionStorage = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage.set(key, value)
  }),
  removeItem: vi.fn((key: string) => {
    mockStorage.delete(key)
  }),
  clear: vi.fn(() => {
    mockStorage.clear()
  }),
  length: 0,
  key: vi.fn(() => null)
}

// Replace sessionStorage for tests
vi.stubGlobal('sessionStorage', mockSessionStorage)

describe('SecretsManager', () => {
  let secretsManager: ReturnType<typeof createSecretsManager>

  beforeEach(() => {
    // Clear mock storage before each test
    mockStorage.clear()
    vi.clearAllMocks()
    secretsManager = createSecretsManager()
  })

  describe('set', () => {
    it('stores secrets for a connection', () => {
      const secrets: ConnectionSecrets = { token: 'my-token' }
      secretsManager.set('conn-1', secrets)

      expect(mockSessionStorage.setItem).toHaveBeenCalled()
      const stored = JSON.parse(mockStorage.get('miao-vision-secrets') || '{}')
      expect(stored['conn-1']).toEqual(secrets)
    })

    it('stores multiple secrets for different connections', () => {
      secretsManager.set('conn-1', { token: 'token-1' })
      secretsManager.set('conn-2', { apiKey: 'key-2' })

      const stored = JSON.parse(mockStorage.get('miao-vision-secrets') || '{}')
      expect(stored['conn-1']).toEqual({ token: 'token-1' })
      expect(stored['conn-2']).toEqual({ apiKey: 'key-2' })
    })

    it('overwrites existing secrets', () => {
      secretsManager.set('conn-1', { token: 'old-token' })
      secretsManager.set('conn-1', { token: 'new-token' })

      const stored = JSON.parse(mockStorage.get('miao-vision-secrets') || '{}')
      expect(stored['conn-1']).toEqual({ token: 'new-token' })
    })

    it('stores both token and apiKey', () => {
      const secrets: ConnectionSecrets = {
        token: 'bearer-token',
        apiKey: 'md-api-key'
      }
      secretsManager.set('conn-1', secrets)

      const stored = JSON.parse(mockStorage.get('miao-vision-secrets') || '{}')
      expect(stored['conn-1']).toEqual(secrets)
    })
  })

  describe('get', () => {
    it('returns secrets for existing connection', () => {
      const secrets: ConnectionSecrets = { token: 'my-token' }
      mockStorage.set('miao-vision-secrets', JSON.stringify({ 'conn-1': secrets }))

      const result = secretsManager.get('conn-1')
      expect(result).toEqual(secrets)
    })

    it('returns null for non-existent connection', () => {
      const result = secretsManager.get('non-existent')
      expect(result).toBeNull()
    })

    it('returns null when storage is empty', () => {
      const result = secretsManager.get('conn-1')
      expect(result).toBeNull()
    })
  })

  describe('has', () => {
    it('returns true when secrets exist', () => {
      mockStorage.set('miao-vision-secrets', JSON.stringify({ 'conn-1': { token: 'x' } }))

      expect(secretsManager.has('conn-1')).toBe(true)
    })

    it('returns false when secrets do not exist', () => {
      expect(secretsManager.has('conn-1')).toBe(false)
    })

    it('returns false for empty secrets object', () => {
      mockStorage.set('miao-vision-secrets', JSON.stringify({}))

      expect(secretsManager.has('conn-1')).toBe(false)
    })
  })

  describe('remove', () => {
    it('removes secrets for a connection', () => {
      mockStorage.set('miao-vision-secrets', JSON.stringify({
        'conn-1': { token: 'x' },
        'conn-2': { token: 'y' }
      }))

      secretsManager.remove('conn-1')

      const stored = JSON.parse(mockStorage.get('miao-vision-secrets') || '{}')
      expect(stored['conn-1']).toBeUndefined()
      expect(stored['conn-2']).toEqual({ token: 'y' })
    })

    it('does not throw when removing non-existent connection', () => {
      expect(() => secretsManager.remove('non-existent')).not.toThrow()
    })
  })

  describe('clearAll', () => {
    it('removes all secrets', () => {
      mockStorage.set('miao-vision-secrets', JSON.stringify({
        'conn-1': { token: 'x' },
        'conn-2': { token: 'y' }
      }))

      secretsManager.clearAll()

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('miao-vision-secrets')
    })
  })

  describe('error handling', () => {
    it('handles sessionStorage.getItem throwing', () => {
      mockSessionStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Storage access denied')
      })

      // Should not throw, returns null
      const result = secretsManager.get('conn-1')
      expect(result).toBeNull()
    })

    it('handles invalid JSON in storage', () => {
      mockStorage.set('miao-vision-secrets', 'invalid-json')

      // Should not throw, returns null
      const result = secretsManager.get('conn-1')
      expect(result).toBeNull()
    })

    it('handles sessionStorage.setItem throwing', () => {
      mockSessionStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded')
      })

      // Should not throw, just warn
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(() => secretsManager.set('conn-1', { token: 'x' })).not.toThrow()
      consoleSpy.mockRestore()
    })
  })
})
