/**
 * AI Module Types
 *
 * Defines interfaces for LLM providers and AI-powered features.
 *
 * @module core/ai/types
 */

/**
 * Supported LLM providers
 */
export type LLMProviderType = 'deepseek' | 'openai' | 'anthropic' | 'ollama'

/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole
  content: string
}

/**
 * LLM completion options
 */
export interface CompletionOptions {
  /** Model identifier */
  model?: string
  /** Temperature (0-2, lower = more deterministic) */
  temperature?: number
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Stop sequences */
  stop?: string[]
  /** Enable streaming response */
  stream?: boolean
}

/**
 * LLM completion response
 */
export interface CompletionResponse {
  /** Generated content */
  content: string
  /** Model used */
  model: string
  /** Token usage */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  /** Finish reason */
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error'
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  /** Partial content */
  content: string
  /** Is this the final chunk */
  done: boolean
}

/**
 * LLM Provider interface
 */
export interface LLMProvider {
  /** Provider name */
  readonly name: LLMProviderType

  /** Check if provider is configured */
  isConfigured(): boolean

  /** Complete a chat conversation */
  complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse>

  /** Stream a chat completion */
  stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown>
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
  /** Default temperature */
  temperature?: number
  /** Default max tokens */
  maxTokens?: number
}

/**
 * AI generation context
 */
export interface AIContext {
  /** Available data sources (SQL query names with results) */
  dataSources: Array<{
    name: string
    columns: Array<{ name: string; type: string }>
    rowCount: number
    sample?: Record<string, unknown>[]
  }>
  /** Current cursor position context */
  cursorContext?: {
    textBefore: string
    textAfter: string
  }
}

/**
 * Chart generation request
 */
export interface ChartGenerationRequest {
  /** User's natural language description */
  prompt: string
  /** Available context */
  context: AIContext
  /** Preferred chart type (optional) */
  chartType?: string
}

/**
 * Chart generation result
 */
export interface ChartGenerationResult {
  success: boolean
  /** Generated chart configuration (YAML string) */
  chartConfig?: string
  /** Chart type used */
  chartType?: string
  /** Explanation of why this chart was chosen */
  explanation?: string
  /** Error message if failed */
  error?: string
}
