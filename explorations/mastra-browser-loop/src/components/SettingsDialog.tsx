import { useState, type ReactNode } from 'react'
import type { AgentConfig, AppSettings, ProviderKind, Language, AgentPresetId, LLMConfig } from '../hooks/useConfig'
import { ALL_TOOLS, ALL_SKILLS, AGENT_PRESETS, applyPreset } from '../hooks/useConfig'
import { useLanguage } from '../i18n'

type TabId = 'llm' | 'agent' | 'skills' | 'tools' | 'general' | 'about'

const TAB_ICONS: Record<TabId, ReactNode> = {
  llm: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 2.5h5a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1v-2a1 1 0 011-1zM3 9.5h3a1 1 0 011 1v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3a1 1 0 011-1zM10 9.5h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3a1 1 0 011-1z" />
    </svg>
  ),
  agent: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 14v-1.5a4 4 0 017.46-2.12M13 14v-1.5a4 4 0 00-5.54-3.38" />
    </svg>
  ),
  skills: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4.5L8 11 4.5 7.5l-3 3M14.5 4.5H10M14.5 4.5V9" />
    </svg>
  ),
  tools: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5l-6 6a1.5 1.5 0 000 2.12l1.88 1.88a1.5 1.5 0 002.12 0l6-6a1.5 1.5 0 000-2.12l-1.88-1.88a1.5 1.5 0 00-2.12 0zM3 13L2 14" />
      <circle cx="10.5" cy="5.5" r="1" />
    </svg>
  ),
  general: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1.5M8 13v1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M1.5 8H3M13 8h1.5M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
    </svg>
  ),
  about: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.5v3.5M8 5h.01" />
    </svg>
  ),
}

const TABS: { id: TabId; key: string }[] = [
  { id: 'general', key: 'settings.tab.general' },
  { id: 'llm', key: 'settings.tab.llm' },
  { id: 'agent', key: 'settings.tab.agent' },
  { id: 'skills', key: 'settings.tab.skills' },
  { id: 'tools', key: 'settings.tab.tools' },
  { id: 'about', key: 'settings.tab.about' },
]

const PROVIDER_DEFAULTS: Record<ProviderKind, { baseUrl: string; model: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-latest' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openrouter/auto' },
  'openai-compatible': { baseUrl: '', model: '' },
}

const PROVIDER_LABELS: Record<ProviderKind, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  'openai-compatible': 'OpenAI-compatible',
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  config: AgentConfig
  setConfig: (patch: Partial<AgentConfig>) => void
  settings: AppSettings
  setSettings: (patch: Partial<AppSettings>) => void
  isStreaming: boolean
}

type ConnectionTestState =
  | { status: 'idle'; message: string }
  | { status: 'testing'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

function resolveModelId(config: LLMConfig): string {
  return config.model || PROVIDER_DEFAULTS[config.provider].model
}

function resolveBaseUrl(config: LLMConfig): string {
  return (config.baseUrl || PROVIDER_DEFAULTS[config.provider].baseUrl).replace(/\/+$/, '')
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) return response.statusText

  try {
    const json: unknown = JSON.parse(text)
    if (typeof json === 'object' && json && 'error' in json) {
      const error = json.error
      if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message
      if (typeof error === 'string') return error
    }
  } catch {}

  return text.slice(0, 240)
}

async function testLLMConnection(config: LLMConfig): Promise<void> {
  const model = resolveModelId(config)
  const baseUrl = resolveBaseUrl(config)

  if (!config.apiKey.trim()) throw new Error('API key is required')
  if (!model) throw new Error('Model is required')
  if (!baseUrl) throw new Error('Base URL is required')

  if (config.provider === 'anthropic') {
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await readErrorMessage(response)}`)
    return
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1,
      stream: false,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await readErrorMessage(response)}`)
}

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? 'bg-(--accent1)' : 'bg-(--neutral2)'
      }`}
    >
      <span
        className={`inline-block size-3.5 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}

