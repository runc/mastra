import { useState, useEffect, useCallback } from 'react'
import { useConfig, AGENT_PRESETS, applyPreset } from './hooks/useConfig'
import { useAgent } from './hooks/useAgent'
import { useSessions } from './hooks/useSessions'
import { ChatView } from './components/ChatView'
import { SessionList } from './components/SessionList'
import { ThemeToggle } from './components/ThemeToggle'
import { SettingsDialog } from './components/SettingsDialog'
import { useLanguage } from './i18n'
import type { UIMessage } from './hooks/types'

export function App() {
  const { config, setConfig, settings, setSettings, fingerprint } = useConfig()
  const sessions = useSessions()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { t } = useLanguage()

  // Track the active session's messages for passing into useAgent
  const [sessionMessages, setSessionMessages] = useState<UIMessage[]>([])
  const [sessionSwitchKey, setSessionSwitchKey] = useState(0)

  // Auto-create first session and load messages once useSessions is ready
  useEffect(() => {
    if (!sessions.ready) return
    ;(async () => {
      let active = sessions.activeId
      if (!active) {
        active = await sessions.createSession()
      }
      const msgs = await sessions.switchSession(active)
      setSessionMessages(msgs)
      setSessionSwitchKey(k => k + 1)
    })()
  }, [sessions.ready])

  const handleSessionSelect = useCallback(async (id: string) => {
    const msgs = await sessions.switchSession(id)
    setSessionMessages(msgs)
    setSessionSwitchKey(k => k + 1)
  }, [sessions.switchSession])

  const handleNewSession = useCallback(async () => {
    setSessionMessages([])
    await sessions.createSession()
    setSessionSwitchKey(k => k + 1)
  }, [sessions.createSession])

  const handleDeleteSession = useCallback(async (id: string) => {
    await sessions.deleteSession(id)
    setSessionMessages([])
    setSessionSwitchKey(k => k + 1)
  }, [sessions.deleteSession])

  const handleMessagesChange = useCallback((messages: UIMessage[]) => {
    if (!sessions.activeId) return
    // Derive title from first user message
    let title: string | undefined
    const firstUser = messages.find(m => m.role === 'user')
    if (firstUser) {
      title = firstUser.content.slice(0, 50)
    }
    sessions.persistMessages(sessions.activeId, messages, title)
  }, [sessions.activeId, sessions.persistMessages])

  const handleRename = useCallback((id: string, title: string) => {
    sessions.renameSession(id, title)
  }, [sessions.renameSession])

  const mcpConnected = !!config.mcpUrl && false // status is inside ChatPanel
  const currentPreset = AGENT_PRESETS.find(p => p.id === settings.agentPreset)
  const headerTitle = currentPreset
    ? (settings.language === 'zh' ? currentPreset.nameZh : currentPreset.name)
    : settings.agentName

  return (
    <div className="h-dvh flex flex-row bg-(--surface1)">
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        setConfig={setConfig}
        settings={settings}
        setSettings={setSettings}
        isStreaming={false}
      />

      {/* Session sidebar */}
      <SessionList
        sessions={sessions.sessions}
        activeId={sessions.activeId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelect={handleSessionSelect}
        onDelete={handleDeleteSession}
        onNew={handleNewSession}
        onRename={handleRename}
        onSettings={() => setSettingsOpen(true)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 shrink-0 flex items-center gap-3 px-6 border-b border-(--border1) bg-(--surface2) overflow-x-auto">
          <h1 className="text-sm font-semibold text-(--neutral6)">{headerTitle}</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--accent1)/15 text-(--accent1) font-medium">
            {t('app.beta')}
          </span>
          {mcpConnected && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--accent3)/15 text-(--accent3) font-medium">
              {t('app.mcp')}
            </span>
          )}

          {/* Agent preset switcher */}
          <div className="flex items-center gap-1 ml-4">
            {AGENT_PRESETS.map(preset => {
              const isActive = settings.agentPreset === preset.id
              const name = settings.language === 'zh' ? preset.nameZh : preset.name
              return (
                <button
                  key={preset.id}
                  onClick={() => setSettings(applyPreset(preset))}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    isActive
                      ? 'border-(--accent1) bg-(--accent1)/15 text-(--accent1)'
                      : 'border-transparent text-(--neutral3) hover:text-(--neutral5) hover:bg-(--surface4)'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>

          <div className="flex-1" />

          <ThemeToggle />
        </header>

        {/* Chat area — re-mounts on session switch */}
        <ChatPanel
          key={sessionSwitchKey}
          config={config}
          settings={settings}
          fingerprint={fingerprint}
          initialMessages={sessionMessages}
          onMessagesChange={handleMessagesChange}
        />
      </div>
    </div>
  )
}

// Separate component so that `key` remounting properly resets useAgent state
function ChatPanel({
  config,
  settings,
  fingerprint,
  initialMessages,
  onMessagesChange,
}: {
  config: any
  settings: any
  fingerprint: string
  initialMessages: UIMessage[]
  onMessagesChange: (messages: UIMessage[]) => void
}) {
  const { messages, isStreaming, status, sendMessage, abort, clearMessages } = useAgent({
    config,
    settings,
    fingerprint,
    initialMessages,
    onMessagesChange,
  })

  return (
    <main className="flex-1 min-h-0">
      <ChatView
        messages={messages}
        isStreaming={isStreaming}
        status={status}
        model={config.model}
        onSend={sendMessage}
        onAbort={abort}
        onClear={clearMessages}
      />
    </main>
  )
}
