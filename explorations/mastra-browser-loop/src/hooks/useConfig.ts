import { useState, useCallback } from 'react'

export type ProviderKind = 'openai' | 'anthropic' | 'openai-compatible' | 'deepseek' | 'openrouter'

export interface LLMConfig {
  id: string
  name: string
  provider: ProviderKind
  apiKey: string
  baseUrl: string
  model: string
}

export interface AgentConfig {
  provider: ProviderKind
  apiKey: string
  baseUrl: string
  model: string
  mcpUrl: string
  activeLlmConfigId: string
  llmConfigs: LLMConfig[]
}

export const ALL_TOOLS = ['browserTime', 'calculator', 'fetchUrl', 'randomNumber', 'webSearch'] as const

export const ALL_SKILLS = ['weather-smalltalk', 'tools-demo', 'travel-planner', 'gzh-design'] as const

export type Language = 'zh' | 'en'

export type AgentPresetId = 'browser-agent' | 'gzh-design' | 'custom'

export interface AgentPreset {
  id: AgentPresetId
  name: string
  nameZh: string
  description: string
  descriptionZh: string
  instructions: string
  skillsEnabled: string[]
  toolsEnabled: string[]
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    id: 'browser-agent',
    name: 'Browser Agent',
    nameZh: '浏览器智能体',
    description: 'General-purpose browser agent with tools and skills',
    descriptionZh: '通用浏览器智能体，可使用工具和技能',
    instructions: '',
    skillsEnabled: [...ALL_SKILLS],
    toolsEnabled: [...ALL_TOOLS],
  },
  {
    id: 'gzh-design',
    name: 'GZH Article Designer',
    nameZh: '公众号文章美化',
    description: 'Format articles into WeChat Official Account HTML with themed styling',
    descriptionZh: '将文章排版为公众号 HTML，支持 6 套主题风格',
    instructions: `你是微信公众号文章排版专家。当用户提供文章内容时，你需要：

1. **理解内容**：阅读用户提供的文章，理解主题、结构和重点
2. **选择主题**：根据文章题材从 6 套主题中选择最合适的（默认摸鱼绿）
3. **排版输出**：按照 gzh-design 技能的要求，生成符合公众号平台规范的 HTML 代码
4. **智能处理**：自动添加章节编号、关键词下划线、引言卡片等

如果用户只是聊天或问问题，正常回复即可。
当用户明确要求排版文章、或发送了长文内容时，使用 gzh-design 技能进行排版。`,
    skillsEnabled: ['gzh-design'],
    toolsEnabled: [],
  },
]

export interface AppSettings {
  toolsEnabled: string[]
  skillsEnabled: string[]
  instructions: string
  language: Language
  agentName: string
  agentPreset: AgentPresetId
}

const STORAGE_KEY = 'mastra-browser-agent:config'
const SETTINGS_KEY = 'mastra-browser-agent:settings'

const DEFAULTS: AgentConfig = {
  provider: 'deepseek',
  apiKey: '',
  baseUrl: '',
  model: 'deepseek-v4-flash',
  mcpUrl: '',
  activeLlmConfigId: 'default-deepseek',
  llmConfigs: [
    {
      id: 'default-deepseek',
      name: 'DeepSeek Flash',
      provider: 'deepseek',
      apiKey: '',
      baseUrl: '',
      model: 'deepseek-v4-flash',
    },
  ],
}

const SETTINGS_DEFAULTS: AppSettings = {
  toolsEnabled: [...ALL_TOOLS],
  skillsEnabled: [...ALL_SKILLS],
  instructions: '',
  language: 'zh',
  agentName: 'browser-agent',
  agentPreset: 'browser-agent',
}

export function getPresetById(id: AgentPresetId): AgentPreset | undefined {
  return AGENT_PRESETS.find(p => p.id === id)
}

export function applyPreset(preset: AgentPreset): Partial<AppSettings> {
  return {
    agentPreset: preset.id,
    agentName: preset.name,
    instructions: preset.instructions,
    skillsEnabled: preset.skillsEnabled,
    toolsEnabled: preset.toolsEnabled,
  }
}

function loadConfig(): AgentConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved: Partial<AgentConfig> = JSON.parse(raw)
      const parsed: AgentConfig = { ...DEFAULTS, ...saved }
      const llmConfigs = Array.isArray(parsed.llmConfigs) && parsed.llmConfigs.length > 0
        ? parsed.llmConfigs
        : [{
            id: parsed.activeLlmConfigId || 'default-deepseek',
            name: parsed.model || 'Default LLM',
            provider: parsed.provider,
            apiKey: parsed.apiKey,
            baseUrl: parsed.baseUrl,
            model: parsed.model,
          }]
      const activeLlmConfigId = llmConfigs.some(config => config.id === parsed.activeLlmConfigId)
        ? parsed.activeLlmConfigId
        : llmConfigs[0].id
      const active = llmConfigs.find(config => config.id === activeLlmConfigId) ?? llmConfigs[0]

      return {
        ...parsed,
        provider: active.provider,
        apiKey: active.apiKey,
        baseUrl: active.baseUrl,
        model: active.model,
        activeLlmConfigId,
        llmConfigs,
      }
    }
  } catch {}
  return { ...DEFAULTS }
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { ...SETTINGS_DEFAULTS }
}

export function useConfig() {
  const [config, setConfigState] = useState<AgentConfig>(loadConfig)
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings)

  const setConfig = useCallback((patch: Partial<AgentConfig>) => {
    setConfigState(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const setSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const fingerprint = `${config.provider}|${config.apiKey}|${config.baseUrl}|${config.model}|${config.mcpUrl}`

  return { config, setConfig, settings, setSettings, fingerprint }
}
