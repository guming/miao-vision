/**
 * AI Module
 *
 * Provides AI-powered features using LLM providers.
 *
 * @module core/ai
 */

// Types
export type {
  LLMProviderType,
  MessageRole,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  LLMProvider,
  ProviderConfig,
  AIContext,
  ChartGenerationRequest,
  ChartGenerationResult
} from './types'

// Providers
export { DeepSeekProvider, createDeepSeekProvider } from './providers/deepseek'

// Services
export { ChartGenerator, createChartGenerator } from './chart-generator'
