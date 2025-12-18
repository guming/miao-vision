/**
 * Connector Registry
 *
 * Manages registration and creation of connector instances.
 * Implements plugin pattern for extensibility.
 *
 * @module core/connectors/registry
 */

import type {
  Connector,
  ConnectorType,
  ConnectorDeps,
  ConnectorConfig
} from './types'
import { type Result, ok, err } from './result'
import { type ConnectorError, connectorError } from './errors'

/**
 * Connector factory function type
 */
export type ConnectorFactory = (deps?: ConnectorDeps) => Connector

/**
 * Registry entry
 */
interface RegistryEntry {
  factory: ConnectorFactory
  description: string
}

/**
 * Create error for unknown connector type
 */
function unknownTypeError(type: string): ConnectorError {
  return connectorError(
    'INVALID_CONFIG',
    `Unknown connector type: ${type}. Available types: ${Array.from(registry.keys()).join(', ')}`
  )
}

/**
 * Internal registry storage
 */
const registry = new Map<ConnectorType, RegistryEntry>()

/**
 * Connector Registry
 *
 * Singleton registry for managing connector types.
 *
 * @example
 * ```typescript
 * // Register a connector
 * ConnectorRegistry.register('wasm', createWasmConnector, 'DuckDB-WASM')
 *
 * // Create an instance
 * const result = ConnectorRegistry.create('wasm', { logger: console })
 * if (result.ok) {
 *   await result.value.connect(config)
 * }
 * ```
 */
export const ConnectorRegistry = {
  /**
   * Register a connector factory
   *
   * @param type - Connector type identifier
   * @param factory - Factory function to create connector instances
   * @param description - Human-readable description
   */
  register(
    type: ConnectorType,
    factory: ConnectorFactory,
    description: string = ''
  ): void {
    registry.set(type, { factory, description })
  },

  /**
   * Unregister a connector type
   *
   * @param type - Connector type to remove
   */
  unregister(type: ConnectorType): boolean {
    return registry.delete(type)
  },

  /**
   * Check if a connector type is registered
   *
   * @param type - Connector type to check
   */
  has(type: ConnectorType): boolean {
    return registry.has(type)
  },

  /**
   * Get all registered connector types
   *
   * @returns Array of registered types with descriptions
   */
  list(): Array<{ type: ConnectorType; description: string }> {
    return Array.from(registry.entries()).map(([type, entry]) => ({
      type,
      description: entry.description
    }))
  },

  /**
   * Create a connector instance
   *
   * @param type - Connector type
   * @param deps - Dependencies to inject
   * @returns Connector instance or error
   */
  create(
    type: ConnectorType,
    deps?: ConnectorDeps
  ): Result<Connector, ConnectorError> {
    const entry = registry.get(type)

    if (!entry) {
      return err(unknownTypeError(type))
    }

    try {
      const connector = entry.factory(deps)
      return ok(connector)
    } catch (error) {
      return err(
        connectorError(
          'UNKNOWN',
          `Failed to create connector: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      )
    }
  },

  /**
   * Create and connect a connector
   *
   * Convenience method that creates and connects in one step.
   *
   * @param config - Connector configuration
   * @param deps - Dependencies to inject
   * @returns Connected connector or error
   */
  async createAndConnect(
    config: ConnectorConfig,
    deps?: ConnectorDeps
  ): Promise<Result<Connector, ConnectorError>> {
    const createResult = this.create(config.type, deps)

    if (!createResult.ok) {
      return createResult
    }

    const connector = createResult.value
    const connectResult = await connector.connect(config)

    if (!connectResult.ok) {
      return err(connectResult.error)
    }

    return ok(connector)
  },

  /**
   * Clear all registered connectors
   *
   * Mainly used for testing.
   */
  clear(): void {
    registry.clear()
  }
}
