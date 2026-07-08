import type { AppSettings } from '../hooks/useConfig'
import { AGENT_PRESETS, applyPreset } from '../hooks/useConfig'
import { useLanguage } from '../i18n'

interface ConfigPanelProps {
  isStreaming: boolean
  onOpenSettings: () => void
  settings: AppSettings
  setSettings: (patch: Partial<AppSettings>) => void
}

export function ConfigPanel({ isStreaming, onOpenSettings, settings, setSettings }: ConfigPanelProps) {
  const { t } = useLanguage()
  return (
    <aside className="w-72 shrink-0 flex flex-col gap-4 p-4 border-r border-(--border1) bg-(--surface2) h-full overflow-y-auto">
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-(--accent1)" />
        <h2 className="text-sm font-semibold text-(--neutral6)">{t('config.heading')}</h2>
      </div>

      {/* Agent preset quick selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-(--neutral3) font-medium">{t('config.agentPreset')}</span>
        <div className="flex flex-col gap-1">
          {AGENT_PRESETS.map(preset => {
            const isActive = settings.agentPreset === preset.id
            const name = settings.language === 'zh' ? preset.nameZh : preset.name
            return (
              <button
                key={preset.id}
                className={`px-3 py-2 text-xs rounded-md border text-left transition-colors disabled:opacity-50 ${
                  isActive
                    ? 'border-(--accent1) bg-(--accent1)/10 text-(--accent1)'
                    : 'border-(--border1) bg-(--surface3) text-(--neutral5) hover:bg-(--surface4)'
                }`}
                disabled={isStreaming}
                onClick={() => {
                  const patch = applyPreset(preset)
                  setSettings(patch)
                }}
              >
                <div className="font-medium">{name}</div>
                <div className="text-[10px] text-(--neutral2) mt-0.5 leading-tight">
                  {settings.language === 'zh' ? preset.descriptionZh : preset.description}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings button */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-(--neutral3) hover:text-(--neutral6) hover:bg-(--surface4) transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.5v1.5M8 13v1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M1.5 8H3M13 8h1.5M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
        </svg>
        {t('config.settings')}
      </button>
    </aside>
  )
}
