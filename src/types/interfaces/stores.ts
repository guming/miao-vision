/**
 * Store Interfaces
 *
 * Abstracts store dependencies so core/ doesn't depend on app/stores
 */

import type { QueryResult } from '@/types/database'

/**
 * Input value types
 */
export type IInputValue = string | number | boolean | Date | null | string[] | number[]

/**
 * Input state: key-value pairs of input names and their values
 */
export interface IInputState {
  [key: string]: IInputValue
}

/**
 * Interface for input store
 * Subset of the full InputStore that core/ needs
 */
export interface IInputStore {
  /**
   * Subscribe to store changes
   */
  subscribe(fn: (state: IInputState) => void): () => void

  /**
   * Set a single input value
   */
  setValue(name: string, value: IInputValue): void

  /**
   * Get current value of an input
   */
  getValue(name: string): IInputValue

  /**
   * Check if an input has a value
   */
  has(name: string): boolean
}

/**
 * Interface for database store
 * Subset of the full DatabaseStore that core/ needs
 */
export interface IDatabaseStore {
  /**
   * Database state
   */
  readonly state: {
    initialized: boolean
    loading: boolean
    error: string | null
  }

  /**
   * Execute a SQL query
   */
  executeQuery(sql: string): Promise<QueryResult>
}

/**
 * SQL template context using interface types
 */
export interface ISQLTemplateContext {
  inputs: IInputState
  metadata: Record<string, unknown>
}