function LLMTab({ config, setConfig, isStreaming }: Pick<SettingsDialogProps, 'config' | 'setConfig' | 'isStreaming'>) {
  const { t } = useLanguage()
  const [connectionTest, setConnectionTest] = useState<ConnectionTestState>({ status: 'idle', message: '' })
  const activeConfig = config.llmConfigs.find(item => item.id === config.activeLlmConfigId) ?? config.llmConfigs[0]
  const defaults = PROVIDER_DEFAULTS[activeConfig.provider]

  const activateConfig = (next: LLMConfig) => {
    setConfig({
      activeLlmConfigId: next.id,
      provider: next.provider,
      apiKey: next.apiKey,
      baseUrl: next.baseUrl,
      model: next.model,
    })
  }

  const updateActiveConfig = (patch: Partial<LLMConfig>) => {
    const nextConfigs = config.llmConfigs.map(item => {
      if (item.id !== activeConfig.id) return item
      return { ...item, ...patch }
    })
    const nextActive = nextConfigs.find(item => item.id === activeConfig.id) ?? activeConfig

    setConfig({
      llmConfigs: nextConfigs,
      provider: nextActive.provider,
      apiKey: nextActive.apiKey,
      baseUrl: nextActive.baseUrl,
      model: nextActive.model,
    })
  }

  const addConfig = () => {
    const provider: ProviderKind = 'openai-compatible'
    const defaults = PROVIDER_DEFAULTS[provider]
    const next: LLMConfig = {
      id: `llm-${Date.now()}`,
      name: `Custom LLM ${config.llmConfigs.length + 1}`,
      provider,
      apiKey: '',
      baseUrl: defaults.baseUrl,
      model: defaults.model,
    }

    setConfig({
      llmConfigs: [...config.llmConfigs, next],
      activeLlmConfigId: next.id,
      provider: next.provider,
      apiKey: next.apiKey,
      baseUrl: next.baseUrl,
      model: next.model,
    })
  }

  const deleteActiveConfig = () => {
    if (config.llmConfigs.length <= 1) return
    const nextConfigs = config.llmConfigs.filter(item => item.id !== activeConfig.id)
    const nextActive = nextConfigs[0]

    setConfig({
      llmConfigs: nextConfigs,
      activeLlmConfigId: nextActive.id,
      provider: nextActive.provider,
      apiKey: nextActive.apiKey,
      baseUrl: nextActive.baseUrl,
      model: nextActive.model,
    })
  }

  const handleProviderChange = (provider: ProviderKind) => {
    const nextDefaults = PROVIDER_DEFAULTS[provider]

    updateActiveConfig({
      provider,
      baseUrl: nextDefaults.baseUrl,
      model: nextDefaults.model,
    })
  }

  const handleTestConnection = async () => {
    setConnectionTest({ status: 'testing', message: t('settings.llm.test.testing') })

    try {
      await testLLMConnection(activeConfig)
      setConnectionTest({ status: 'success', message: t('settings.llm.test.success') })
    } catch (error) {
      setConnectionTest({
        status: 'error',
        message: error instanceof Error ? error.message : t('settings.llm.test.failed'),
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-(--neutral6)">{t('settings.llm.configs')}</h3>
          <p className="mt-1 text-xs text-(--neutral2)">{t('settings.llm.configsHint')}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-(--border1) bg-(--surface3) px-3 py-1.5 text-xs font-medium text-(--neutral4) transition-colors hover:bg-(--surface4) hover:text-(--neutral6) disabled:opacity-50"
          onClick={addConfig}
          disabled={isStreaming}
        >
          {t('settings.llm.add')}
        </button>
      </div>

      <div className="grid grid-cols-[180px_1fr] gap-4">
        <div className="flex flex-col gap-2">
          {config.llmConfigs.map(item => {
            const selected = item.id === activeConfig.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => activateConfig(item)}
                disabled={isStreaming}
                className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                  selected
                    ? 'border-(--accent1) bg-(--accent1)/10'
                    : 'border-(--border1) bg-(--surface3) hover:bg-(--surface4)'
                }`}
              >
                <span className="block truncate text-sm font-medium text-(--neutral6)">{item.name || item.model || PROVIDER_LABELS[item.provider]}</span>
                <span className="mt-1 block truncate text-[11px] text-(--neutral2)">
                  {PROVIDER_LABELS[item.provider]} · {item.model || t('settings.llm.noModel')}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-(--border1) bg-(--surface3) p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-(--neutral3) font-medium">{t('settings.llm.name')}</span>
            <input
              type="text"
              className="h-9 rounded-md border border-(--border1) bg-(--surface2) px-3 text-sm text-(--neutral6) placeholder:text-(--neutral2) focus:outline-hidden focus:ring-2 focus:ring-(--accent1)/30 disabled:opacity-50"
              placeholder="Work OpenAI"
              value={activeConfig.name}
              onChange={e => updateActiveConfig({ name: e.target.value })}
              disabled={isStreaming}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-(--neutral3) font-medium">{t('settings.llm.provider')}</span>
            <select
              className="h-9 rounded-md border border-(--border1) bg-(--surface2) px-3 text-sm text-(--neutral6) focus:outline-hidden focus:ring-2 focus:ring-(--accent1)/30 disabled:opacity-50"
              value={activeConfig.provider}
              onChange={e => handleProviderChange(e.target.value as ProviderKind)}
              disabled={isStreaming}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="deepseek">DeepSeek</option>
              <option value="openrouter">OpenRouter</option>
              <option value="openai-compatible">OpenAI-compatible</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-(--neutral3) font-medium">{t('settings.llm.apiKey')}</span>
            <input
              type="password"
              className="h-9 rounded-md border border-(--border1) bg-(--surface2) px-3 text-sm text-(--neutral6) placeholder:text-(--neutral2) focus:outline-hidden focus:ring-2 focus:ring-(--accent1)/30 disabled:opacity-50"
              placeholder="sk-..."
              value={activeConfig.apiKey}
              onChange={e => updateActiveConfig({ apiKey: e.target.value })}
              disabled={isStreaming}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-(--neutral3) font-medium">{t('settings.llm.baseUrl')}</span>
            <input
              type="text"
              className="h-9 rounded-md border border-(--border1) bg-(--surface2) px-3 text-sm text-(--neutral6) placeholder:text-(--neutral2) focus:outline-hidden focus:ring-2 focus:ring-(--accent1)/30 disabled:opacity-50"
              placeholder={defaults.baseUrl || 'https://api.example.com/v1'}
              value={activeConfig.baseUrl}
              onChange={e => updateActiveConfig({ baseUrl: e.target.value })}
              disabled={isStreaming}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-(--neutral3) font-medium">{t('settings.llm.model')}</span>
            <input
              type="text"
              className="h-9 rounded-md border border-(--border1) bg-(--surface2) px-3 text-sm text-(--neutral6) placeholder:text-(--neutral2) focus:outline-hidden focus:ring-2 focus:ring-(--accent1)/30 disabled:opacity-50"
              placeholder={defaults.model || 'model-id'}
              value={activeConfig.model}
              onChange={e => updateActiveConfig({ model: e.target.value })}
              disabled={isStreaming}
            />
          </label>

          <div className="flex items-center justify-between gap-3 border-t border-(--border1) pt-3">
            <p className="text-[11px] text-(--neutral2)">{t('settings.llm.activeHint')}</p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-(--border1) bg-(--surface2) px-3 py-1.5 text-xs font-medium text-(--neutral4) transition-colors hover:bg-(--surface4) hover:text-(--neutral6) disabled:opacity-40"
                onClick={handleTestConnection}
                disabled={isStreaming || connectionTest.status === 'testing'}
              >
                {connectionTest.status === 'testing' ? t('settings.llm.test.testing') : t('settings.llm.test')}
              </button>
              <button
                type="button"
                className="text-xs text-(--negative1) transition-opacity hover:opacity-80 disabled:opacity-40"
                onClick={deleteActiveConfig}
                disabled={isStreaming || config.llmConfigs.length <= 1}
              >
                {t('settings.llm.delete')}
              </button>
            </div>
          </div>
          {connectionTest.message && (
            <div
              className={`rounded-md border px-3 py-2 text-xs ${
                connectionTest.status === 'success'
                  ? 'border-(--accent1)/40 bg-(--accent1)/10 text-(--accent1)'
                  : connectionTest.status === 'error'
                    ? 'border-(--negative1)/40 bg-(--negative1)/10 text-(--negative1)'
                    : 'border-(--border1) bg-(--surface2) text-(--neutral3)'
              }`}
            >
              {connectionTest.message}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

function SkillsTab({ settings, setSettings, isStreaming }: Pick<SettingsDialogProps, 'settings' | 'setSettings' | 'isStreaming'>) {
  const { t } = useLanguage()
  const toggle = (name: string, enabled: boolean) => {
    setSettings({
      skillsEnabled: enabled
        ? [...settings.skillsEnabled, name]
        : settings.skillsEnabled.filter(s => s !== name),
    })
  }

  const skillInfo: Record<string, { zh: string; en: string }> = {
    'weather-smalltalk': { zh: '天气闲聊 —— 简短友好地回复天气相关话题', en: 'Weather small talk — short, friendly weather responses' },
    'tools-demo': { zh: '工具演示 —— 展示浏览器内置工具的使用', en: 'Tools demo — demonstrate built-in browser tools' },
    'travel-planner': { zh: '旅行规划 —— 结构化旅行规划助手', en: 'Travel planner — structured trip planning assistant' },
    'gzh-design': { zh: '公众号排版 —— 将文章转为公众号 HTML 格式', en: 'GZH Design — format articles into WeChat HTML' },
  }

  return (
    <div className="flex flex-col gap-3">
      {ALL_SKILLS.map(name => {
        const enabled = settings.skillsEnabled.includes(name)
        const info = skillInfo[name]
        return (
          <div key={name} className="flex items-center justify-between py-3 px-3 rounded-md bg-(--surface3)">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm text-(--neutral6) font-medium">{name}</span>
              {info && (
                <span className="text-[11px] text-(--neutral2) leading-tight">
                  {settings.language === 'zh' ? info.zh : info.en}
                </span>
              )}
            </div>
            <Toggle enabled={enabled} onChange={v => toggle(name, v)} disabled={isStreaming} />
          </div>
        )
      })}
      {settings.skillsEnabled.length === 0 && (
        <p className="text-xs text-(--neutral2) text-center py-4">{t('settings.skills.empty')}</p>
      )}
    </div>
  )
}

function ToolsTab({ settings, setSettings, isStreaming }: Pick<SettingsDialogProps, 'settings' | 'setSettings' | 'isStreaming'>) {
  const { t } = useLanguage()
  const toggle = (name: string, enabled: boolean) => {
    setSettings({
      toolsEnabled: enabled
        ? [...settings.toolsEnabled, name]
        : settings.toolsEnabled.filter(s => s !== name),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {ALL_TOOLS.map(name => {
        const enabled = settings.toolsEnabled.includes(name)
        return (
          <div key={name} className="flex items-center justify-between py-2 px-3 rounded-md bg-(--surface3)">
            <span className="text-sm text-(--neutral6) font-mono">{name}</span>
            <Toggle enabled={enabled} onChange={v => toggle(name, v)} disabled={isStreaming} />
          </div>
        )
      })}
      {settings.toolsEnabled.length === 0 && (
        <p className="text-xs text-(--neutral2) text-center py-4">{t('settings.tools.empty')}</p>
      )}
    </div>
  )
}

function AgentTab({ settings, setSettings, isStreaming }: Pick<SettingsDialogProps, 'settings' | 'setSettings' | 'isStreaming'>) {
  const { t } = useLanguage()
  const handlePresetChange = (presetId: AgentPresetId) => {
    if (presetId === 'custom') {
      setSettings({ agentPreset: 'custom' })
      return
    }
    const preset = AGENT_PRESETS.find(p => p.id === presetId)
    if (preset) {
      setSettings(applyPreset(preset))
    }
  }

  const currentPreset = AGENT_PRESETS.find(p => p.id === settings.agentPreset)
  const currentPresetName = currentPreset
    ? (settings.language === 'zh' ? currentPreset.nameZh : currentPreset.name)
    : t('settings.agent.customPreset')

  return (
    <div className="flex flex-col gap-4">
      {/* Agent preset selector */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-(--neutral3) font-medium">{t('settings.agent.preset')}</span>
        <select
          className="h-9 rounded-md border border-(--border1) bg-(--surface3) px-3 text-sm text-(--neutral6) focus:outline-hidden focus:ring-2 focus:ring-(--accent1)/30 disabled:opacity-50"
          value={settings.agentPreset}
          onChange={e => handlePresetChange(e.target.value as AgentPresetId)}
          disabled={isStreaming}
        >
          {AGENT_PRESETS.map(p => (
            <option key={p.id} value={p.id}>
              {settings.language === 'zh' ? p.nameZh : p.name}
            </option>
          ))}
          <option value="custom">{t('settings.agent.customPreset')}</option>
        </select>
        {currentPreset && (
          <p className="text-[11px] text-(--neutral2)">
            {settings.language === 'zh' ? currentPreset.descriptionZh : currentPreset.description}
          </p>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-(--neutral3) font-medium">{t('settings.agent.name')}</span>
        <input
          type="text"
          className="h-9 rounded-md border border-(--border1) bg-(--surface3) px-3 text-sm text-(--neutral6) placeholder:text-(--neutral2) focus:outline-hidden focus:ring-2 focus:ring-(--accent1)/30 disabled:opacity-50"
          placeholder="browser-agent"
          value={settings.agentName}
          onChange={e => setSettings({ agentName: e.target.value, agentPreset: 'custom' })}
          disabled={isStreaming}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-(--neutral3) font-medium">{t('settings.agent.instructions')}</span>
        <p className="text-[11px] text-(--neutral2)">{t('settings.agent.instructionsHint')}</p>
        <textarea
          className="min-h-[200px] rounded-md border border-(--border1) bg-(--surface3) px-3 py-2 text-sm text-(--neutral6) placeholder:text-(--neutral2) focus:outline-hidden focus:ring-2 focus:ring-(--accent1)/30 disabled:opacity-50 resize-y"
          placeholder={t('settings.agent.instructionsPlaceholder')}
          value={settings.instructions}
          onChange={e => setSettings({ instructions: e.target.value, agentPreset: 'custom' })}
          disabled={isStreaming}
        />
      </label>
    </div>
  )
}

function GeneralTab({ settings, setSettings, isStreaming }: Pick<SettingsDialogProps, 'settings' | 'setSettings' | 'isStreaming'>) {
  const { t, setLanguage } = useLanguage()
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    setSettings({ language: lang })
  }
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-(--neutral3) font-medium">{t('settings.general.language')}</span>
        <div className="flex gap-2">
          {(['zh', 'en'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              disabled={isStreaming}
              className={`px-4 py-1.5 text-sm rounded-md border transition-colors disabled:opacity-50 ${
                settings.language === lang
                  ? 'border-(--accent1) bg-(--accent1)/15 text-(--accent1)'
                  : 'border-(--border1) bg-(--surface3) text-(--neutral4) hover:text-(--neutral6)'
              }`}
            >
              {lang === 'zh' ? '中文' : 'English'}
            </button>
          ))}
        </div>
      </label>
    </div>
  )
}

function AboutTab() {
  const { t } = useLanguage()
  const items = [
    { label: t('settings.about.runtime'), value: t('settings.about.runtimeValue') },
    { label: t('settings.about.storage'), value: t('settings.about.storageValue') },
    { label: t('settings.about.scope'), value: t('settings.about.scopeValue') },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-(--border1) bg-(--surface3) p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-(--accent1)">{t('settings.about.badge')}</p>
        <h3 className="mt-2 text-lg font-semibold text-(--neutral6)">{t('settings.about.title')}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-(--neutral3)">{t('settings.about.description')}</p>
      </div>

      <div className="grid gap-3">
        {items.map(item => (
          <div key={item.label} className="rounded-lg border border-(--border1) bg-(--surface3) px-4 py-3">
            <p className="text-xs font-medium text-(--neutral2)">{item.label}</p>
            <p className="mt-1 text-sm text-(--neutral5)">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SettingsDialog({ open, onClose, config, setConfig, settings, setSettings, isStreaming }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const { t } = useLanguage()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-[952px] max-w-[calc(100vw-2rem)] rounded-xl border border-(--border2) bg-(--surface2) shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border1)">
          <h2 className="text-sm font-semibold text-(--neutral6)">{t('settings.title')}</h2>
          <button
            onClick={onClose}
            className="size-7 flex items-center justify-center rounded-md text-(--neutral3) hover:text-(--neutral6) hover:bg-(--surface4) transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Body with vertical tabs */}
        <div className="flex h-[616px] max-h-[calc(100vh-8rem)]">
          {/* Vertical tab sidebar */}
          <div className="w-36 shrink-0 border-r border-(--border1) py-3 flex flex-col gap-0.5 px-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-(--accent1)/15 text-(--accent1)'
                    : 'text-(--neutral3) hover:text-(--neutral5) hover:bg-(--surface4)'
                }`}
              >
                {TAB_ICONS[tab.id]}
                {t(tab.key)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-5 overflow-y-auto">
            {activeTab === 'llm' && <LLMTab config={config} setConfig={setConfig} isStreaming={isStreaming} />}
            {activeTab === 'agent' && <AgentTab settings={settings} setSettings={setSettings} isStreaming={isStreaming} />}
            {activeTab === 'skills' && <SkillsTab settings={settings} setSettings={setSettings} isStreaming={isStreaming} />}
            {activeTab === 'tools' && <ToolsTab settings={settings} setSettings={setSettings} isStreaming={isStreaming} />}
            {activeTab === 'general' && <GeneralTab settings={settings} setSettings={setSettings} isStreaming={isStreaming} />}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-(--border1)">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-(--accent1) text-white font-medium hover:opacity-90 transition-opacity"
          >
            {t('settings.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
