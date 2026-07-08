// Explicit LLM provider injection.
//
// Mastra's `@mastra/core/llm/provider-registry` scans node_modules to auto-load
// providers — that is a Node-only path (uses fs + createRequire). In the browser
// we build the provider instance ourselves and hand it to the Agent directly.

import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModelV4 } from '@ai-sdk/provider'

export type ProviderKind = 'openai' | 'anthropic' | 'openai-compatible' | 'deepseek' | 'openrouter'

export interface ResolvedModel {
  model: LanguageModelV4
  kind: ProviderKind
}

export interface ResolveOptions {
  kind: ProviderKind
  apiKey: string
  modelId: string
  baseUrl?: string
}

export function resolveModel(opts: ResolveOptions): ResolvedModel {
  const { kind, apiKey, modelId, baseUrl } = opts
  if (!apiKey) throw new Error('API key is required')

  switch (kind) {
    case 'openai': {
      const openai = createOpenAI({ apiKey, baseURL: baseUrl })
      return { model: openai(modelId), kind }
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey, baseURL: baseUrl })
      return { model: anthropic(modelId), kind }
    }
    case 'openai-compatible': {
      if (!baseUrl) throw new Error('Base URL is required for openai-compatible provider')
      const provider = createOpenAICompatible({ apiKey, baseURL: baseUrl, name: 'openai-compatible' })
      return { model: provider(modelId), kind }
    }
    case 'deepseek': {
      const provider = createOpenAICompatible({ apiKey, baseURL: baseUrl || 'https://api.deepseek.com', name: 'deepseek' })
      return { model: provider(modelId), kind }
    }
    case 'openrouter': {
      const provider = createOpenAICompatible({ apiKey, baseURL: baseUrl || 'https://openrouter.ai/api/v1', name: 'openrouter' })
      return { model: provider(modelId), kind }
    }
    default: {
      const _exhaustive: never = kind
      throw new Error(`Unsupported provider kind: ${String(_exhaustive)}`)
    }
  }
}
