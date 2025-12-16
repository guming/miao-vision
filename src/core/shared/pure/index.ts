/**
 * Pure Functions Layer
 *
 * This module exports all pure functions for the application.
 * Pure functions have no side effects and always return the same output for the same input.
 *
 * Benefits:
 * - Easy to test in isolation
 * - Easy for AI/LLM to understand
 * - Predictable behavior
 * - Can be memoized if needed
 *
 * @module pure
 *
 * @example
 * import { extractVariables, analyzeDependencies, findAffectedBlocks } from '@/lib/pure'
 *
 * // Extract template variables from SQL
 * const vars = extractVariables('SELECT * FROM ${table} WHERE region = ${inputs.region}')
 * // { inputs: ['region'], metadata: [], blocks: ['table'] }
 *
 * // Analyze block dependencies
 * const analysis = analyzeDependencies(blocks)
 * // { executionOrder: [...], circularDependencies: null, ... }
 *
 * // Find blocks affected by input changes
 * const affected = findAffectedBlocks(blocks, ['region'])
 * // { affectedBlocks: [...], blockDependencies: Map, ... }
 */

// ============================================================================
// Template Utilities
// ============================================================================

export {
  // Types
  type TemplateContext,
  type ExtractedVariables,
  type ValidationResult,
  type InterpolationResult,

  // Patterns (centralized regex)
  PATTERNS,

  // Functions
  hasTemplateVariables,
  hasInputVariables,
  extractVariables,
  validateContext,
  escapeForSQL,
  interpolateSQL,
  resolveBlockReferences,
  interpolateFullSQL
} from './template-utils'

// ============================================================================
// Dependency Analysis
// ============================================================================

export {
  // Types
  type AnalyzableBlock,
  type DependencyNode,
  type DependencyAnalysisResult,
  type BlockReferences,

  // Functions
  extractBlockReferences,
  buildDependencyGraph,
  detectCircularDependencies,
  topologicalSort,
  analyzeDependencies,
  getDependentBlocks,
  getUpstreamBlocks
} from './dependency-analysis'

// ============================================================================
// Block Utilities
// ============================================================================

export {
  // Types
  type BlockWithDependencies,
  type AffectedBlocksResult,
  type InputState,
  type InputChanges,

  // Functions
  compareInputs,
  getChangedInputs,
  extractBlockInputDependencies,
  findAffectedBlocks,
  filterBlocksByType,
  filterBlocksByLanguage,
  groupBlocksByType,
  findBlock,
  hasInputDependencies,
  orderBlocks
} from './block-utils'

// ============================================================================
// Contracts (Type Definitions & Validation)
// ============================================================================

export {
  // Value Types
  type PrimitiveValue,
  type DateValue,
  type ArrayValue,
  type InputValue,
  type MetadataState,

  // Variable Reference Types
  type VariableType,
  type VariableReference,
  VARIABLE_PATTERNS,

  // Block Types
  type BlockType,
  type BlockId,
  type BlockName,
  type Block,
  type BlockDependencies,

  // Template Context (from contracts - canonical version)
  type TemplateContext as ContractTemplateContext,
  type InterpolationResult as ContractInterpolationResult,

  // Dependency Types (from contracts - canonical version)
  type DependencyNode as ContractDependencyNode,
  type DependencyAnalysisResult as ContractDependencyAnalysisResult,

  // Validation
  type ValidationResult as ContractValidationResult,
  VARIABLE_NAME_RULES,
  validateVariableName,
  validateBlockDependencies,
  validateTemplateContext as validateTemplateContextContract,

  // Type Guards
  isInputValue,
  hasTemplateVariables as contractHasTemplateVariables,
  hasInputVariables as contractHasInputVariables,

  // Extraction
  extractAllVariables
} from './contracts'
