/**
 * AI Configuration Store
 *
 * Manages AI provider settings and state using Svelte 5 Runes.
 *
 * @module app/stores/ai-config
 */

import type { LLMProviderType, ProviderConfig } from '@core/ai/types'
import { DeepSeekProvider } from '@core/ai/providers/deepseek'

const AI_CONFIG_STORAGE_KEY = 'miao-vision:ai-config'

/**
 * AI configuration state
 */
interface AIConfigState {
  /** Selected provider */
  provider: LLMProviderType
  /** Provider configurations */
  configs: Record<LLMProviderType, ProviderConfig>
  /** Is AI currently generating */
  isGenerating: boolean
  /** Last error message */
  error: string | null
}

/**
 * Default configuration
 */
const defaultState: AIConfigState = {
  provider: 'deepseek',
  configs: {
    deepseek: {
      apiKey: '',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2048
    },
    openai: {
      apiKey: '',
      baseUrl: 'https://api.openai.com',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2048
    },
    anthropic: {
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-3-haiku-20240307',
      temperature: 0.7,
      maxTokens: 2048
    },
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      temperature: 0.7,
      maxTokens: 2048
    }
  },
  isGenerating: false,
  error: null
}

/**
 * Load saved configuration from localStorage
 */
function loadSavedConfig(): AIConfigState {
  try {
    const saved = localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...defaultState,
        ...parsed,
        configs: {
          ...defaultState.configs,
          ...parsed.configs
        },
        isGenerating: false,
        error: null
      }
    }
  } catch (e) {
    console.warn('Failed to load AI config:', e)
  }
  return defaultState
}

/**
 * Create AI configuration store
 */
function createAIConfigStore() {
  let state = $state<AIConfigState>(loadSavedConfig())

  // Provider instance cache
  let providerInstance: DeepSeekProvider | null = null

  /**
   * Save configuration to localStorage
   */
  function saveConfig() {
    try {
      const toSave = {
        provider: state.provider,
        configs: state.configs
      }
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
      console.warn('Failed to save AI config:', e)
    }
  }

  /**
   * Get the current provider instance
   */
  function getProvider(): DeepSeekProvider {
    const config = state.configs[state.provider]

    if (!providerInstance) {
      providerInstance = new DeepSeekProvider(config)
    } else {
      providerInstance.configure(config)
    }

    return providerInstance
  }

  /**
   * Update provider configuration
   */
  function updateConfig(provider: LLMProviderType, config: Partial<ProviderConfig>) {
    state.configs[provider] = {
      ...state.configs[provider],
      ...config
    }
    saveConfig()

    // Reset provider instance to pick up new config
    if (provider === state.provider) {
      providerInstance = null
    }
  }

  /**
   * Set active provider
   */
  function setProvider(provider: LLMProviderType) {
    state.provider = provider
    providerInstance = null
    saveConfig()
  }

  /**
   * Set API key for current provider
   */
  function setApiKey(apiKey: string) {
    state.configs[state.provider].apiKey = apiKey
    saveConfig()
    providerInstance = null
  }

  /**
   * Check if current provider is configured
   */
  function isConfigured(): boolean {
    const config = state.configs[state.provider]
    // Ollama doesn't need API key
    if (state.provider === 'ollama') {
      return true
    }
    return !!config.apiKey && config.apiKey.length > 0
  }

  /**
   * Set generating state
   */
  function setGenerating(generating: boolean) {
    state.isGenerating = generating
  }

  /**
   * Set error
   */
  function setError(error: string | null) {
    state.error = error
  }

  return {
    get state() {
      return state
    },

    // Provider management
    getProvider,
    setProvider,
    updateConfig,
    setApiKey,
    isConfigured,

    // Generation state
    setGenerating,
    setError,

    // Utilities
    saveConfig
  }
}

/**
 * Global AI configuration store instance
 */
export const aiConfigStore = createAIConfigStore()
