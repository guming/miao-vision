/**
 * Secrets Manager
 *
 * Secure storage for connection secrets (tokens, API keys).
 * Uses sessionStorage for security - secrets are cleared when browser closes.
 *
 * @module core/connectors/secrets
 *
 * @example
 * ```typescript
 * // Store secrets for a connection
 * secretsManager.set('conn-123', { token: 'my-token' })
 *
 * // Retrieve secrets
 * const secrets = secretsManager.get('conn-123')
 *
 * // Clear on disconnect
 * secretsManager.remove('conn-123')
 * ```
 */

/**
 * Secret entry for a connection
 */
export interface ConnectionSecrets {
  /** HTTP Bearer token for remote connections */
  token?: string
  /** MotherDuck API key */
  apiKey?: string
}

/**
 * Storage key for secrets
 */
const STORAGE_KEY = 'miao-vision-secrets'

/**
 * Secrets Manager
 *
 * Manages secure storage of connection secrets.
 * Uses sessionStorage to ensure secrets are cleared when browser closes.
 */
class SecretsManager {
  /**
   * Store secrets for a connection
   *
   * @param connectionId - Connection identifier
   * @param secrets - Secrets to store
   */
  set(connectionId: string, secrets: ConnectionSecrets): void {
    const all = this.getAll()
    all[connectionId] = secrets
    this.saveAll(all)
  }

  /**
   * Get secrets for a connection
   *
   * @param connectionId - Connection identifier
   * @returns Secrets or null if not found
   */
  get(connectionId: string): ConnectionSecrets | null {
    const all = this.getAll()
    return all[connectionId] || null
  }

  /**
   * Check if secrets exist for a connection
   *
   * @param connectionId - Connection identifier
   * @returns True if secrets exist
   */
  has(connectionId: string): boolean {
    const all = this.getAll()
    return connectionId in all
  }

  /**
   * Remove secrets for a connection
   *
   * @param connectionId - Connection identifier
   */
  remove(connectionId: string): void {
    const all = this.getAll()
    delete all[connectionId]
    this.saveAll(all)
  }

  /**
   * Clear all stored secrets
   */
  clearAll(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // sessionStorage not available (SSR or private browsing)
    }
  }

  /**
   * Get all stored secrets
   */
  private getAll(): Record<string, ConnectionSecrets> {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // sessionStorage not available or parse error
    }
    return {}
  }

  /**
   * Save all secrets
   */
  private saveAll(secrets: Record<string, ConnectionSecrets>): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(secrets))
    } catch {
      // sessionStorage not available or quota exceeded
      console.warn('Failed to save secrets to sessionStorage')
    }
  }
}

/**
 * Singleton secrets manager instance
 */
export const secretsManager = new SecretsManager()

/**
 * Create a new secrets manager (for testing)
 */
export function createSecretsManager(): SecretsManager {
  return new SecretsManager()
}
