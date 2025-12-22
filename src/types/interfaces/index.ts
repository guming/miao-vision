/**
 * Interface Definitions
 *
 * Pure interfaces for dependency injection.
 * These allow core/ to depend on abstractions rather than implementations.
 */

// Chart builder interfaces
export type { IChartBuilder, IInputInitializer } from './chart-builder'

// Store interfaces
export type {
  IInputValue,
  IInputState,
  IInputStore,
  IDatabaseStore,
  ISQLTemplateContext
} from './stores'
